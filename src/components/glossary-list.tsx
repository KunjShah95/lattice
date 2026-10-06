"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { layerStyle } from "@/lib/layer";
import type { GlossaryTerm } from "@/lib/glossary";

/**
 * Glossary browser. Filterable client-side for the same reason /all is: the
 * whole vocabulary is a few kilobytes, so there is no round trip per keystroke.
 */
export function GlossaryList({ terms }: { terms: GlossaryTerm[] }) {
  const [query, setQuery] = useState("");
  const [layer, setLayer] = useState<number | null | "all">("all");

  const layers = useMemo(() => {
    const m = new Map<number, number>();
    for (const t of terms) {
      if (t.layer == null) continue;
      m.set(t.layer, (m.get(t.layer) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [terms]);

  /**
   * Derived from a deferred copy of the query so the character lands in the
   * input and paints on its own, and the definition rows reconcile behind it.
   * Every keystroke is scored as an interaction, so the work it triggers
   * counts against its latency.
   */
  const deferredQuery = useDeferredValue(query);

  const results = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return terms.filter((t) => {
      if (layer !== "all" && t.layer !== layer) return false;
      if (!q) return true;
      return (
        t.term.toLowerCase().includes(q) ||
        t.definition.toLowerCase().includes(q) ||
        t.detail.toLowerCase().includes(q)
      );
    });
  }, [terms, deferredQuery, layer]);

  return (
    <div>
      {/* Solid rather than `bg-bg/90 backdrop-blur-md`, for the same reason as the
          filter bar on /all: a sticky backdrop-filter over a long scrolling list
          re-blurs on every frame, and at 90% opacity the effect is close to
          invisible. */}
      <div className="sticky top-14 z-30 -mx-5 mb-6 border-b border-border bg-bg px-5 py-3 sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter terms…"
              aria-label="Filter glossary terms"
              className="h-9 w-full rounded-md border border-border bg-bg-elevated pl-8 pr-3 text-[13.5px] outline-none placeholder:text-fg-subtle focus:border-border-strong"
            />
          </div>
          <span aria-live="polite" className="font-mono text-[11px] text-fg-subtle">
            {results.length}
            {results.length === terms.length ? "" : ` / ${terms.length}`}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1">
          <Chip
            active={layer === "all"}
            onClick={() => setLayer("all")}
            label="All"
            count={terms.length}
          />
          {layers.map(([n, count]) => (
            <Chip
              key={n}
              active={layer === n}
              onClick={() => setLayer(layer === n ? "all" : n)}
              label={`Layer ${n}`}
              count={count}
              swatch={n}
            />
          ))}
          <Chip
            active={layer === null}
            onClick={() => setLayer(layer === null ? "all" : null)}
            label="Cross-cutting"
            count={terms.filter((t) => t.layer == null).length}
          />
        </div>
      </div>

      {results.length === 0 ? (
        <p className="py-12 text-center text-sm text-fg-subtle">
          No terms match “{query}”.
        </p>
      ) : (
        <dl className="divide-y divide-border">
          {results.map((t) => (
            <div key={t.slug} className="flex gap-3 py-4 first:pt-0">
              <span
                aria-hidden="true"
                className="mt-1.5 h-6 w-[3px] shrink-0 rounded-full"
                style={layerStyle(t.layer)}
              />
              <div className="min-w-0 flex-1">
                <dt>
                  <Link
                    href={`/glossary/${t.slug}`}
                    className="text-[16px] font-medium underline decoration-transparent underline-offset-2 transition-colors hover:text-accent hover:decoration-border-strong"
                  >
                    {t.term}
                  </Link>
                </dt>
                <dd className="mt-1 text-pretty text-[14px] leading-relaxed text-fg-muted">
                  {t.definition}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
  count,
  swatch,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  swatch?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[12px] transition-colors ${
        active
          ? "border-border-strong bg-bg-sunken text-fg"
          : "border-transparent text-fg-muted hover:bg-bg-sunken hover:text-fg"
      }`}
    >
      {swatch != null ? (
        <span
          aria-hidden="true"
          className="h-2.5 w-[2px] rounded-full"
          style={layerStyle(swatch)}
        />
      ) : null}
      {label}
      <span className="font-mono text-[10px] text-fg-subtle">{count}</span>
    </button>
  );
}
