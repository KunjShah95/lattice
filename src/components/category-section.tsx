import { ToolRow } from "./tool-row";
import { ToolCard } from "./tool-card";
import { categories } from "@/lib/data";
import { layerColor, layerStyle } from "@/lib/layer";
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

  // As a page's own h1 (`/<section>`), the section opens with the same hero
  // as every other interior page, tinted with the layer's colour. As a row of
  // the home page's index (h2) it keeps the compact drafting layout below.
  if (headingLevel === "h1") {
    const position = isOffStack
      ? "Off-stack"
      : isCrosscutting
        ? `Layer ${category.index} · cross-cutting`
        : `Layer ${category.index} of the stack`;
    return (
      <section id={category.slug} className="scroll-mt-24">
        <header
          className="hero-head"
          style={{ "--wash": layerColor(category.layer) } as React.CSSProperties}
        >
          <p className="hero-pill font-mono uppercase tracking-[0.14em] text-fg-muted">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={layerStyle(category.layer)}
            />
            {position} · {category.tools.length} tools
          </p>
          <h1 className="mt-5 max-w-3xl text-balance font-serif text-[34px] font-medium leading-[1.06] tracking-[-0.025em] sm:text-[48px]">
            {category.title}
          </h1>
          <p className="mt-5 max-w-[62ch] text-pretty text-[16px] leading-relaxed text-fg-muted sm:text-[17px]">
            {category.responsibility}
          </p>
        </header>

        {/* Directory cards, the same as the home page and /all: the whole
            card opens the tool page. Two to a row, because each carries both
            halves of the verdict. */}
        <ul className="grid gap-3 pb-12 sm:grid-cols-2">
          {category.tools.map((tool) => (
            <li key={tool.slug}>
              <ToolCard
                variant="full"
                href={`/${category.slug}/${tool.slug}`}
                name={tool.name}
                layer={category.layer}
                blurb={tool.blurb}
                kind={tool.kind}
                license={tool.license}
                useWhen={tool.useWhen}
                skipWhen={tool.skipWhen}
                alsoIn={(tool.secondHomes ?? []).map(
                  (h) => categories.find((c) => c.slug === h.section)?.short ?? h.section,
                )}
              />
            </li>
          ))}
        </ul>
      </section>
    );
  }

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
