import { ToolRow } from "./tool-row";
import type { Category } from "@/lib/types";

/**
 * A numbered category block. The oversized ordinal is the primary
 * navigational signal; the tool list stays visually quiet beneath it.
 */
export function CategorySection({
  category,
  headingLevel = "h2",
}: {
  category: Category;
  headingLevel?: "h1" | "h2";
}) {
  const Heading = headingLevel;

  return (
    <section
      id={category.slug}
      className="scroll-mt-24 border-t border-border py-12"
    >
      <div className="flex gap-4 sm:gap-6">
        {/* Ordinal */}
        <span
          aria-hidden="true"
          className="w-9 shrink-0 pt-1 font-mono text-[13px] tabular-nums text-fg-subtle sm:w-12 sm:text-[15px]"
        >
          {category.index}
        </span>

        <div className="min-w-0 flex-1">
          <Heading className="text-balance text-[20px] font-medium tracking-[-0.015em] sm:text-[22px]">
            {category.title}
          </Heading>
          <p className="mt-1 text-pretty text-[14px] leading-relaxed text-fg-muted">
            {category.description}
          </p>

          <ul className="mt-5 space-y-0.5">
            {category.tools.map((tool) => (
              <ToolRow key={tool.slug} tool={tool} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
