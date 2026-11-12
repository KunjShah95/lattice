"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { Workload } from "@/lib/stacks";
import { encodeStackInput } from "@/lib/stack-url";

/**
 * The hero exhibit: the Stack Builder's real output, not a picture of it.
 *
 * `ConsolePanel` carries only what this component renders: no `why`,
 * `watchOut`, `risk` or `matches`, and no section lookup against the full
 * tool dataset. Those fields and that lookup belong to `StackResult` and
 * `categories` from `lib/data.ts`, and the first version of this component
 * imported both directly, which pulled the entire dataset module into the
 * client bundle to read two fields (`index`, `layer`) off it. `page.tsx`
 * does that lookup once, server-side, while building the seven panels, and
 * hands this component the pre-sorted, pre-joined result.
 */
export type ConsolePick = {
  sectionSlug: string;
  section: string;
  sectionIndex: string;
  layer: number | null;
  tool: string;
  url: string;
  fitLabel: string;
};

export type ConsolePanel = {
  workload: Workload;
  costLow: number;
  costHigh: number;
  /** Already sorted surface-first by `page.tsx`; this component never resorts. */
  picks: ConsolePick[];
};

const CASE_QPM = 100_000;

/** The three band colours, keyed by a layer number. Mirrors `layerColor` in
 *  `lib/layer.ts`, which this component does not import for the same reason
 *  it does not import `categories`: that module pulls the layer gradient and
 *  the full stack-layer table in with it for one lookup. */
function bandColorFor(layer: number | null): string {
  if (layer == null) return "var(--fg-subtle)";
  if (layer <= 2) return "var(--band-compute)";
  if (layer <= 4) return "var(--band-state)";
  return "var(--band-control)";
}

export function StackConsole({ panels }: { panels: ConsolePanel[] }) {
  const [active, setActive] = useState(0);
  const panel = panels[active];
  const builderPath = `/stack-builder?${encodeStackInput({ workload: panel.workload, queriesPerMonth: CASE_QPM })}`;
  const tabsId = useId();

  return (
    <figure className="overflow-hidden rounded-lg border border-border-strong bg-bg-elevated shadow-float">
      {/* Tab strip: switches the panel in place. Still a real URL per tab
          (`role="tab"` reads oddly over a list of links a search engine should
          follow), so a crawler or a reader with JS off still reaches every
          workload's own prerendered page. */}
      <div
        role="tablist"
        aria-label="Workload"
        id={tabsId}
        className="flex items-center gap-1 overflow-x-auto border-b border-border bg-bg-sunken px-2 no-scrollbar"
      >
        {panels.map((p, i) => {
          const isActive = i === active;
          return (
            <button
              key={p.workload}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(i)}
              className={`relative whitespace-nowrap px-3 py-2.5 font-mono text-[11.5px] transition-colors ${
                isActive
                  ? "text-fg after:absolute after:inset-x-2 after:-bottom-px after:h-px after:bg-accent"
                  : "text-fg-subtle hover:text-fg"
              }`}
            >
              {p.workload}
            </button>
          );
        })}
      </div>

      {/* The query, as you would type it. The cursor only blinks when this
          panel is the one on screen: a steady blink behind the scenes would
          be animating something nobody is looking at. */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 font-mono text-[12px]">
        <span className="truncate text-fg-muted">
          <span className="text-fg-subtle">$ </span>
          lattice recommend{" "}
          <span className="text-fg">--workload {panel.workload} --qpm 100k</span>
          <span aria-hidden="true" className="console-cursor ml-0.5 inline-block h-[1em] w-[2px] translate-y-[1px] bg-accent align-middle" />
        </span>
        <span className="hidden shrink-0 text-fg-subtle sm:inline">{panel.picks.length} layers</span>
      </div>

      <figcaption className="sr-only">
        The Stack Builder&apos;s recommendation for {panel.workload} at 100,000 queries a month.
      </figcaption>

      {/* Keyed by workload so each tab switch restarts the stagger: the rows
          print in, top to bottom, like output landing in a terminal rather
          than a cross-fade between two static tables. */}
      <table key={panel.workload} role="tabpanel" aria-labelledby={tabsId} className="w-full table-fixed text-left text-[12.5px]">
        <thead>
          <tr className="border-b border-border font-mono text-[10.5px] uppercase tracking-[0.08em] text-fg-subtle">
            <th scope="col" className="w-[38%] px-4 py-2 font-normal">Layer</th>
            <th scope="col" className="w-[30%] px-2 py-2 font-normal">Pick</th>
            <th scope="col" className="hidden px-2 py-2 font-normal sm:table-cell">Fit</th>
          </tr>
        </thead>
        <tbody>
          {panel.picks.map((p, i) => (
            <tr
              key={p.sectionSlug}
              className="stamp-row border-b border-border last:border-b-0"
              style={{ "--row-delay": `${i * 55}ms` } as React.CSSProperties}
            >
              <td className="px-4 py-2.5">
                <span className="flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="h-3 w-[3px] shrink-0 rounded-full"
                    style={{ backgroundColor: bandColorFor(p.layer) }}
                  />
                  <span className="font-mono text-[11px] text-fg-subtle">{p.sectionIndex}</span>
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
          ))}
        </tbody>
      </table>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border bg-bg-sunken px-4 py-3 font-mono text-[11.5px]">
        <span className="text-fg-muted">
          est. <span key={`${panel.workload}-cost`} className="console-cost text-fg">${panel.costLow}–${panel.costHigh}</span>/mo
        </span>
        <Link href={builderPath} className="text-fg transition-colors hover:text-accent">
          Change the inputs →
        </Link>
      </div>
    </figure>
  );
}
