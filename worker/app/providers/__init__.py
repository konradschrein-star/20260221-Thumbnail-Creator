"""
Provider package — exposes all image generators and a factory function.

Usage:
    from app.providers import get_provider

    generator = get_provider()          # reads IMAGE_PROVIDER env var
    result = await generator.generate(request)

Environment variables:
    IMAGE_PROVIDER  — "gemini" | "leonardo"  (default: "gemini")
    GEMINI_API_KEY  — required for Gemini
    LEONARDO_API_KEY — required for Leonardo
"""

import os
from .base import BaseImageGenerator, GenerationRequest, GenerationResult, ImageStyle
from .leonardo import LeonardoAIGenerator
from .gemini import GeminiImageGenerator

__all__ = [
    "BaseImageGenerator",
    "GenerationRequest",
    "GenerationResult",
    "ImageStyle",
    "LeonardoAIGenerator",
    "GeminiImageGenerator",
    "get_provider",
]


def get_provider() -> BaseImageGenerator:
    """
    Factory — returns the correct generator based on IMAGE_PROVIDER env var.

    IMAGE_PROVIDER=gemini   → GeminiImageGenerator  (default)
    IMAGE_PROVIDER=leonardo → LeonardoAIGenerator
    """
    provider = os.getenv("IMAGE_PROVIDER", "gemini").lower().strip()

    if provider == "leonardo":
        gen = LeonardoAIGenerator()
    else:
        gen = GeminiImageGenerator()

    if not gen.is_configured():
        api_key_name = "GEMINI_API_KEY" if provider != "leonardo" else "LEONARDO_API_KEY"
        raise RuntimeError(
            f"Provider '{gen.provider_name}' is selected but {api_key_name} is not set. "
            f"Set IMAGE_PROVIDER or provide the correct API key."
        )

    return gen
