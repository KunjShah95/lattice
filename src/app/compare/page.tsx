import type { Metadata } from "next";
import Link from "next/link";
import { layerStyle } from "@/lib/layer";
import { resolvedComparisons } from "@/lib/comparisons";

export const metadata: Metadata = {
  title: "Comparisons",
  description:
    "Head-to-head comparisons of tools that are genuine substitutes — inference runtimes, vector stores, gateways, observability platforms and durable workflow engines — with a recommendation for each.",
  alternates: { canonical: "/compare" },
};

export default function CompareIndexPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 pt-14 sm:px-6 sm:pt-16">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
          {resolvedComparisons.length} comparisons
        </p>
        <h1 className="mt-4 text-balance font-serif text-[34px] font-medium leading-[1.1] tracking-[-0.02em] sm:text-[42px]">
          When the list is not the answer.
        </h1>
        <p className="mt-4 max-w-[56ch] text-pretty text-[15px] leading-relaxed text-fg-muted">
          A directory can tell you what exists. It cannot tell you which of two
          things to pick. These comparisons cover tools that are genuine
          substitutes for one another, and end with a recommendation rather
          than a feature grid.
        </p>
      </header>

      <ol className="mt-12 space-y-px">
        {resolvedComparisons.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/compare/${c.slug}`}
              className="group -mx-2 flex gap-4 rounded-md px-2 py-5 transition-colors hover:bg-bg-sunken"
            >
              <span
                aria-hidden="true"
                className="mt-1.5 h-8 w-[3px] shrink-0 rounded-full"
                style={layerStyle(c.tools[0]?.layer ?? null)}
              />
              <span className="min-w-0 flex-1">
                <h2 className="text-balance font-serif text-[19px] font-medium tracking-[-0.01em] group-hover:text-accent">
                  {c.title}
                </h2>
                <p className="mt-1.5 text-pretty text-[14px] leading-relaxed text-fg-muted">
                  {c.description}
                </p>
                <span className="mt-2 font-mono text-[11px] text-fg-subtle">
                  {c.tools.map((t) => t.name).join(" · ")}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
