"""
================================================================================
AI Background Generation - Fal.ai / Qwen-Image API Integration
================================================================================
Stub implementation for AI image generation services.

This module provides:
- Fal.ai API integration for high-quality image generation
- Qwen-Image API as fallback/alternative
- Exponential backoff retry handling for 429 errors
- Response caching for duplicate requests

Note: This is a stub implementation. Replace with actual API integrations.
================================================================================
"""

import hashlib
import logging
import os
from io import BytesIO
from typing import Optional

import requests
from PIL import Image

from app.retry import async_retry_with_backoff, RateLimitError, APIError

logger = logging.getLogger(__name__)

# API Configuration
FAL_AI_API_KEY = os.getenv("FAL_AI_API_KEY")
FAL_AI_ENDPOINT = "https://api.fal.ai/v1/images/generations"

QWEN_API_KEY = os.getenv("QWEN_API_KEY")
QWEN_ENDPOINT = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis"

# Cache for generated images (simple in-memory cache)
_image_cache: dict[str, bytes] = {}


def _generate_cache_key(prompt: str, width: int, height: int, style: str) -> str:
    """Generate cache key for image request."""
    key_data = f"{prompt}:{width}:{height}:{style}"
    return hashlib.sha256(key_data.encode()).hexdigest()


@async_retry_with_backoff(
    max_attempts=5,
    base_delay=2.0,
    max_delay=120.0,
    retry_on_rate_limit=True,
    retry_on_server_error=True,
)
async def generate_ai_background_fal(
    prompt: str,
    width: int = 1280,
    height: int = 720,
    negative_prompt: Optional[str] = None,
    style: str = "photorealistic",
) -> bytes:
    """
    Generate AI background image using Fal.ai API.
    
    Args:
        prompt: Text description of desired image
        width: Image width in pixels
        height: Image height in pixels
        negative_prompt: Things to avoid in generation
        style: Image style preset
        
    Returns:
        Raw PNG image bytes
        
    Raises:
        RateLimitError: If rate limited (429)
        APIError: If server error occurs
    """
    if not FAL_AI_API_KEY:
        logger.warning("FAL_AI_API_KEY not set, using fallback generation")
        return await _generate_fallback_background(prompt, width, height)
    
    # Check cache
    cache_key = _generate_cache_key(prompt, width, height, style)
    if cache_key in _image_cache:
        logger.info("Returning cached image")
        return _image_cache[cache_key]
    
    headers = {
        "Authorization": f"Bearer {FAL_AI_API_KEY}",
        "Content-Type": "application/json",
    }
    
    payload = {
        "prompt": prompt,
        "width": width,
        "height": height,
        "num_images": 1,
        "style": style,
    }
    
    if negative_prompt:
        payload["negative_prompt"] = negative_prompt
    
    logger.info(f"Calling Fal.ai API for image generation: {prompt[:50]}...")
    
    try:
        response = requests.post(
            FAL_AI_ENDPOINT,
            headers=headers,
            json=payload,
            timeout=120,
        )
        response.raise_for_status()
        
        data = response.json()
        
        # Extract image URL from response
        image_url = data.get("images", [{}])[0].get("url")
        if not image_url:
            raise APIError("No image URL in response")
        
        # Download the generated image
        image_response = requests.get(image_url, timeout=60)
        image_response.raise_for_status()
        
        image_bytes = image_response.content
        
        # Cache the result
        _image_cache[cache_key] = image_bytes
        
        logger.info(f"Successfully generated image: {len(image_bytes)} bytes")
        return image_bytes
        
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 429:
            retry_after = e.response.headers.get("Retry-After", "60")
            logger.warning(f"Rate limited by Fal.ai, retry after {retry_after}s")
            raise RateLimitError(f"Fal.ai rate limit: {e}", retry_after=int(retry_after))
        elif e.response.status_code >= 500:
            logger.error(f"Fal.ai server error: {e}")
            raise APIError(f"Fal.ai server error: {e}", status_code=e.response.status_code)
        raise
    except requests.exceptions.RequestException as e:
        logger.error(f"Request failed: {e}")
        raise APIError(f"Request failed: {e}")


