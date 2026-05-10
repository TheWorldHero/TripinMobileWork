"""Generate Tripin app icons + Android mipmap variants.

Run: py apps/mobile/scripts/generate-icons.py

Designs a modern travel-themed icon:
  - Background: dark navy (#101828) matching the splash/brand
  - Foreground: a stylized location pin with the letter "T" inside,
    in a warm orange (#FF7A45) on cream (#FFF8EE) — distinctive on
    most launcher backgrounds and fits the adaptive-icon safe area.
"""

from __future__ import annotations

import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
RES = ROOT / "android" / "app" / "src" / "main" / "res"

BG_COLOR = (16, 24, 40, 255)        # #101828 — dark navy
PIN_BODY = (255, 122, 69, 255)      # #FF7A45 — warm orange
PIN_BODY_DARK = (210, 80, 40, 255)  # #D25028 — orange shadow
INNER_FILL = (255, 248, 238, 255)   # #FFF8EE — cream
TEXT_COLOR = (15, 30, 50, 255)      # #0F1E32 — near-navy ink
SHADOW = (0, 0, 0, 90)


def _try_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    """Pick a bold sans-serif if present; fall back to PIL default."""
    for path in [
        "C:/Windows/Fonts/SegoeUIBold.ttf",
        "C:/Windows/Fonts/seguibl.ttf",
        "C:/Windows/Fonts/segoeuib.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/calibrib.ttf",
        "C:/Windows/Fonts/Arial.ttf",
    ]:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                pass
    return ImageFont.load_default()


def draw_pin(canvas: Image.Image, *, scale: float = 1.0, center: tuple[float, float] | None = None) -> None:
    """Render the pin icon onto canvas."""
    w, h = canvas.size
    cx = center[0] if center else w / 2
    cy = center[1] if center else h * 0.45  # slightly above center; pin tail extends down

    # Pin geometry. Sized so foreground sits well inside the 432dp adaptive safe zone.
    head_radius = 270 * scale
    tail_height = 170 * scale
    inner_radius = head_radius * 0.62

    # Soft drop shadow under the pin tip for depth.
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.ellipse(
        [cx - head_radius * 0.7, cy + tail_height + 20, cx + head_radius * 0.7, cy + tail_height + 80],
        fill=SHADOW,
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=14 * scale))
    canvas.alpha_composite(shadow)

    draw = ImageDraw.Draw(canvas)

    # Pin tail: a triangle that meets the head circle.
    tip = (cx, cy + tail_height)
    left = (cx - head_radius * 0.55, cy + head_radius * 0.35)
    right = (cx + head_radius * 0.55, cy + head_radius * 0.35)
    draw.polygon([left, right, tip], fill=PIN_BODY)

    # Pin head — orange disc.
    draw.ellipse(
        [cx - head_radius, cy - head_radius, cx + head_radius, cy + head_radius],
        fill=PIN_BODY,
    )

    # Subtle bottom shading to give the head dimension.
    shading = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sdr = ImageDraw.Draw(shading)
    sdr.ellipse(
        [cx - head_radius * 0.95, cy - head_radius * 0.4, cx + head_radius * 0.95, cy + head_radius * 1.05],
        fill=PIN_BODY_DARK + (0,) * 0,
    )
    shading = shading.filter(ImageFilter.GaussianBlur(radius=24 * scale))
    # Use multiply-style by alpha-compositing semi-transparent dark layer
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.ellipse(
        [cx - head_radius * 0.95, cy - head_radius * 0.05, cx + head_radius * 0.95, cy + head_radius * 1.05],
        fill=(180, 60, 30, 60),
    )
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=18 * scale))
    canvas.alpha_composite(overlay)

    # Inner cream disc — the negative space that holds the "T".
    draw = ImageDraw.Draw(canvas)
    draw.ellipse(
        [cx - inner_radius, cy - inner_radius, cx + inner_radius, cy + inner_radius],
        fill=INNER_FILL,
    )

    # The "T" mark.
    text = "T"
    font_px = int(inner_radius * 1.55)
    font = _try_font(font_px)
    bbox = font.getbbox(text)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = cx - tw / 2 - bbox[0]
    ty = cy - th / 2 - bbox[1] - inner_radius * 0.06
    draw.text((tx, ty), text, fill=TEXT_COLOR, font=font)


def make_full_icon(size: int) -> Image.Image:
    """The legacy/round icon — pin on the dark navy background, sized to <size>."""
    base = Image.new("RGBA", (1024, 1024), BG_COLOR)
    draw_pin(base, scale=1.0, center=(512, 470))
    if size != 1024:
        base = base.resize((size, size), Image.LANCZOS)
    return base


def make_round_icon(size: int) -> Image.Image:
    """Same as full icon but circular-cropped (matches what Android draws on round-icon launchers)."""
    src = make_full_icon(1024)
    mask = Image.new("L", (1024, 1024), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, 1024, 1024], fill=255)
    out = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    out.paste(src, (0, 0), mask)
    if size != 1024:
        out = out.resize((size, size), Image.LANCZOS)
    return out


def make_adaptive_foreground(size: int) -> Image.Image:
    """Adaptive-icon foreground: pin only, on transparent bg.
    The 1024 source uses ~432px central safe zone (Android may crop the rest)."""
    base = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    # Slightly smaller so the design stays inside the safe zone after Android's mask.
    draw_pin(base, scale=0.78, center=(512, 470))
    if size != 1024:
        base = base.resize((size, size), Image.LANCZOS)
    return base


def write(path: Path, img: Image.Image) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, format="PNG", optimize=True)
    print(f"  wrote {path.relative_to(ROOT)} ({img.size[0]}x{img.size[1]})")


def main() -> None:
    print(f"writing assets to {ASSETS}")
    write(ASSETS / "icon.png", make_full_icon(1024))
    write(ASSETS / "adaptive-icon.png", make_adaptive_foreground(1024))
    write(ASSETS / "splash-icon.png", make_full_icon(1024))
    write(ASSETS / "favicon.png", make_full_icon(96))

    print(f"writing mipmaps to {RES}")
    densities = {
        "mdpi": (48, 108),
        "hdpi": (72, 162),
        "xhdpi": (96, 216),
        "xxhdpi": (144, 324),
        "xxxhdpi": (192, 432),
    }
    for d, (legacy, fg) in densities.items():
        # Existing files have a .webp extension but are actually PNG; we keep that pattern.
        out_dir = RES / f"mipmap-{d}"
        write(out_dir / "ic_launcher.webp", make_full_icon(legacy))
        write(out_dir / "ic_launcher_round.webp", make_round_icon(legacy))
        write(out_dir / "ic_launcher_foreground.webp", make_adaptive_foreground(fg))


if __name__ == "__main__":
    main()
