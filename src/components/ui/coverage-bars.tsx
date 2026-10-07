import Link from "next/link";
import { layerColor } from "@/lib/layer";
import type { CoverageRow } from "@/lib/coverage";

/**
 * Entries per layer, as bars in stack order.
 *
 * Borrowed mechanic: the dithered / hatched chart (designeer's Dither Kit,
 * Aceternity's Scales) — a value drawn as *texture* rather than as a flat fill.
 * What it is not borrowed for is the retro look. This site already draws "sits in
 * the stack" as a hatch (`hatch-stack`, the drafting convention in `globals.css`),
 * so a bar in a layer's own colour with that hatch is the stack diagram's own
 * vocabulary applied to a number, and a reader who has seen the home page reads
 * it without a legend.
 *
 * Stack order, not sorted by value. Sorting is the default for a bar chart and it
 * would be wrong here: the order of the layers is the site's argument, and a
 * chart that re-ranked them would be the one place the index ranks something.
 *
 * Server component. No hover, no animation, no JS — the figure is a table of
 * counts with a picture of it, and the counts are the content: they are real text
 * so a screen reader or a crawler gets the numbers and not an image of them.
 */
export function CoverageBars({
  rows,
  className = "",
}: {
  rows: CoverageRow[];
  className?: string;
}) {
  return (
    <ol aria-label="Entries per stack layer" className={`space-y-1.5 ${className}`.trim()}>
      {rows.map((r) => (
        <li key={r.slug} className="grid grid-cols-[7.5rem_1fr_2rem] items-center gap-3 sm:grid-cols-[9.5rem_1fr_2rem]">
          <Link
            href={`/${r.slug}`}
            className="flex min-w-0 items-baseline gap-2 text-[13px] text-fg-muted transition-colors hover:text-fg"
          >
            <span className="font-mono text-[11px] tabular-nums text-fg-subtle">{r.index}</span>
            <span className="truncate">{r.short}</span>
          </Link>
          <span aria-hidden="true" className="flex h-3.5 items-stretch">
            <span
              className="hatch hatch-stack block rounded-[1px] border-l-[3px]"
              style={{
                width: `${Math.max(r.share * 100, 4)}%`,
                color: layerColor(r.layer),
                borderColor: layerColor(r.layer),
                // The hatch alone is 10% ink, which on a short bar reads as
                // nothing. A faint wash under it gives the bar a body.
                backgroundColor: "color-mix(in oklab, currentColor 14%, transparent)",
              }}
            />
          </span>
          <span className="text-right font-mono text-[12px] tabular-nums text-fg">{r.count}</span>
        </li>
      ))}
    </ol>
  );
}