@async_retry_with_backoff(
    max_attempts=3,
    base_delay=1.0,
    max_delay=30.0,
    retry_on_rate_limit=True,
    retry_on_server_error=True,
)
async def generate_ai_background_qwen(
    prompt: str,
    width: int = 1280,
    height: int = 720,
    style: str = "photorealistic",
) -> bytes:
    """
    Generate AI background image using Qwen-Image API.
    
    Args:
        prompt: Text description of desired image
        width: Image width in pixels
        height: Image height in pixels
        style: Image style preset
        
    Returns:
        Raw PNG image bytes
    """
    if not QWEN_API_KEY:
        logger.warning("QWEN_API_KEY not set, using fallback generation")
        return await _generate_fallback_background(prompt, width, height)
    
    headers = {
        "Authorization": f"Bearer {QWEN_API_KEY}",
        "Content-Type": "application/json",
    }
    
    payload = {
        "model": "qwen-turbo",
        "input": {
            "prompt": prompt,
        },
        "parameters": {
            "size": f"{width}x{height}",
            "style": style,
        },
    }
    
    logger.info(f"Calling Qwen API for image generation: {prompt[:50]}...")
    
    try:
        response = requests.post(
            QWEN_ENDPOINT,
            headers=headers,
            json=payload,
            timeout=120,
        )
        response.raise_for_status()
        
        data = response.json()
        
        # Qwen returns base64 encoded image
        import base64
        image_b64 = data.get("output", {}).get("results", [{}])[0].get("url", "")
        if image_b64.startswith("data:image"):
            # Extract base64 from data URI
            image_b64 = image_b64.split(",")[1]
        
        image_bytes = base64.b64decode(image_b64)
        
        logger.info(f"Successfully generated image with Qwen: {len(image_bytes)} bytes")
        return image_bytes
        
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 429:
            retry_after = e.response.headers.get("Retry-After", "60")
            raise RateLimitError(f"Qwen rate limit: {e}", retry_after=int(retry_after))
        raise
    except Exception as e:
        logger.error(f"Qwen API error: {e}")
        raise APIError(f"Qwen API error: {e}")


async def generate_ai_background(
    prompt: str,
    width: int = 1280,
    height: int = 720,
    negative_prompt: Optional[str] = None,
    style: str = "photorealistic",
    provider: str = "auto",
) -> bytes:
    """
    Generate AI background image with fallback providers.
    
    Args:
        prompt: Text description of desired image
        width: Image width in pixels
        height: Image height in pixels
        negative_prompt: Things to avoid in generation
        style: Image style preset
        provider: "fal", "qwen", or "auto" (try Fal first, then Qwen)
        
    Returns:
        Raw PNG image bytes
    """
    # Check cache first
    cache_key = _generate_cache_key(prompt, width, height, style)
    if cache_key in _image_cache:
        logger.info("Returning cached image")
        return _image_cache[cache_key]
    
    errors = []
    
    # Try Fal.ai first if auto or explicitly requested
    if provider in ("auto", "fal"):
        try:
            return await generate_ai_background_fal(
                prompt, width, height, negative_prompt, style
            )
        except Exception as e:
            errors.append(f"Fal.ai: {e}")
            if provider == "fal":
                raise
    
    # Try Qwen as fallback
    if provider in ("auto", "qwen"):
        try:
            return await generate_ai_background_qwen(
                prompt, width, height, style
            )
        except Exception as e:
            errors.append(f"Qwen: {e}")
    
    # All providers failed, use fallback
    logger.warning(f"All AI providers failed: {errors}. Using fallback generation.")
    return await _generate_fallback_background(prompt, width, height)


async def _generate_fallback_background(
    prompt: str,
    width: int = 1280,
    height: int = 720,
) -> bytes:
    """
    Generate a fallback background when AI services are unavailable.
    
    Creates a gradient background with placeholder text.
    
    Args:
        prompt: Original prompt (used for color generation)
        width: Image width
        height: Image height
        
    Returns:
        Raw PNG image bytes
    """
    from PIL import Image, ImageDraw
    
    # Generate colors from prompt hash
    prompt_hash = hashlib.md5(prompt.encode()).hexdigest()
    
    # Extract RGB values from hash
    r1 = int(prompt_hash[0:2], 16)
    g1 = int(prompt_hash[2:4], 16)
    b1 = int(prompt_hash[4:6], 16)
    
    r2 = int(prompt_hash[6:8], 16)
    g2 = int(prompt_hash[8:10], 16)
    b2 = int(prompt_hash[10:12], 16)
    
    # Create gradient image
    img = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(img)
    
    # Draw gradient
    for y in range(height):
        ratio = y / height
        r = int(r1 + (r2 - r1) * ratio)
        g = int(g1 + (g2 - g1) * ratio)
        b = int(b1 + (b2 - b1) * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b))
    
    # Save to bytes
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    
    logger.info(f"Generated fallback background: {width}x{height}")
    return buffer.getvalue()


async def download_reference_image(url: str, timeout: int = 3) -> Optional[bytes]:
    """
    Download a reference image with timeout.
    
    Args:
        url: Image URL to download
        timeout: Timeout in seconds (default 3 for fast fallback)
        
    Returns:
        Image bytes or None if download failed
    """
    try:
        response = requests.get(url, timeout=timeout)
        response.raise_for_status()
        
        # Validate it's an image
        content_type = response.headers.get("Content-Type", "")
        if not content_type.startswith("image/"):
            logger.warning(f"Reference URL is not an image: {content_type}")
            return None
        
        logger.info(f"Downloaded reference image: {len(response.content)} bytes")
        return response.content
        
    except requests.exceptions.Timeout:
        logger.warning(f"Reference image download timed out after {timeout}s")
        return None
    except Exception as e:
        logger.warning(f"Failed to download reference image: {e}")
        return None


def clear_image_cache() -> int:
    """
    Clear the in-memory image cache.
    
    Returns:
        Number of items cleared
    """
    global _image_cache
    count = len(_image_cache)
    _image_cache.clear()
    logger.info(f"Cleared {count} items from image cache")
    return count
