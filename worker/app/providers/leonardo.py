"""
================================================================================
Leonardo AI Image Generator
================================================================================
Implements the BaseImageGenerator interface against the Leonardo.Ai REST API.

Two-Step Process:
    1. POST /api/rest/v1/generations  → receive generationId
    2. GET  /api/rest/v1/generations/{generationId} → poll until COMPLETE

Retry Strategy:
    Uses tenacity for exponential backoff on both the creation request
    and during the polling phase, with a hard timeout of 5 minutes.

Docs: https://docs.leonardo.ai/docs/getting-started
================================================================================
"""

import asyncio
import logging
import os
from io import BytesIO
from typing import Optional

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    stop_after_delay,
    wait_exponential,
    before_sleep_log,
    RetryError,
)

from .base import BaseImageGenerator, GenerationRequest, GenerationResult

logger = logging.getLogger(__name__)

# Leonardo AI API base URL
_LEONARDO_BASE_URL = "https://cloud.leonardo.ai/api/rest/v1"

# Default model: Leonardo Phoenix (high quality, supports all presetStyles)
# Ref: https://docs.leonardo.ai/docs/phoenix
_DEFAULT_MODEL_ID = "de7d3faf-762f-48e0-b3b7-9d0ac8ed4df0"

# Polling configuration
_POLL_INTERVAL_SECONDS = 3.0
_POLL_TIMEOUT_SECONDS = 300  # 5 minutes max

# 429 / 5xx retry configuration for the generation POST
_RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}


class LeonardoAPIError(Exception):
    """Raised when Leonardo API returns a non-retryable error."""
    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.status_code = status_code


class LeonardoRateLimitError(LeonardoAPIError):
    """Raised on HTTP 429 - triggers tenacity retry."""
    pass


class LeonardoTimeoutError(LeonardoAPIError):
    """Raised when generation polling exceeds the hard timeout."""
    pass


