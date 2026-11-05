import Link from "next/link";
import { ToolRow } from "./tool-row";
import { ExpandableList } from "./expandable-list";
import { layerStyle } from "@/lib/layer";
import type { Category } from "@/lib/types";

/**
 * A numbered section of the index. Carries the same layer colour as its
 * band in the stack diagram, so the two views read as one object.
 *
 * The section header is a decision, not a caption: an ordinal, a serif title
 * and one sentence saying what the layer is responsible for. The tool list
 * follows with its own rhythm, and on the home page it is collapsed to four
 * rows — a front page should prove a section is worth opening, not pre-load
 * every entry in it.
 */
export function CategorySection({
  category,
  headingLevel = "h2",
  collapsible = false,
  initial = 4,
}: {
  category: Category;
  headingLevel?: "h1" | "h2";
  /** Collapse the list behind a "Show all" control. Used on the home index. */
  collapsible?: boolean;
  initial?: number;
}) {
  const Heading = headingLevel;
  const headingClass = headingLevel === "h1" ? "t-h1" : "t-h3";
  const isCrosscutting = category.role === "crosscutting";
  const isOffStack = category.role === "offstack";

  const rows = category.tools.map((tool) => (
    <ToolRow
      key={tool.slug}
      tool={tool}
      layer={category.layer}
      categorySlug={category.slug}
      showDetails
    />
  ));

  return (
    <section
      id={category.slug}
      className="scroll-mt-24 border-t border-border py-12 first:border-t-0 first:pt-0 sm:py-14"
    >
      <div className="flex gap-4 sm:gap-7">
        {/* Layer rule + ordinal */}
        <div className="flex shrink-0 flex-col items-center gap-3 self-stretch sm:w-12">
          <span
            aria-hidden="true"
            className={`h-12 w-[4px] rounded-full ${isOffStack ? "opacity-30" : ""}`}
            style={layerStyle(category.layer)}
          />
          <span className="font-mono text-[14px] tabular-nums text-fg-subtle sm:text-[16px]">
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
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
            {collapsible ? (
              <Link href={`/${category.slug}`} className="group/head inline-flex items-baseline gap-2">
                <Heading className={`${headingClass} transition-colors group-hover/head:text-accent`}>
                  {category.title}
                </Heading>
                <span
                  aria-hidden="true"
                  className="text-[15px] text-fg-subtle transition-transform duration-200 group-hover/head:translate-x-0.5 group-hover/head:text-accent"
                >
                  →
                </span>
              </Link>
            ) : (
              <Heading className={headingClass}>{category.title}</Heading>
            )}
            {isCrosscutting ? (
              <span className="inline-flex items-center rounded-[var(--r-pill)] border border-border px-2.5 py-0.5 font-mono text-[12px] uppercase tracking-[0.08em] text-fg-muted">
                Cross-cutting
              </span>
            ) : null}
            {isOffStack ? (
              <span className="inline-flex items-center rounded-[var(--r-pill)] border border-border px-2.5 py-0.5 font-mono text-[12px] uppercase tracking-[0.08em] text-fg-muted">
                Off-stack
              </span>
            ) : null}
            <span className="ml-auto font-mono text-[13px] tabular-nums text-fg-subtle">
              {category.tools.length} tools
            </span>
          </div>

          <p className={`measure mt-2 text-[15px] leading-relaxed text-fg-muted ${collapsible ? "line-clamp-2" : ""}`}>
            {category.responsibility}
          </p>

          <div className="mt-5">
            {collapsible ? (
              <ExpandableList initial={initial} label="tools">
                {rows}
              </ExpandableList>
            ) : (
              <ul className="space-y-0.5">{rows}</ul>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}
