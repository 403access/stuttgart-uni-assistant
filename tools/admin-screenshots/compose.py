#!/usr/bin/env python3
"""Compose previous/current screenshot pairs into labelled side-by-side JPGs."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

Image.MAX_IMAGE_PIXELS = None

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else "docs/engineering/admin-parity")
PREVIOUS = ROOT / "previous"
CURRENT = ROOT / "current"
OUT = ROOT / "side-by-side"

BG = (244, 247, 251)
INK = (23, 32, 44)
MUTED = (100, 113, 132)
COLUMN_W = 700
GAP = 24
PAD = 24
LABEL_H = 58


def font(size: int):
    for path in (
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial.ttf",
    ):
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default(size=size)


def fit(image: Image.Image) -> Image.Image:
    ratio = COLUMN_W / image.width
    height = max(1, round(image.height * ratio))
    return image.resize((COLUMN_W, height), Image.LANCZOS)


def optimize_png(path: Path) -> None:
    """Quantize UI captures so the checked-in comparison set stays small."""
    image = Image.open(path).convert("RGB")
    image.quantize(colors=256, method=Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG).save(path, optimize=True)


def main() -> int:
    if not PREVIOUS.is_dir():
        print(f"missing {PREVIOUS}", file=sys.stderr)
        return 1
    count = 0
    for before_path in sorted(PREVIOUS.rglob("*.png")):
        rel = before_path.relative_to(PREVIOUS)
        after_path = CURRENT / rel
        if not after_path.is_file():
            print(f"skip (no current): {rel}")
            continue
        optimize_png(before_path)
        optimize_png(after_path)
        before = fit(Image.open(before_path).convert("RGB"))
        after = fit(Image.open(after_path).convert("RGB"))
        height = max(before.height, after.height)
        canvas = Image.new("RGB", (PAD * 2 + COLUMN_W * 2 + GAP, PAD + LABEL_H + height + PAD), BG)
        canvas.paste(before, (PAD, PAD + LABEL_H))
        canvas.paste(after, (PAD + COLUMN_W + GAP, PAD + LABEL_H))
        draw = ImageDraw.Draw(canvas)
        title_font = font(24)
        caption_font = font(15)
        draw.text((PAD, 14), "Previous dashboard (cae1bcb)", font=title_font, fill=INK)
        draw.text((PAD + COLUMN_W + GAP, 14), "Current React admin", font=title_font, fill=INK)
        draw.text((PAD, PAD + LABEL_H - 18), "1440 px capture · scaled for comparison", font=caption_font, fill=MUTED)
        draw.text((PAD + COLUMN_W + GAP, PAD + LABEL_H - 18), "same fixture data", font=caption_font, fill=MUTED)
        target = OUT / rel.with_suffix(".jpg")
        target.parent.mkdir(parents=True, exist_ok=True)
        canvas.save(target, "JPEG", quality=86, optimize=True)
        count += 1
    print(f"composed {count} comparisons into {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
