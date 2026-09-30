import Link from "next/link";
import { layerColor, layerStyle } from "@/lib/layer";
import { maxCategoryCount, offStack, stackLayers } from "@/lib/data";

/**
 * The hero. This is a map of a production AI system, not a pitch: nine
 * bands ordered substrate-first, each sized by how many tools sit in it,
 * each linking to its section. The index below the fold is the legend.
 *
 * Off-stack material is deliberately rendered outside the stack frame —
 * reading material is not a layer, and pretending otherwise is the kind of
 * small dishonesty that makes a directory feel like marketing.
 */
export function StackDiagram() {
  // Surface first: the top of the stack is what you look at.
  const ordered = [...stackLayers].sort((a, b) => (b.layer ?? 0) - (a.layer ?? 0));

  return (
    <div className="relative">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle">
          The stack
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle">
          {stackLayers.length} layers · {offStack.length} off-stack
        </span>
      </div>

      <div
        className="relative rounded-lg border border-border bg-bg-elevated/60 p-1.5"
        role="list"
        aria-label="AI system layers, ordered surface first"
      >
        {ordered.map((category) => {
          const layer = category.layer ?? 0;
          const width = Math.round((category.tools.length / maxCategoryCount) * 100);
          const isCrosscutting = category.role === "crosscutting";

          return (
            <Link
              key={category.slug}
              href={`/${category.slug}`}
              role="listitem"
              className="group relative flex items-center gap-3 overflow-hidden rounded-md px-3 py-3 transition-colors hover:bg-bg-sunken sm:gap-4"
            >
              {/* Full-bleed tint in the layer's own colour. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-[0.07] transition-opacity group-hover:opacity-[0.14]"
                style={layerStyle(layer)}
              />
              {/* The layer's identity rule. Cross-cutting layers are dashed
                  because they span the stack rather than sit in it. */}
              <span
                aria-hidden="true"
                className={`relative h-9 w-[3px] shrink-0 rounded-full ${
                  isCrosscutting ? "opacity-70" : ""
                }`}
                style={{
                  ...layerStyle(layer),
                  ...(isCrosscutting
                    ? {
                        backgroundImage: `repeating-linear-gradient(to bottom, ${layerColor(layer)} 0 3px, transparent 3px 6px)`,
                        backgroundColor: "transparent",
                      }
                    : {}),
                }}
              />

              <span className="relative w-6 shrink-0 font-mono text-[12px] tabular-nums text-fg-subtle">
                {category.index}
              </span>

              <span className="relative min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium">
                  {category.title}
                </span>
                <span className="mt-0.5 block text-pretty text-[12.5px] leading-relaxed text-fg-muted">
                  {category.responsibility}
                </span>
              </span>

              {/* Density meter — width is the tool count, so the shape of
                  the ecosystem is legible before you read a single word. */}
              <span className="relative hidden shrink-0 items-center gap-2 sm:flex">
                <span className="h-[3px] w-16 overflow-hidden rounded-full bg-border sm:w-24">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${width}%`, ...layerStyle(layer) }}
                  />
                </span>
                <span className="w-6 text-right font-mono text-[12px] tabular-nums text-fg-muted">
                  {category.tools.length}
                </span>
              </span>
            </Link>
          );
        })}

        {/* Substrate marker. */}
        <div className="flex items-center gap-2 px-3 pb-1 pt-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle">
            Substrate
          </span>
          <span aria-hidden="true" className="h-px flex-1 bg-border" />
        </div>
      </div>

      {/* Off-stack: visually detached, deliberately not part of the stack. */}
      {offStack.map((category) => (
        <Link
          key={category.slug}
          href={`/${category.slug}`}
          className="group mt-1.5 flex items-center gap-3 rounded-md border border-dashed border-border-strong px-3 py-2.5 transition-colors hover:bg-bg-sunken sm:gap-4"
        >
          <span aria-hidden="true" className="h-9 w-[3px] shrink-0 rounded-full bg-fg-subtle opacity-40" />
          <span className="w-6 shrink-0 font-mono text-[12px] text-fg-subtle">
            {category.index}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-medium text-fg-muted group-hover:text-fg">
              {category.title}
            </span>
            <span className="mt-0.5 block text-pretty text-[12.5px] leading-relaxed text-fg-subtle">
              {category.responsibility}
            </span>
          </span>
          <span className="hidden shrink-0 font-mono text-[12px] tabular-nums text-fg-subtle sm:block">
            {category.tools.length}
          </span>
        </Link>
      ))}
    </div>
  );
}
