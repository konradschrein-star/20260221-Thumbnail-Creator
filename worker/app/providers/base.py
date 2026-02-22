"""
================================================================================
Abstract Base Class for AI Image Generators
================================================================================
Defines the interface every image generation provider must implement.
This allows swapping between Leonardo AI, Fal.ai, Qwen, etc. with zero
changes to the pipeline.
================================================================================
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class ImageStyle(str, Enum):
    """Supported image style presets."""
    PHOTOREALISTIC = "PHOTOGRAPHY"
    CINEMATIC = "CINEMATIC"
    DIGITAL_ART = "ILLUSTRATION"
    DYNAMIC = "DYNAMIC"
    ENVIRONMENT = "ENVIRONMENT"


@dataclass
class GenerationRequest:
    """Structured request for image generation."""
    prompt: str
    width: int = 1280
    height: int = 720
    num_images: int = 1
    style: ImageStyle = ImageStyle.DYNAMIC
    negative_prompt: Optional[str] = None
    seed: Optional[int] = None
    metadata: dict = field(default_factory=dict)


@dataclass
class GenerationResult:
    """Structured result from image generation."""
    image_bytes: bytes
    provider: str
    generation_id: str
    image_url: str
    width: int
    height: int
    metadata: dict = field(default_factory=dict)


class BaseImageGenerator(ABC):
    """
    Abstract base class for all AI image generation providers.

    Subclasses must implement `generate()`. The pipeline calls this
    interface exclusively, enabling seamless provider swaps.
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Human-readable name of this provider."""
        ...

    @abstractmethod
    async def generate(self, request: GenerationRequest) -> GenerationResult:
        """
        Generate an image from a prompt.

        Args:
            request: Structured generation parameters.

        Returns:
            GenerationResult with image bytes and metadata.

        Raises:
            RuntimeError: If generation fails after all retries.
        """
        ...

    @abstractmethod
    def is_configured(self) -> bool:
        """Return True if the provider has the required API credentials."""
        ...
