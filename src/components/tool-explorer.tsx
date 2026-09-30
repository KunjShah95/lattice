"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { layerStyle } from "@/lib/layer";

export type ToolEntry = {
  name: string;
  slug: string;
  domain: string;
  blurb: string;
  tag?: string;
  categorySlug: string;
  categoryTitle: string;
  categoryShort: string;
  layer: number | null;
};

/**
 * Filterable view of the whole index.
 *
 * Filtering happens on the client because the entire dataset is small enough
 * to send in one payload — ~113 rows is a few kilobytes — which means no
 * round trip per keystroke and no loading state. If the index ever grows past
 * a few hundred entries this should move to a search index instead.
 */
export function ToolExplorer({ tools }: { tools: ToolEntry[] }) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [section, setSection] = useState<string | null>(null);
  const [showAllTags, setShowAllTags] = useState(false);

  // Facet counts respect the other active filters, so the numbers next to each
  // option describe what you would actually get by picking it.
  const tags = useMemo(() => {
    const pool = tools.filter(
      (t) => (!section || t.categorySlug === section) && matches(t, query),
    );
    const counts = new Map<string, number>();
    for (const t of pool) if (t.tag) counts.set(t.tag, (counts.get(t.tag) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [tools, query, section]);

  const sections = useMemo(() => {
    const counts = new Map<string, { title: string; short: string; count: number; layer: number | null }>();
    for (const t of tools) {
      if (!matches(t, query)) continue;
      if (tag && t.tag !== tag) continue;
      const existing = counts.get(t.categorySlug);
      if (existing) existing.count += 1;
      else
        counts.set(t.categorySlug, {
          title: t.categoryTitle,
          short: t.categoryShort,
          count: 1,
          layer: t.layer,
        });
    }
    return [...counts.entries()].sort((a, b) => (a[1].layer ?? 99) - (b[1].layer ?? 99));
  }, [tools, query, tag]);

  const results = useMemo(
    () =>
      tools.filter(
        (t) =>
          (!tag || t.tag === tag) &&
          (!section || t.categorySlug === section) &&
          matches(t, query),
      ),
    [tools, query, tag, section],
  );

  const anyFilter = Boolean(query || tag || section);

  return (
    <div>
      {/* Controls */}
      <div className="sticky top-14 z-30 -mx-5 mb-6 border-b border-border bg-bg/90 px-5 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
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
              placeholder="Filter by name or description…"
              aria-label="Filter tools"
              className="h-9 w-full rounded-md border border-border bg-bg-elevated pl-8 pr-3 text-[13.5px] outline-none placeholder:text-fg-subtle focus:border-border-strong"
            />
          </div>

          {anyFilter ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setTag(null);
                setSection(null);
              }}
              className="h-9 rounded-md border border-border px-2.5 text-[13px] text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
            >
              Clear
            </button>
          ) : null}

          <span
            aria-live="polite"
            className="font-mono text-[11px] text-fg-subtle"
          >
            {results.length}
            {results.length === tools.length ? "" : ` / ${tools.length}`}
          </span>
        </div>

        {/* Section facets */}
        {sections.length > 1 ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-1">
            <FacetChip
              active={section === null}
              onClick={() => setSection(null)}
              label="All"
              count={tools.filter((t) => matches(t, query) && (!tag || t.tag === tag)).length}
            />
            {sections.map(([slug, s]) => (
              <FacetChip
                key={slug}
                active={section === slug}
                onClick={() => setSection(section === slug ? null : slug)}
                label={s.short}
                count={s.count}
                layer={s.layer}
              />
            ))}
          </div>
        ) : null}

        {/* Tag facets. There are ~47 of them, which is more chrome than the
            results deserve — show the ones that actually narrow things down
            and let the rest live behind a toggle. */}
        {tags.length > 1 ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {(showAllTags ? tags : tags.slice(0, 12)).map(([name, count]) => (
              <FacetChip
                key={name}
                active={tag === name}
                onClick={() => setTag(tag === name ? null : name)}
                label={name}
                count={count}
              />
            ))}
            {tags.length > 12 ? (
              <button
                type="button"
                onClick={() => setShowAllTags((v) => !v)}
                className="rounded-md px-2 py-1 font-mono text-[11px] text-fg-subtle transition-colors hover:text-fg"
              >
                {showAllTags ? "fewer" : `+${tags.length - 12} more`}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Results */}
      {results.length === 0 ? (
        <p className="py-12 text-center text-sm text-fg-subtle">
          Nothing matches those filters.
        </p>
      ) : (
        <ul className="space-y-px">
          {results.map((t) => (
            <li key={`${t.categorySlug}-${t.slug}`}>
              <div className="group -mx-2 flex items-start gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-bg-sunken">
                <span
                  aria-hidden="true"
                  className="mt-1 h-8 w-[3px] shrink-0 rounded-full"
                  style={layerStyle(t.layer)}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <Link
                      href={`/${t.categorySlug}/${t.slug}`}
                      className="truncate text-[14px] font-medium underline decoration-transparent underline-offset-2 transition-colors hover:decoration-border-strong"
                    >
                      {t.name}
                    </Link>
                    {t.tag ? (
                      <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                        {t.tag}
                      </span>
                    ) : null}
                    <span className="font-mono text-[11px] text-fg-subtle">
                      · {t.categoryShort}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-pretty text-[13px] leading-relaxed text-fg-muted">
                    {t.blurb}
                  </span>
                </span>
                <a
                  href={`https://${t.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${t.name} (opens in a new tab)`}
                  className="mt-0.5 shrink-0 text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M7 17 17 7M9 7h8v8" />
                  </svg>
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function matches(t: ToolEntry, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    t.name.toLowerCase().includes(q) ||
    t.blurb.toLowerCase().includes(q) ||
    t.domain.toLowerCase().includes(q) ||
    (t.tag?.toLowerCase().includes(q) ?? false)
  );
}

function FacetChip({
  active,
  onClick,
  label,
  count,
  layer,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  layer?: number | null;
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
      {layer != null ? (
        <span
          aria-hidden="true"
          className="h-2.5 w-[2px] rounded-full"
          style={layerStyle(layer)}
        />
      ) : null}
      {label}
      <span className="font-mono text-[10px] text-fg-subtle">{count}</span>
    </button>
  );
}
