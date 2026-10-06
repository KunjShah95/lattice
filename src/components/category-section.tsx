import { ToolRow } from "./tool-row";
import { layerStyle } from "@/lib/layer";
import type { Category } from "@/lib/types";

/**
 * A numbered section of the index. Carries the same layer colour as its
 * band in the stack diagram, so the two views read as one object.
 */
export function CategorySection({
  category,
  headingLevel = "h2",
}: {
  category: Category;
  headingLevel?: "h1" | "h2";
}) {
  const Heading = headingLevel;
  const isCrosscutting = category.role === "crosscutting";
  const isOffStack = category.role === "offstack";

  return (
    <section
      id={category.slug}
      className="scroll-mt-24 border-t border-border py-12 first:border-t-0 first:pt-0"
    >
      <div className="flex gap-4 sm:gap-6">
        {/* Layer rule + ordinal */}
        <div className="flex shrink-0 flex-col items-center gap-3 self-stretch sm:w-12">
          <span
            aria-hidden="true"
            className={`h-10 w-[3px] rounded-full ${isOffStack ? "opacity-30" : ""}`}
            style={layerStyle(category.layer)}
          />
          <span className="font-mono text-[13px] tabular-nums text-fg-subtle sm:text-[15px]">
            {category.index}
          </span>
          {/* A dimension line runs from the ordinal down the length of the
              section, so the tools below read as hanging off their layer. */}
          <span
            aria-hidden="true"
            className="hidden w-px flex-1 bg-gradient-to-b from-border-strong to-transparent sm:block"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <Heading className="text-balance font-serif text-[22px] font-medium tracking-[-0.01em] sm:text-[25px]">
              {category.title}
            </Heading>
            {isCrosscutting ? (
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
                Cross-cutting
              </span>
            ) : null}
            {isOffStack ? (
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
                Off-stack
              </span>
            ) : null}
          </div>

          <p className="mt-1.5 max-w-[52ch] text-pretty text-[14px] leading-relaxed text-fg-muted">
            {category.responsibility}
          </p>

          <ul className="mt-6 space-y-0.5">
            {category.tools.map((tool) => (
              <ToolRow
                key={tool.slug}
                tool={tool}
                layer={category.layer}
                categorySlug={category.slug}
                showDetails
              />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
