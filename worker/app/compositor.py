"""
================================================================================
Programmatic Compositing Engine — Python Pillow (PIL)
================================================================================
Deterministic text compositing and image overlay for thumbnail generation.

Design Principles:
  - Deterministic: same inputs → same output, every time
  - Legible:  gradient overlay ensures text is readable on any background
  - Safe-zone aware: never occludes YouTube's timestamp or subscriber count
  - Multi-language ready: wrap_text() uses getbbox() — handles CJK, Arabic, etc.

YouTube Thumbnail Specification:
  - Resolution: 1280×720 px
  - Safe Zone (avoid): bottom-right 200×120 px  (YouTube timestamp)
  - Logo Zone: bottom-left 200×150 px
  - Title area: top-left quadrant with 40 px padding
================================================================================
"""

import io
import logging
import os
from dataclasses import dataclass, field
from typing import Optional

import httpx
from PIL import Image, ImageDraw, ImageFilter, ImageFont

logger = logging.getLogger(__name__)

# =============================================================================
# Constants
# =============================================================================

THUMBNAIL_WIDTH = 1280
THUMBNAIL_HEIGHT = 720

# Safe zones — (x1, y1, x2, y2)
TIMESTAMP_ZONE = (1080, 600, 1280, 720)   # YouTube bottom-right timestamp area
LOGO_ZONE      = (20,   570,  200, 700)   # Bottom-left: reserved for channel logo

# Title text area (top-left quadrant)
TITLE_X       = 40
TITLE_Y       = 40
TITLE_MAX_W   = 800   # px — leaves right side clear for hero imagery
TITLE_MAX_H   = 380   # px — limits to upper portion

# Font sizing
DEFAULT_FONT_SIZE = 72
MIN_FONT_SIZE     = 36
MAX_FONT_SIZE     = 96
LINE_SPACING      = 1.25  # multiplier on pixel line-height

# Shadow
SHADOW_OFFSET = (4, 4)
SHADOW_BLUR   = 6
SHADOW_ALPHA  = 200     # 0-255

# Gradient overlay (semi-transparent dark band behind the text)
GRADIENT_HEIGHT_RATIO = 0.65   # covers top 65 % of image
GRADIENT_START_ALPHA  = 180    # opaque at top
GRADIENT_END_ALPHA    = 0      # fully transparent at bottom

# Primary font fallback chain (Linux → macOS → Windows)
_FONT_PATHS: list[str] = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "C:/Windows/Fonts/arialbd.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]


# =============================================================================
# Dataclasses
# =============================================================================

@dataclass
class TextStyle:
    """Visual configuration for a single text rendering pass."""
    font_size: int = DEFAULT_FONT_SIZE
    font_color: tuple[int, int, int] = field(default_factory=lambda: (255, 255, 255))
    stroke_width: int = 3
    stroke_color: tuple[int, int, int] = field(default_factory=lambda: (0, 0, 0))
    shadow_offset: tuple[int, int] = field(default_factory=lambda: SHADOW_OFFSET)
    shadow_blur: int = SHADOW_BLUR
    line_spacing: float = LINE_SPACING
    max_width: int = TITLE_MAX_W


# Variant style palette (index → TextStyle overrides)
_VARIANT_PALETTES: list[dict] = [
    {"font_color": (255, 255, 255)},                  # Variant 0: Pure white
    {"font_color": (255, 245, 180), "stroke_width": 4},  # Variant 1: Warm gold
    {"font_color": (190, 235, 255), "stroke_width": 4},  # Variant 2: Ice blue
]


# =============================================================================
# Font Management
# =============================================================================

def get_available_font(size: int) -> ImageFont.FreeTypeFont:
    """
    Return the first available TrueType font at `size` px.
    Falls back to Pillow's built-in bitmap font if nothing is found.
    """
    for path in _FONT_PATHS:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception as exc:
                logger.debug("Skipping font %s: %s", path, exc)
    logger.warning("No TrueType font found — using Pillow default. Text quality will be reduced.")
    return ImageFont.load_default()


# =============================================================================
# Text Wrapping
# =============================================================================

