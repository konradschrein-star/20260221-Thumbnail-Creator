"""
================================================================================
Thumbnail Generation Pipeline
================================================================================
Orchestrates the end-to-end thumbnail generation process:
  1. Parse & validate job data
  2. Generate AI backgrounds in parallel (Leonardo AI via LIFOQueue)
  3. Download reference image (3s timeout)
  4. Composite each variant (Pillow)
  5. Upload to storage (R2 or local)
  6. Update database with results

Entry point for RQ workers.
================================================================================
"""

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Any, Optional

from app.providers import get_provider
from app.providers.base import BaseImageGenerator, GenerationRequest, ImageStyle
from app.compositor import composite_thumbnail, create_variant_prompts
from app.services.database import DatabaseService
from app.services.storage import StorageService, LocalStorageService

logger = logging.getLogger(__name__)

# Configuration from environment
DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/thumbnail_farm",
)
USE_LOCAL_STORAGE: bool = os.getenv("USE_LOCAL_STORAGE", "false").lower() == "true"

# Style mapping for variants (index → ImageStyle)
_VARIANT_STYLES: list[ImageStyle] = [
    ImageStyle.PHOTOREALISTIC,   # Variant 1: photo-real for maximum CTR
    ImageStyle.CINEMATIC,        # Variant 2: dramatic cinematic look
    ImageStyle.DIGITAL_ART,      # Variant 3: illustrated / stylised
]


async def _generate_variant_background(
    generator: BaseImageGenerator,
    prompt: str,
    variant_index: int,
    width: int,
    height: int,
    reference_image_bytes: bytes | None = None,
) -> bytes:
    """
    Generate a single background image for one variant.

    Args:
        generator:     Configured LeonardoAIGenerator instance.
        prompt:        Text prompt for this variant.
        variant_index: 0-based index to pick visual style.
        width:         Target image width in pixels.
        height:        Target image height in pixels.

    Returns:
        Raw image bytes from the Leonardo generation.

    Raises:
        Any LeonardoAPIError / LeonardoTimeoutError on failure.
    """
    style = _VARIANT_STYLES[variant_index % len(_VARIANT_STYLES)]
    metadata: dict = {}
    if reference_image_bytes:
        metadata["reference_image_bytes"] = reference_image_bytes
        logger.info(
            "[QA-REF] Variant %d: injecting reference image (%d bytes) into provider payload",
            variant_index,
            len(reference_image_bytes),
        )
    else:
        logger.info("[QA-REF] Variant %d: no reference image — text-only generation", variant_index)

    request = GenerationRequest(
        prompt=prompt,
        width=width,
        height=height,
        num_images=1,
        style=style,
        metadata=metadata,
    )
    result = await generator.generate(request)
    return result.image_bytes


async def download_reference_image(url: str, timeout: int = 3) -> Optional[bytes]:
    """
    Download a reference image from a URL with a hard timeout.

    Args:
        url:     URL to fetch.
        timeout: Seconds before giving up (default: 3).

    Returns:
        Raw image bytes, or None if download fails.
    """
    import httpx

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=float(timeout))
            response.raise_for_status()
            content_type = response.headers.get("content-type", "")
            if not content_type.startswith("image/"):
                logger.warning("Reference URL is not an image: %s", content_type)
                return None
            logger.info("Downloaded reference image: %d bytes", len(response.content))
            return response.content
    except Exception as exc:
        logger.warning("Failed to download reference image from %s: %s", url, exc)
        return None


