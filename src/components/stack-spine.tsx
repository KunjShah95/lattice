import Link from "next/link";
import { BANDS, bandOf, layerColor } from "@/lib/layer";
import { stackLayers } from "@/lib/data";

/**
 * The strata spine — a nine-band rail that shows where a page sits in the
 * stack, surface-first, with the current layer ringed.
 *
 * A breadcrumb answers "how did I get here". This answers "where am I in
 * the system", which is the question a section drawing exists to answer and
 * the one a reader has to guess at on every other directory: a tool page
 * tells you what the tool is, never what it is above or below.
 *
 * Renders as a link strip rather than a chart, so it is navigation and not
 * decoration — every band goes somewhere. Collapses to the current layer's
 * name alone below `sm`, where nine horizontal segments carry no more
 * information than the label already in the page header.
 */
export function StackSpine({ layer }: { layer: number | null }) {
  const ordered = [...stackLayers].sort(
    (a, b) => (b.layer ?? 0) - (a.layer ?? 0),
  );
  const current = ordered.find((c) => c.layer === layer);

  return (
    <nav
      aria-label="Position in the stack"
      className="flex items-center gap-3 sm:gap-4"
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle">
        In the stack
      </span>

      {/* Nine segments. Each is a link; the current one is ringed in the mark
          so the eye finds it without reading any labels. */}
      <ol className="flex flex-1 items-stretch gap-px">
        {ordered.map((category) => {
          const isCurrent = category.layer === layer;
          const band = bandOf(category.layer);
          return (
            <li key={category.slug} className="min-w-0 flex-1">
              <Link
                href={`/${category.slug}`}
                title={`${category.index} — ${category.title}`}
                aria-current={isCurrent ? "true" : undefined}
                className={`flex h-7 items-center justify-center rounded-[2px] transition-opacity hover:opacity-100 ${
                  isCurrent
                    ? "opacity-100 outline outline-1 outline-offset-2 outline-accent"
                    : "opacity-45"
                }`}
              >
                <span
                  aria-hidden="true"
                  className="block h-2.5 w-full max-w-[26px] rounded-[1px]"
                  style={{ backgroundColor: layerColor(category.layer) }}
                />
                <span className="sr-only">
                  {category.index} {category.title}
                  {isCurrent ? " (current)" : ""}
                  {band ? ` — band ${band}` : ""}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      {/* The band label. Three bands is the thing a reader can hold in
          working memory; nine hues is a rainbow. */}
      {current ? (
        <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle sm:inline">
          {BANDS.find((b) => b.id === bandOf(current.layer))?.title} band
        </span>
      ) : null}
    </nav>
  );
}