def wrap_text(
    text: str,
    font: ImageFont.FreeTypeFont,
    max_width: int,
) -> list[str]:
    """
    Wrap `text` into lines such that each line fits within `max_width` pixels.

    Uses `font.getbbox()` for pixel-accurate measurement — handles CJK,
    Arabic, German compound words, and any Unicode correctly.

    Args:
        text:      The raw title string.
        font:      A loaded Pillow FreeTypeFont.
        max_width: Maximum line width in pixels.

    Returns:
        List of wrapped lines (never empty).
    """
    if not text:
        return [""]

    text = text.strip()

    # Fast path: whole string fits on one line
    bbox = font.getbbox(text)
    if bbox and bbox[2] <= max_width:
        return [text]

    words = text.split()
    lines: list[str] = []
    current_words: list[str] = []

    for word in words:
        candidate = " ".join(current_words + [word])
        bbox = font.getbbox(candidate)

        if bbox and bbox[2] <= max_width:
            current_words.append(word)
        else:
            if current_words:
                lines.append(" ".join(current_words))

            # Check if the word itself overflows (compound German words, URLs, etc.)
            word_bbox = font.getbbox(word)
            if word_bbox and word_bbox[2] > max_width:
                lines.extend(_break_long_word(word, font, max_width))
                current_words = []
            else:
                current_words = [word]

    if current_words:
        lines.append(" ".join(current_words))

    return lines if lines else [text]


def _break_long_word(
    word: str,
    font: ImageFont.FreeTypeFont,
    max_width: int,
) -> list[str]:
    """
    Force-break a single word that exceeds `max_width` character by character.
    """
    segments: list[str] = []
    segment = ""

    for char in word:
        test = segment + char
        bbox = font.getbbox(test)
        if bbox and bbox[2] <= max_width:
            segment = test
        else:
            if segment:
                segments.append(segment)
            segment = char

    if segment:
        segments.append(segment)

    return segments


# =============================================================================
# Gradient Overlay
# =============================================================================

def _build_gradient_overlay(
    width: int,
    height: int,
    cover_ratio: float = GRADIENT_HEIGHT_RATIO,
    start_alpha: int = GRADIENT_START_ALPHA,
    end_alpha: int = GRADIENT_END_ALPHA,
) -> Image.Image:
    """
    Build a top-to-bottom dark gradient overlay (RGBA) to ensure text legibility.

    The overlay covers the top `cover_ratio` fraction of the image, fading
    from `start_alpha` at the top edge to `end_alpha` (transparent) at the
    fade-out point.

    Args:
        width:        Image width.
        height:       Image height.
        cover_ratio:  Fraction of image height the gradient should span.
        start_alpha:  Alpha at the very top (0–255).
        end_alpha:    Alpha at the bottom of the gradient band.

    Returns:
        RGBA image the same size as the thumbnail.
    """
    gradient = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(gradient)

    fade_rows = int(height * cover_ratio)

    for y in range(fade_rows):
        ratio = 1.0 - (y / fade_rows)  # 1.0 at top, 0.0 at fade boundary
        alpha = int(end_alpha + (start_alpha - end_alpha) * ratio)
        draw.line([(0, y), (width - 1, y)], fill=(0, 0, 0, alpha))

    return gradient


# =============================================================================
# Text Layer
# =============================================================================

def _calculate_font_size(
    text: str,
    max_width: int,
    max_height: int,
    max_lines: int = 3,
) -> int:
    """
    Binary-search for the largest font size that fits `text` in the given box.

    Steps down from MAX_FONT_SIZE to MIN_FONT_SIZE in increments of 4.

    Returns:
        An integer font size (always ≥ MIN_FONT_SIZE).
    """
    for size in range(MAX_FONT_SIZE, MIN_FONT_SIZE - 1, -4):
        font = get_available_font(size)
        lines = wrap_text(text, font, max_width)

        if len(lines) > max_lines:
            continue

        # Measure total text block height
        bbox = font.getbbox("Ay")
        px_line_height = (bbox[3] - bbox[1]) if bbox else size
        total_height = len(lines) * px_line_height * LINE_SPACING

        if total_height <= max_height:
            return size

    return MIN_FONT_SIZE