async def process_thumbnail_job(job_data: dict[str, Any]) -> dict[str, Any]:
    """
    Process a thumbnail generation job end-to-end.

    Pipeline:
        1. Parse / validate job data
        2. Generate AI backgrounds in parallel (Leonardo AI)
        3. Download reference image (3s timeout, optional)
        4. Composite each variant with Pillow
        5. Upload composited images to storage
        6. Write results to database

    Args:
        job_data: Dict containing job_id, channel_id, video_title,
                  video_description, reference_thumbnail_url, num_variants.

    Returns:
        Dict containing job_id, status, variants list, completed_at.

    Raises:
        RuntimeError: If all background generations or all compositing steps fail.
    """
    job_id: str = job_data["job_id"]
    channel_id: str = job_data["channel_id"]
    video_title: str = job_data["video_title"]
    video_description: str = job_data.get("video_description", "")
    reference_url: Optional[str] = job_data.get("reference_thumbnail_url")
    num_variants: int = job_data.get("num_variants", 3)

    logger.info("Starting pipeline for job %s | title=%.60s", job_id, video_title)

    # Initialise services
    db = DatabaseService(DATABASE_URL)
    await db.connect()
    storage: StorageService | LocalStorageService = (
        LocalStorageService() if USE_LOCAL_STORAGE else StorageService()
    )

    # Select provider dynamically via IMAGE_PROVIDER env var
    generator = get_provider()
    logger.info("[PROVIDER] Using: %s", generator.provider_name)

    try:
        # ── Status: starting ────────────────────────────────────────────────
        await db.update_job_status(
            job_id=job_id,
            status="processing",
            progress=5,
            message="Pipeline started, building prompts…",
        )

        # ── Build per-variant prompts ────────────────────────────────────────
        prompts: list[str] = create_variant_prompts(
            video_title=video_title,
            video_description=video_description,
            num_variants=num_variants,
        )

        # ── Download reference image ─────────────────────────────────────────
        reference_image: Optional[bytes] = None
        if reference_url:
            reference_image = await download_reference_image(reference_url, timeout=3)
            if not reference_image:
                logger.warning("Job %s: reference image unavailable, continuing without it.", job_id)

        # ── Status: generating backgrounds ───────────────────────────────────
        await db.update_job_status(
            job_id=job_id,
            status="processing",
            progress=20,
            message=f"Generating AI backgrounds via {generator.provider_name}…",
        )

        # ── Generate backgrounds in parallel ─────────────────────────────────
        background_tasks = [
            _generate_variant_background(
                generator=generator,
                prompt=prompt,
                variant_index=i,
                width=1280,
                height=720,
                reference_image_bytes=reference_image,  # ← pass reference bytes
            )
            for i, prompt in enumerate(prompts)
        ]

        raw_results = await asyncio.gather(*background_tasks, return_exceptions=True)

        successful_backgrounds: list[bytes] = []
        for i, result in enumerate(raw_results):
            if isinstance(result, Exception):
                logger.error("Variant %d background failed: %s", i + 1, result)
            else:
                successful_backgrounds.append(result)

        if not successful_backgrounds:
            raise RuntimeError("All Leonardo AI background generations failed.")

        # ── Status: compositing ──────────────────────────────────────────────
        await db.update_job_status(
            job_id=job_id,
            status="processing",
            progress=60,
            message="Compositing thumbnails…",
        )

        # ── Composite each variant ───────────────────────────────────────────
        variants: list[dict[str, Any]] = []

        for i, background_bytes in enumerate(successful_backgrounds[:num_variants]):
            variant_id = f"variant-{i + 1}"

            try:
                composited: bytes = await composite_thumbnail(
                    background_bytes=background_bytes,
                    title=video_title,
                    channel_logo_url=None,
                    variant_index=i,
                )

                storage_key = storage.generate_thumbnail_key(
                    job_id=job_id,
                    variant_id=variant_id,
                    extension="png",
                )

                image_url: str = await storage.upload_image(
                    image_data=composited,
                    key=storage_key,
                    content_type="image/png",
                    metadata={
                        "job_id": job_id,
                        "variant_id": variant_id,
                        "channel_id": channel_id,
                        "video_title": video_title,
                    },
                )

                variants.append({
                    "variant_id": variant_id,
                    "image_url": image_url,
                    "storage_key": storage_key,
                    "metadata": {
                        "prompt": prompts[i],
                        "style": _VARIANT_STYLES[i % len(_VARIANT_STYLES)].value,
                        "provider": generator.provider_name,
                    },
                })

                logger.info("Variant %s composited and uploaded: %s", variant_id, image_url)

            except Exception as exc:
                logger.error("Failed to composite variant %s: %s", variant_id, exc)

        if not variants:
            raise RuntimeError("All variant compositing steps failed.")

        # ── Persist results ──────────────────────────────────────────────────
        await db.update_job_variants(job_id, variants)
        await db.update_job_status(
            job_id=job_id,
            status="completed",
            progress=100,
            message=f"{len(variants)} variant(s) ready.",
        )

        logger.info("Job %s completed with %d variant(s).", job_id, len(variants))

        return {
            "job_id": job_id,
            "status": "completed",
            "variants": variants,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as exc:
        logger.exception("Job %s failed: %s", job_id, exc)
        await db.update_job_status(
            job_id=job_id,
            status="failed",
            progress=0,
            message="Job failed — check worker logs.",
            error=str(exc),
        )
        raise

    finally:
        await db.disconnect()


def process_thumbnail_job_sync(job_data: dict[str, Any]) -> dict[str, Any]:
    """
    Synchronous wrapper for `process_thumbnail_job` — required by RQ workers.

    RQ calls task functions synchronously. This wrapper runs the async
    pipeline in a dedicated event loop.

    Args:
        job_data: Dict containing job parameters.

    Returns:
        Dict with job results.
    """
    return asyncio.run(process_thumbnail_job(job_data))
