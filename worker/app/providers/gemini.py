"""
================================================================================
Gemini Image Generator Provider
================================================================================
Implements BaseImageGenerator using the Google Gemini API (gemini-2.5-flash-preview-05-20).
Supports reference image injection via the multimodal contents[] array.
Uses the google-genai SDK: pip install google-genai
================================================================================
"""

import io
import logging
import os
import uuid
from typing import Optional

from google import genai
from google.genai import types

from .base import BaseImageGenerator, GenerationRequest, GenerationResult

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Model selection — use the image-capable preview
# ---------------------------------------------------------------------------
_GEMINI_IMAGE_MODEL = os.getenv(
    "GEMINI_IMAGE_MODEL", "gemini-2.0-flash-preview-image-generation"
)


class GeminiAPIError(RuntimeError):
    """Raised when the Gemini API returns an unexpected response."""


class GeminiImageGenerator(BaseImageGenerator):
    """
    Google Gemini image generation provider.

    Uses the multimodal contents[] API so we can inject a reference thumbnail
    alongside the text prompt — the model merges style cues from both.

    Environment variables required:
        GEMINI_API_KEY — auto-loaded by genai.Client()

    Optional:
        GEMINI_IMAGE_MODEL — override the model name (default: gemini-2.0-flash-preview-image-generation)
    """

    def __init__(self) -> None:
        self._api_key: Optional[str] = os.getenv("GEMINI_API_KEY")

    # ------------------------------------------------------------------
    # BaseImageGenerator interface
    # ------------------------------------------------------------------

    @property
    def provider_name(self) -> str:
        return "gemini"

    def is_configured(self) -> bool:
        return bool(self._api_key)

    async def generate(self, request: GenerationRequest) -> GenerationResult:
        """
        Generate an image via Gemini.

        If ``request.metadata["reference_image_bytes"]`` is set (bytes),
        they are passed as a second Part so the model uses it as a visual
        reference for style, layout, and composition.
        """
        if not self.is_configured():
            raise RuntimeError("GEMINI_API_KEY is not set.")

        client = genai.Client(api_key=self._api_key)

        # Build the contents list: always start with the text prompt
        contents: list[types.Part | str] = [request.prompt]

        # Inject reference image if provided
        ref_bytes: Optional[bytes] = request.metadata.get("reference_image_bytes")
        if ref_bytes:
            logger.info(
                "Gemini: injecting reference image (%d bytes)", len(ref_bytes)
            )
            contents.append(
                types.Part.from_bytes(
                    data=ref_bytes,
                    mime_type="image/jpeg",
                )
            )

        logger.info(
            "Gemini: generating image | model=%s prompt_len=%d ref=%s",
            _GEMINI_IMAGE_MODEL,
            len(request.prompt),
            "yes" if ref_bytes else "no",
        )

        try:
            response = client.models.generate_content(
                model=_GEMINI_IMAGE_MODEL,
                contents=contents,
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE", "TEXT"],
                    response_mime_type="image/png",
                ),
            )
        except Exception as exc:
            raise GeminiAPIError(
                f"Gemini API call failed: {exc}"
            ) from exc

        # Extract the image bytes from the first image part
        image_bytes = self._extract_image_bytes(response)
        generation_id = str(uuid.uuid4())

        logger.info(
            "Gemini: generation complete | id=%s size=%d bytes",
            generation_id,
            len(image_bytes),
        )

        return GenerationResult(
            image_bytes=image_bytes,
            provider=self.provider_name,
            generation_id=generation_id,
            image_url="",  # Gemini returns bytes directly, no hosted URL
            width=request.width,
            height=request.height,
            metadata={
                "model": _GEMINI_IMAGE_MODEL,
                "prompt_length": len(request.prompt),
                "had_reference": bool(ref_bytes),
            },
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _extract_image_bytes(self, response: object) -> bytes:
        """Extract raw PNG bytes from the Gemini response."""
        # The response has .candidates[].content.parts[]
        # Each part has either .text or .inline_data.data (bytes)
        try:
            candidates = response.candidates  # type: ignore[attr-defined]
            for candidate in candidates:
                for part in candidate.content.parts:
                    if hasattr(part, "inline_data") and part.inline_data:
                        data = part.inline_data.data
                        # data is already bytes or base64-encoded bytes
                        if isinstance(data, (bytes, bytearray)):
                            return bytes(data)
                        # Fall back: decode base64 string
                        import base64
                        return base64.b64decode(data)
        except Exception as exc:
            raise GeminiAPIError(
                f"Could not extract image bytes from Gemini response: {exc}"
            ) from exc

        raise GeminiAPIError(
            "No image part found in Gemini response. "
            "Ensure the model supports image generation and "
            "response_mime_type='image/png' is set."
        )