def create_text_layer(
    text: str,
    style: TextStyle,
    image_size: tuple[int, int],
) -> Image.Image:
    """
    Render `text` onto a transparent RGBA layer with drop-shadow and stroke.

    Shadow is rendered to a separate sub-layer and Gaussian-blurred for
    a soft glow effect. Stroke uses Pillow's native `stroke_width` parameter
    (O(1) vs the old O(stroke²) pixel loop).

    Args:
        text:       Title string.
        style:      TextStyle configuration.
        image_size: (width, height) of the destination image.

    Returns:
        RGBA image the same size as `image_size`.
    """
    font = get_available_font(style.font_size)
    lines = wrap_text(text, font, style.max_width)

    # Measure pixel line-height from a representative glyph
    ref_bbox = font.getbbox("Ay")
    px_line_h = int((ref_bbox[3] - ref_bbox[1]) * style.line_spacing) if ref_bbox else int(style.font_size * style.line_spacing)

    # ── Shadow layer ──────────────────────────────────────────────────────────
    shadow_layer = Image.new("RGBA", image_size, (0, 0, 0, 0))
    shadow_draw  = ImageDraw.Draw(shadow_layer)
    sx, sy = TITLE_X + style.shadow_offset[0], TITLE_Y + style.shadow_offset[1]

    for line in lines:
        shadow_draw.text(
            (sx, sy),
            line,
            font=font,
            fill=(0, 0, 0, SHADOW_ALPHA),
        )
        sy += px_line_h

    if style.shadow_blur > 0:
        shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(radius=style.shadow_blur))

    # ── Text layer ────────────────────────────────────────────────────────────
    text_layer = Image.new("RGBA", image_size, (0, 0, 0, 0))
    text_draw  = ImageDraw.Draw(text_layer)
    tx, ty     = TITLE_X, TITLE_Y

    for line in lines:
        # Stroke drawn via Pillow's native parameter (much faster than manual loop)
        if style.stroke_width > 0:
            text_draw.text(
                (tx, ty),
                line,
                font=font,
                fill=(*style.stroke_color, 255),
                stroke_width=style.stroke_width,
                stroke_fill=(*style.stroke_color, 255),
            )

        # Main text
        text_draw.text(
            (tx, ty),
            line,
            font=font,
            fill=(*style.font_color, 255),
        )
        ty += px_line_h

    # Combine shadow + text
    layer = Image.alpha_composite(shadow_layer, text_layer)
    return layer


# =============================================================================
# Logo Handling
# =============================================================================

def download_logo(logo_url: str, timeout: int = 3) -> Optional[Image.Image]:
    """
    Fetch a channel logo from `logo_url` (synchronous, 3-second timeout).

    Returns:
        RGBA PIL Image (max 150×150 px), or None on any failure.
    """
    try:
        response = httpx.get(logo_url, timeout=float(timeout), follow_redirects=True)
        response.raise_for_status()
        img = Image.open(io.BytesIO(response.content))
        img = img.convert("RGBA")
        img.thumbnail((150, 150), Image.Resampling.LANCZOS)
        return img
    except Exception as exc:
        logger.warning("Logo download failed (%s): %s", logo_url, exc)
        return None


def _add_logo(
    image: Image.Image,
    logo: Image.Image,
) -> Image.Image:
    """
    Composite the channel logo into the bottom-left corner of `image`.

    The logo is placed at LOGO_ZONE origin with 20 px padding from the edge.
    It never overlaps the TIMESTAMP_ZONE (bottom-right corner).

    Args:
        image: RGB or RGBA base image.
        logo:  RGBA logo (already resized).

    Returns:
        New Image with the logo pasted using its alpha channel as mask.
    """
    lw, lh = logo.size
    x = 20
    y = THUMBNAIL_HEIGHT - lh - 20

    result = image.copy().convert("RGBA")
    result.paste(logo, (x, y), mask=logo)
    return result


# =============================================================================
# Public Compositing API
# =============================================================================