class LeonardoAIGenerator(BaseImageGenerator):
    """
    Production-ready Leonardo AI image generator.

    Usage:
        generator = LeonardoAIGenerator()
        result = await generator.generate(GenerationRequest(
            prompt="Epic mountain at golden hour",
            width=1280,
            height=720,
            style=ImageStyle.CINEMATIC,
        ))
        image_bytes = result.image_bytes

    Environment Variables:
        LEONARDO_API_KEY  - Your Leonardo AI Bearer token (required)
        LEONARDO_MODEL_ID - Override the default model ID (optional)
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_id: Optional[str] = None,
        poll_interval: float = _POLL_INTERVAL_SECONDS,
        poll_timeout: float = _POLL_TIMEOUT_SECONDS,
    ):
        self._api_key = api_key or os.getenv("LEONARDO_API_KEY", "")
        self._model_id = model_id or os.getenv("LEONARDO_MODEL_ID", _DEFAULT_MODEL_ID)
        self._poll_interval = poll_interval
        self._poll_timeout = poll_timeout

    @property
    def provider_name(self) -> str:
        return "leonardo_ai"

    def is_configured(self) -> bool:
        return bool(self._api_key)

    def _get_headers(self) -> dict[str, str]:
        """Return the Authorization headers required by Leonardo API."""
        return {
            "accept": "application/json",
            "content-type": "application/json",
            "authorization": f"Bearer {self._api_key}",
        }

    # ──────────────────────────────────────────────────────────────────────────
    # Step 1: Submit generation
    # ──────────────────────────────────────────────────────────────────────────

    @retry(
        retry=retry_if_exception_type(LeonardoRateLimitError),
        wait=wait_exponential(multiplier=1, min=5, max=60),
        stop=stop_after_attempt(5),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True,
    )
    async def _submit_generation(
        self,
        client: httpx.AsyncClient,
        request: GenerationRequest,
    ) -> str:
        """
        POST a generation request and return the generationId.

        Retries automatically on 429 with exponential backoff.

        Returns:
            generationId string from the Leonardo API response.

        Raises:
            LeonardoRateLimitError: On HTTP 429 (will retry).
            LeonardoAPIError: On unrecoverable API errors.
        """
        payload: dict = {
            "prompt": request.prompt,
            "modelId": self._model_id,
            "width": request.width,
            "height": request.height,
            "num_images": request.num_images,
            "presetStyle": request.style.value,
            "public": False,
            "alchemy": True,
        }

        if request.negative_prompt:
            payload["negative_prompt"] = request.negative_prompt

        if request.seed is not None:
            payload["seed"] = request.seed

        logger.info(
            "Submitting generation to Leonardo AI | prompt=%.60s | %dx%d | style=%s",
            request.prompt,
            request.width,
            request.height,
            request.style.value,
        )

        try:
            response = await client.post(
                f"{_LEONARDO_BASE_URL}/generations",
                headers=self._get_headers(),
                json=payload,
                timeout=30.0,
            )
        except httpx.RequestError as exc:
            raise LeonardoAPIError(f"Network error submitting generation: {exc}") from exc

        if response.status_code == 429:
            retry_after = int(response.headers.get("Retry-After", "10"))
            logger.warning("Leonardo AI rate-limited. Retry-After=%ss", retry_after)
            await asyncio.sleep(retry_after)
            raise LeonardoRateLimitError(
                f"Rate limited (429). Retry-After={retry_after}s",
                status_code=429,
            )

        if response.status_code in _RETRYABLE_STATUS_CODES:
            raise LeonardoAPIError(
                f"Leonardo API server error: HTTP {response.status_code}",
                status_code=response.status_code,
            )

        if not response.is_success:
            raise LeonardoAPIError(
                f"Unexpected HTTP {response.status_code}: {response.text}",
                status_code=response.status_code,
            )

        data = response.json()
        generation_id: Optional[str] = (
            data.get("sdGenerationJob", {}).get("generationId")
        )

        if not generation_id:
            raise LeonardoAPIError(
                f"No generationId in response: {data}",
                status_code=response.status_code,
            )

        logger.info("Leonardo generation submitted | generationId=%s", generation_id)
        return generation_id

    # ──────────────────────────────────────────────────────────────────────────
    # Step 2: Poll for completion
    # ──────────────────────────────────────────────────────────────────────────

    async def _poll_for_result(
        self,
        client: httpx.AsyncClient,
        generation_id: str,
    ) -> list[dict]:
        """
        Poll GET /generations/{generationId} every `poll_interval` seconds
        until status == "COMPLETE", with a hard `poll_timeout` deadline.

        Returns:
            List of generated_images dicts from the Leonardo API response.

        Raises:
            LeonardoTimeoutError: If polling exceeds `poll_timeout`.
            LeonardoAPIError: On unrecoverable API errors.
        """
        url = f"{_LEONARDO_BASE_URL}/generations/{generation_id}"
        deadline = asyncio.get_event_loop().time() + self._poll_timeout
        attempt = 0

        while True:
            now = asyncio.get_event_loop().time()
            if now >= deadline:
                raise LeonardoTimeoutError(
                    f"Generation {generation_id} did not complete within "
                    f"{self._poll_timeout}s.",
                )

            attempt += 1
            logger.debug(
                "Polling generation %s | attempt=%d | elapsed=%.1fs",
                generation_id,
                attempt,
                now - (deadline - self._poll_timeout),
            )

            try:
                response = await client.get(
                    url,
                    headers=self._get_headers(),
                    timeout=20.0,
                )
            except httpx.RequestError as exc:
                logger.warning("Network error polling %s: %s. Retrying...", generation_id, exc)
                await asyncio.sleep(self._poll_interval)
                continue

            if response.status_code == 429:
                logger.warning("Rate-limited while polling %s. Backing off 10s.", generation_id)
                await asyncio.sleep(10)
                continue

            if not response.is_success:
                raise LeonardoAPIError(
                    f"Poll error HTTP {response.status_code}: {response.text}",
                    status_code=response.status_code,
                )

            data = response.json()
            generation_data = data.get("generations_by_pk", {})
            status: str = generation_data.get("status", "PENDING")

            logger.debug("Generation %s status: %s", generation_id, status)

            if status == "COMPLETE":
                images: list[dict] = generation_data.get("generated_images", [])
                if not images:
                    raise LeonardoAPIError(
                        f"Generation {generation_id} COMPLETE but no images returned."
                    )
                logger.info(
                    "Generation %s COMPLETE | %d image(s) returned",
                    generation_id,
                    len(images),
                )
                return images

            if status == "FAILED":
                raise LeonardoAPIError(
                    f"Leonardo generation {generation_id} failed. Response: {data}"
                )

            # Still PENDING or PROCESSING — wait and retry
            await asyncio.sleep(self._poll_interval)

    # ──────────────────────────────────────────────────────────────────────────
    # Step 3: Download image bytes
    # ──────────────────────────────────────────────────────────────────────────

    async def _download_image(
        self,
        client: httpx.AsyncClient,
        image_url: str,
    ) -> bytes:
        """
        Download a generated image from the given URL.

        Returns:
            Raw image bytes (PNG or JPEG as returned by Leonardo).

        Raises:
            LeonardoAPIError: If the download fails.
        """
        try:
            response = await client.get(image_url, timeout=60.0)
            response.raise_for_status()
            return response.content
        except httpx.HTTPStatusError as exc:
            raise LeonardoAPIError(
                f"Failed to download image from {image_url}: HTTP {exc.response.status_code}"
            ) from exc
        except httpx.RequestError as exc:
            raise LeonardoAPIError(
                f"Network error downloading image from {image_url}: {exc}"
            ) from exc

    # ──────────────────────────────────────────────────────────────────────────
    # Public: main generate() method
    # ──────────────────────────────────────────────────────────────────────────

    async def generate(self, request: GenerationRequest) -> GenerationResult:
        """
        Full two-step Leonardo AI generation flow:
            1. Submit generation → receive generationId
            2. Poll until COMPLETE → download first image

        Args:
            request: Structured generation parameters.

        Returns:
            GenerationResult with image_bytes and all metadata.

        Raises:
            LeonardoAPIError: On API or download failures.
            LeonardoTimeoutError: If generation exceeds the polling timeout.
            RuntimeError: If the API key is not configured.
        """
        if not self.is_configured():
            raise RuntimeError(
                "LEONARDO_API_KEY is not set. "
                "Add it to your .env file and restart the worker."
            )

        # Use a shared async HTTP client for connection pooling
        async with httpx.AsyncClient() as client:
            # Step 1 – Submit
            generation_id = await self._submit_generation(client, request)

            # Step 2 – Poll
            images = await self._poll_for_result(client, generation_id)

            # Pick the first image
            first_image = images[0]
            image_url: str = first_image.get("url", "")

            if not image_url:
                raise LeonardoAPIError(
                    f"No URL in generated image data: {first_image}"
                )

            # Step 3 – Download
            image_bytes = await self._download_image(client, image_url)

        logger.info(
            "LeonardoAIGenerator complete | generationId=%s | size=%d bytes",
            generation_id,
            len(image_bytes),
        )

        return GenerationResult(
            image_bytes=image_bytes,
            provider=self.provider_name,
            generation_id=generation_id,
            image_url=image_url,
            width=request.width,
            height=request.height,
            metadata={
                "model_id": self._model_id,
                "style": request.style.value,
                "prompt": request.prompt,
            },
        )
