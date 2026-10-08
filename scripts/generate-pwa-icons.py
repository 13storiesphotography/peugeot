#!/usr/bin/env python3
"""Regenerate opaque PWA icons + iOS startup images (#071018).

Source mark: public/icon-512.png (must already include the brand glyph).
Splash + apple-touch get a solid #071018 fill so iOS never synthesizes a
white launch screen from transparent corners.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
BG = (7, 16, 24, 255)

SPLASHES = [
    # (px_w, px_h, css_w, css_h, pixel_ratio)
    (640, 1136, 320, 568, 2),
    (750, 1334, 375, 667, 2),
    (828, 1792, 414, 896, 2),
    (1125, 2436, 375, 812, 3),
    (1170, 2532, 390, 844, 3),
    (1179, 2556, 393, 852, 3),
    (1206, 2622, 402, 874, 3),
    (1284, 2778, 428, 926, 3),
    (1290, 2796, 430, 932, 3),
    (1320, 2868, 440, 956, 3),
]


def composite_icon(source: Image.Image, size: int, icon_frac: float = 0.62) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), BG)
    side = max(1, int(size * icon_frac))
    scaled = source.resize((side, side), Image.Resampling.LANCZOS)
    flat = Image.alpha_composite(Image.new("RGBA", scaled.size, BG), scaled)
    canvas.paste(flat, ((size - side) // 2, (size - side) // 2))
    return canvas.convert("RGB")


def main() -> None:
    source_path = PUBLIC / "icon-512.png"
    icon = Image.open(source_path).convert("RGBA")

    composite_icon(icon, 180).save(PUBLIC / "apple-touch-icon.png", "PNG", optimize=True)
    composite_icon(icon, 192).save(PUBLIC / "icon-192.png", "PNG", optimize=True)
    # Keep 512 brand mark, but flatten onto opaque bg for maskable installs.
    composite_icon(icon, 512, icon_frac=1.0).save(
        PUBLIC / "icon-512.png", "PNG", optimize=True
    )

    splash_dir = PUBLIC / "splash"
    splash_dir.mkdir(exist_ok=True)
    mark_src = composite_icon(icon, 512)
    for w, h, _dw, _dh, _ratio in SPLASHES:
        img = Image.new("RGB", (w, h), BG[:3])
        side = max(64, int(min(w, h) * 0.18))
        mark = mark_src.resize((side, side), Image.Resampling.LANCZOS)
        img.paste(mark, ((w - side) // 2, (h - side) // 2))
        out = splash_dir / f"apple-splash-{w}-{h}.png"
        img.save(out, "PNG", optimize=True)
        print(f"wrote {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
