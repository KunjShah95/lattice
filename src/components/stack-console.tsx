import Link from "next/link";
import { categories } from "@/lib/data";
import { layerColor } from "@/lib/layer";
import { recommendStack, WORKLOADS, type Workload } from "@/lib/stacks";
import { encodeStackInput } from "@/lib/stack-url";

/**
 * The hero exhibit: the Stack Builder's real output, not a picture of it.
 *
 * Rendered on the server from the same `recommendStack` call that
 * `/stack/<workload>` prerenders, so every pick, fit label and cost band here
 * is what the engine actually returns for the default case. If the dataset
 * changes, the hero changes with it. The workload tabs are plain links to the
 * prerendered page for each one, so the panel needs no client JavaScript.
 */
const CASE = { workload: "rag" as Workload, queriesPerMonth: 100_000 };

export function StackConsole() {
  const result = recommendStack(CASE);
  const builderPath = `/stack-builder?${encodeStackInput(CASE)}`;
  const sectionOf = (slug: string) => categories.find((c) => c.slug === slug);

  return (
    <figure className="overflow-hidden rounded-lg border border-border-strong bg-bg-elevated shadow-float">
      {/* Tab strip: one tab per workload, the active one is the case below. */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border bg-bg-sunken px-2 no-scrollbar">
        {WORKLOADS.map((w) => {
          const active = w.id === CASE.workload;
          return (
            <Link
              key={w.id}
              href={`/stack/${w.id}`}
              aria-current={active ? "page" : undefined}
              className={`relative whitespace-nowrap px-3 py-2.5 font-mono text-[11.5px] transition-colors ${
                active
                  ? "text-fg after:absolute after:inset-x-2 after:-bottom-px after:h-px after:bg-fg"
                  : "text-fg-subtle hover:text-fg"
              }`}
            >
              {w.id}
            </Link>
          );
        })}
      </div>

      {/* The query, as you would type it. */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 font-mono text-[12px]">
        <span className="truncate text-fg-muted">
          <span className="text-fg-subtle">$ </span>
          lattice recommend <span className="text-fg">--workload rag --qpm 100k</span>
        </span>
        <span className="hidden shrink-0 text-fg-subtle sm:inline">{result.picks.length} layers</span>
      </div>

      <figcaption className="sr-only">
        The Stack Builder&apos;s recommendation for a RAG app at 100,000 queries a month.
      </figcaption>

      <table className="w-full table-fixed text-left text-[12.5px]">
        <thead>
          <tr className="border-b border-border font-mono text-[10.5px] uppercase tracking-[0.08em] text-fg-subtle">
            <th scope="col" className="w-[38%] px-4 py-2 font-normal">Layer</th>
            <th scope="col" className="w-[30%] px-2 py-2 font-normal">Pick</th>
            <th scope="col" className="hidden px-2 py-2 font-normal sm:table-cell">Fit</th>
          </tr>
        </thead>
        <tbody>
          {[...result.picks]
            .sort((a, b) => (sectionOf(a.sectionSlug)?.layer ?? 99) - (sectionOf(b.sectionSlug)?.layer ?? 99))
            .map((p) => {
            const section = sectionOf(p.sectionSlug);
            return (
              <tr key={p.sectionSlug} className="border-b border-border last:border-b-0">
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className="h-3 w-[3px] shrink-0 rounded-full"
                      style={{ backgroundColor: layerColor(section?.layer ?? null) }}
                    />
                    <span className="font-mono text-[11px] text-fg-subtle">{section?.index}</span>
                    <span className="truncate text-fg-muted">{p.section}</span>
                  </span>
                </td>
                <td className="truncate px-2 py-2.5">
                  <Link href={p.url} className="font-medium text-fg hover:text-accent">
                    {p.tool}
                  </Link>
                </td>
                <td className="hidden px-2 py-2.5 sm:table-cell">
                  <span className="font-mono text-[11px] text-fg-muted">{p.fitLabel}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border bg-bg-sunken px-4 py-3 font-mono text-[11.5px]">
        <span className="text-fg-muted">
          est. <span className="text-fg">${result.costLow}–${result.costHigh}</span>/mo
        </span>
        <Link href={builderPath} className="text-fg transition-colors hover:text-accent">
          Change the inputs →
        </Link>
      </div>
    </figure>
  );
}
