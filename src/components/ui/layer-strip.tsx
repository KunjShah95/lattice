import { layerColor } from "@/lib/layer";

export type LayerCell = {
  slug: string;
  index: string;
  short: string;
  layer: number;
  /** The tool picked for this layer, or null when the stack has none here. */
  pick: string | null;
};

/**
 * The nine stack layers as a strip, showing which ones a recommended stack fills.
 *
 * The home page draws the stack as a section elevation; this is the same drawing
 * compressed to one row, so a reader sees the *shape* of their stack — which layers
 * it occupies and which it leaves empty — before reading any of the picks.
 *
 * Filled layers carry the layer colour and the stack hatch (`hatch-stack`, the
 * drafting convention for "sits in the stack"). Empty layers are dashed outlines,
 * not greyed blocks: a layer with no pick is not an error. A chatbot has no use for
 * fine-tuning, and drawing the gap as a failure would be a false claim about the
 * workload, so an empty layer reads as an empty slot rather than a missing one.
 *
 * Stack order, left to right, substrate first — the order is the site's argument.
 * Server-safe and stateless: it takes finished cells, so it imports only the colour
 * helper and nothing about the dataset.
 */
export function LayerStrip({ cells }: { cells: LayerCell[] }) {
  const filled = cells.filter((c) => c.pick).length;

  return (
    <figure>
      <ol
        aria-label="Stack layers, substrate first"
        className="grid grid-cols-9 gap-1"
      >
        {cells.map((c) => (
          <li key={c.slug} className="min-w-0">
            <span
              aria-hidden="true"
              className={`block h-7 rounded-[2px] ${
                c.pick ? "hatch hatch-stack border-l-[3px]" : "border border-dashed border-border-strong"
              }`}
              style={
                c.pick
                  ? {
                      color: layerColor(c.layer),
                      borderColor: layerColor(c.layer),
                      backgroundColor: "color-mix(in oklab, currentColor 16%, transparent)",
                    }
                  : undefined
              }
            />
            <span className="mt-1 block truncate font-mono text-[10px] tabular-nums text-fg-subtle">
              {c.index}
            </span>
            {/* The full name and the pick, for anyone who cannot see the colour. */}
            <span className="sr-only">
              {c.short}: {c.pick ?? "no pick in this stack"}
            </span>
          </li>
        ))}
      </ol>
      <figcaption className="mt-2 text-[12px] leading-relaxed text-fg-subtle">
        {filled} of {cells.length} layers filled. A dashed layer is one this
        workload does not call for, not one that is missing.
      </figcaption>
    </figure>
  );
}
