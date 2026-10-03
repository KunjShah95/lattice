"""Check every generated card for content that clips or overflows.

The card is 1200x630 padded `54px 64px 50px` in og.tsx, so ink should never
appear inside that box. Satori silently clips whatever exceeds the frame, which
means an overflowing title does not throw — it just disappears, and the only
symptom is a card that looks slightly wrong in a timeline. Measuring the ink
bounding box is the only way to catch it across 235 images without opening each
one.

The four padding numbers are the same literals as `padding` on OgCard. They are
duplicated rather than shared because this is Python and that is TSX — and a
card edited without updating this file fails here, which is the behaviour worth
having.

Usage: python scripts/check-og-bounds.py <dir of PNGs>
"""

import sys
from pathlib import Path

from PIL import Image

# Anything brighter than this counts as ink. The darkest card background is
# #08080a; the grid lines sit around #1a1a1c, so the threshold has to clear
# them without catching text antialiasing's faintest fringe.
INK = 0x2A
PAD_TOP, PAD_RIGHT, PAD_BOTTOM, PAD_LEFT = 54, 64, 50, 64
# Antialiasing puts a one-pixel halo outside a glyph's advance box. Tolerate it
# so the check reports real overflow rather than a rendering artefact.
TOLERANCE = 2


def main() -> int:
    root = Path(sys.argv[1])
    files = sorted(root.glob("*.png"))
    if not files:
        print(f"no PNGs in {root}")
        return 1

    problems = []
    for f in files:
        im = Image.open(f).convert("L")
        w, h = im.size
        if (w, h) != (1200, 630):
            problems.append((f.name, f"wrong size {w}x{h}"))
            continue

        # Bounding box of everything above the ink threshold.
        mask = im.point(lambda v: 255 if v > INK else 0)
        box = mask.getbbox()
        if box is None:
            problems.append((f.name, "blank"))
            continue
        left, top, right, bottom = box

        if left < PAD_LEFT - TOLERANCE:
            problems.append((f.name, f"ink at x={left}, inside left padding"))
        if right > w - PAD_RIGHT + TOLERANCE:
            problems.append((f.name, f"ink to x={right - 1}, inside right padding"))
        if top < PAD_TOP - TOLERANCE:
            problems.append((f.name, f"ink at y={top}, inside top padding"))
        if bottom > h - PAD_BOTTOM + TOLERANCE:
            problems.append((f.name, f"ink to y={bottom - 1}, inside bottom padding"))

    print(f"checked {len(files)} cards at {w}x{h}")
    print(
        f"content box: x {PAD_LEFT}..{w - PAD_RIGHT}, "
        f"y {PAD_TOP}..{h - PAD_BOTTOM}"
    )

    if problems:
        print(f"\n{len(problems)} problem(s):")
        for name, msg in problems:
            print(f"  {name} — {msg}")
        return 1

    print("\nall cards respect the padding box; nothing clipped")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())