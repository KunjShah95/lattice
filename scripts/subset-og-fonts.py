"""
Subset the three IBM Plex faces the Open Graph card needs.

Satori has a 500 KB per-route bundle ceiling and embedded fonts count against
it. The full static TTFs are ~223 KB (Serif Medium), ~203 KB (Sans SemiBold) and
~174 KB (Mono Medium), so all three unsubsetted sit at ~600 KB before any
markup. Subsetting to Latin drops each to roughly a fifth.

Three faces, which is one more than the obvious minimum:

    IBMPlexSerif-Medium   (500)  title — the site's h1 face
    IBMPlexSans-SemiBold  (600)  subtitle
    IBMPlexMono-Medium    (500)  eyebrow, meta, wordmark, glyph strokes

The serif is worth its ~60 KB. On the live site it is display type for every
h1, and it is the reason the index reads as an engineering document rather than
a SaaS landing page — dropping it from the share card would mean the one piece
of the brand a reader actually sees in a feed is set in the wrong face. Two
sans faces and a mono is what a template uses; a serif title against mono labels
is what a publication uses, and this is closer to the second.

The budget is not actually tight: three subsetted faces come to roughly 180 KB,
leaving ~320 KB of headroom. The earlier two-face version left that headroom
empty while arguing the serif had "no compositional gain", which was the wrong
trade — headroom you never spend is not a saving.

Outputs are written into `assets/og/` and committed. They are build inputs, not
build outputs — regenerate with `python scripts/subset-og-fonts.py <dir>` only
when the upstream release moves.

Getting the sources: Google Fonts serves woff2/woff to every current user agent,
so the CSS API cannot be used to fetch a TTF. They come from the IBM/plex repo
at `packages/plex-<family>/fonts/complete/ttf/`.
"""

from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else None
OUT = ROOT / "assets" / "og"

# The Latin coverage next/font/google's `latin` subset targets, plus the few
# punctuation marks the card actually sets. Anything outside this list is
# dropped on purpose: the OG copy is English, ASCII and a small set of dashes,
# bullets and quotes, and a tool name is the only unbounded input.
UNICODES = (
    list(range(0x0020, 0x007F))  # Basic Latin
    + list(range(0x00A0, 0x0100))  # Latin-1 Supplement — includes U+00B7 ·
    + [0x0131, 0x0152, 0x0153]
    + list(range(0x02BB, 0x02BD))
    + [0x02C6, 0x02DA, 0x02DC]
    + [0x0304, 0x0308, 0x0329]
    + list(range(0x2000, 0x2070))  # General Punctuation — dashes, quotes, ellipsis
    + [0x2074, 0x20AC, 0x2122]
    + list(range(0x2190, 0x2194))  # arrows, used in section subtitles
    + [0x2212, 0x2215]
    + [0xFEFF, 0xFFFD]
)

FACES = [
    ("IBMPlexSerif-Medium.ttf", "IBMPlexSerif-Medium-subset.ttf", 500),
    ("IBMPlexSans-SemiBold.ttf", "IBMPlexSans-SemiBold-subset.ttf", 600),
    ("IBMPlexMono-Medium.ttf", "IBMPlexMono-Medium-subset.ttf", 500),
]

# The ceiling Satori enforces, minus headroom for the JSX and the runtime's own
# default font. Anything above this and the route fails to build rather than
# rendering, so it is worth failing here first with a clearer message.
BUDGET = 500 * 1024


def main() -> int:
    if SRC is None:
        print(__doc__)
        print("\nusage: python scripts/subset-og-fonts.py <dir with the source TTFs>")
        return 2

    OUT.mkdir(parents=True, exist_ok=True)
    total = 0

    for src_name, out_name, _weight in FACES:
        src = SRC / src_name
        if not src.exists():
            print(f"missing source font: {src}")
            return 1

        dest = OUT / out_name
        # --layout-features='*' keeps the features the card relies on. Dropping
        # kern would visibly loosen the title at 74px.
        subprocess.run(
            [
                sys.executable,
                "-m",
                "fontTools.subset",
                str(src),
                f"--unicodes={','.join(f'U+{u:04X}' for u in UNICODES)}",
                "--layout-features=*",
                "--notdef-outline",
                "--recommended-glyphs",
                "--name-IDs=*",
                f"--output-file={dest}",
            ],
            check=True,
        )

        before, after = src.stat().st_size, dest.stat().st_size
        total += after
        print(f"{out_name}: {before:,} -> {after:,} b  ({after / before:.0%})")

    print(f"\ntotal embedded font weight: {total:,} b of {BUDGET:,} b budget")
    if total > BUDGET:
        print("FAIL: fonts alone exceed the Satori bundle ceiling")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())