async def composite_thumbnail(
    background_bytes: bytes,
    title: str,
    channel_logo_url: Optional[str] = None,
    variant_index: int = 0,
) -> bytes:
    """
    Composite a complete YouTube thumbnail.

    Pipeline:
        1. Load background, resize to 1280×720
        2. Apply gradient overlay (dark band for text legibility)
        3. Auto-size font to fit title in the title safe-zone
        4. Render text layer (shadow + native stroke + fill)
        5. Composite gradient → text → base
        6. Paste channel logo (bottom-left, avoids timestamp zone)
        7. Return PNG bytes

    Args:
        background_bytes:  Raw image bytes from the AI generator.
        title:             Video title (any language).
        channel_logo_url:  Optional URL for the channel avatar/logo.
        variant_index:     0, 1, or 2 — selects the colour palette.

    Returns:
        PNG image bytes (1280×720).
    """
    # ── 1. Load & resize background ───────────────────────────────────────────
    background = Image.open(io.BytesIO(background_bytes))

    if background.size != (THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT):
        background = background.resize(
            (THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT),
            Image.Resampling.LANCZOS,
        )

    background = background.convert("RGBA")

    # ── 2. Gradient overlay ───────────────────────────────────────────────────
    overlay = _build_gradient_overlay(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT)
    background = Image.alpha_composite(background, overlay)

    # ── 3. Font sizing ────────────────────────────────────────────────────────
    font_size = _calculate_font_size(
        text=title,
        max_width=TITLE_MAX_W,
        max_height=TITLE_MAX_H,
        max_lines=3,
    )

    # ── 4. Build TextStyle from palette ──────────────────────────────────────
    palette = _VARIANT_PALETTES[variant_index % len(_VARIANT_PALETTES)]
    style = TextStyle(font_size=font_size, **palette)

    # ── 5. Create text layer ──────────────────────────────────────────────────
    text_layer = create_text_layer(title, style, background.size)

    # ── 6. Composite ──────────────────────────────────────────────────────────
    result = Image.alpha_composite(background, text_layer)

    # ── 7. Logo ───────────────────────────────────────────────────────────────
    if channel_logo_url:
        logo = download_logo(channel_logo_url, timeout=3)
        if logo:
            result = _add_logo(result, logo)

    # ── 8. Flatten to RGB (PNG doesn't need alpha; avoids JPEG black fringe) ──
    final = Image.new("RGB", result.size, (0, 0, 0))
    final.paste(result, mask=result.split()[3])   # Use alpha channel as mask

    # ── 9. Encode ─────────────────────────────────────────────────────────────
    output = io.BytesIO()
    final.save(output, format="PNG", optimize=True, compress_level=6)
    output.seek(0)

    image_bytes = output.getvalue()
    logger.info(
        "Composited thumbnail | %d×%d | variant=%d | %d bytes",
        THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, variant_index, len(image_bytes),
    )
    return image_bytes


# =============================================================================
# Prompt Generation
# =============================================================================

def create_variant_prompts(
    video_title: str,
    video_description: Optional[str] = None,
    num_variants: int = 3,
) -> list[str]:
    """
    Generate per-variant Leonardo AI prompts from a video title and description.

    Each prompt is engineered for YouTube CTR — high contrast, dramatic lighting,
    no text or faces so the compositor controls those elements.

    Args:
        video_title:       The video's title.
        video_description: Optional extended description for richer context.
        num_variants:      How many unique prompts to return.

    Returns:
        List of `num_variants` prompt strings.
    """
    context = (video_description or video_title)[:200].strip()

    prompts: list[str] = [
        (
            f"Ultra high-quality YouTube thumbnail background, {context}, "
            "photorealistic, dramatic cinematic lighting, rich saturated colors, "
            "no text, no people, crisp detail, 16:9 widescreen, ultra HD"
        ),
        (
            f"YouTube thumbnail background, {context}, "
            "cinematic wide shot, golden hour lighting, dynamic composition, "
            "professional photography style, vivid colors, no text, no faces"
        ),
        (
            f"Eye-catching YouTube thumbnail background, {context}, "
            "digital art, bold gradient background, neon accents, "
            "modern tech aesthetic, high impact, no text, no people, 4K"
        ),
    ]

    return prompts[:num_variants]


# =============================================================================
# Testing Utility
# =============================================================================

def create_placeholder_thumbnail(
    width: int = THUMBNAIL_WIDTH,
    height: int = THUMBNAIL_HEIGHT,
    text: str = "Test Thumbnail",
) -> bytes:
    """
    Generate a synthetic gradient thumbnail for local unit testing.
    (Does not require AI API access.)

    Returns:
        PNG bytes.
    """
    img = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(img)

    for y in range(height):
        r = int(30  + (y / height) * 70)
        g = int(60  + (y / height) * 40)
        b = int(120 + (y / height) * 80)
        draw.line([(0, y), (width - 1, y)], fill=(r, g, b))

    font = get_available_font(72)
    bbox = font.getbbox(text)
    if bbox:
        tx = (width  - (bbox[2] - bbox[0])) // 2
        ty = (height - (bbox[3] - bbox[1])) // 2
    else:
        tx, ty = width // 4, height // 2

    draw.text((tx + 3, ty + 3), text, font=font, fill=(0, 0, 0))
    draw.text((tx, ty),        text, font=font, fill=(255, 255, 255))

    output = io.BytesIO()
    img.save(output, format="PNG")
    output.seek(0)
    return output.getvalue()
