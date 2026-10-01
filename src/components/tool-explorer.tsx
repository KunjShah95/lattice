"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { layerStyle } from "@/lib/layer";

export type ToolEntry = {
  name: string;
  slug: string;
  domain: string;
  blurb: string;
  kind: string;
  deployment: string | null;
  license: string | null;
  language: string | null;
  cost: string;
  useWhen: string;
  skipWhen: string;
  categorySlug: string;
  categoryTitle: string;
  categoryShort: string;
  layer: number | null;
};

/** Facet dimensions. OR within a group, AND across groups. */
const GROUPS = [
  { key: "deployment", label: "Deployment" },
  { key: "kind", label: "Kind" },
  { key: "cost", label: "Cost" },
] as const;

type GroupKey = (typeof GROUPS)[number]["key"];

/**
 * Filterable view of the whole index.
 *
 * Filtering runs on the client because the entire dataset is small enough to
 * send in one payload — ~113 rows is a few kilobytes — so there is no round
 * trip per keystroke and no loading state. Past a few hundred entries this
 * should move to a server-side search index.
 *
 * Facet counts respect the *other* active filters, so the number beside each
 * option is what you would actually get by picking it.
 */
export function ToolExplorer({ tools }: { tools: ToolEntry[] }) {
  const [query, setQuery] = useState("");
  const [section, setSection] = useState<string | null>(null);
  const [selected, setSelected] = useState<Partial<Record<GroupKey, Set<string>>>>(
    {},
  );
  const [expanded, setExpanded] = useState<Partial<Record<GroupKey, boolean>>>({});

  const textMatch = useMemo(
    () => tools.filter((t) => matches(t, query)),
    [tools, query],
  );

  // Which rows survive every *other* group, used to count each group's options.
  // useCallback so the memos below can depend on it without re-running on
  // every render — it closes over the filters, not over itself.
  const poolFor = useCallback(
    (skip: GroupKey | "section") =>
      textMatch.filter((t) => {
        if (skip !== "section" && section && t.categorySlug !== section) return false;
        for (const g of GROUPS) {
          if (g.key === skip) continue;
          const sel = selected[g.key];
          if (sel?.size && !sel.has(valueOf(t, g.key))) return false;
        }
        return true;
      }),
    [textMatch, section, selected],
  );

  const sections = useMemo(
    () =>
      count(poolFor("section"), (t) => t.categorySlug)
        .map(([value, n]) => {
          const first = tools.find((t) => t.categorySlug === value)!;
          return {
            label: first.categoryShort,
            value,
            count: n,
            layer: first.layer,
          };
        })
        .sort((a, b) => (a.layer ?? 99) - (b.layer ?? 99)),
    [tools, poolFor],
  );

  const facets = useMemo(
    () =>
      GROUPS.flatMap((g) =>
        count(poolFor(g.key), (t) => valueOf(t, g.key)).map(([value, n]) => ({
          group: g.key,
          label: value,
          value,
          count: n,
        })),
      ),
    [poolFor],
  );

  const results = useMemo(() => poolFor("section"), [poolFor]);

  const activeCount =
    GROUPS.reduce((n, g) => n + (selected[g.key]?.size ?? 0), 0) + (section ? 1 : 0);

  function toggle(group: GroupKey, value: string) {
    setSelected((prev) => {
      const current = new Set(prev[group] ?? []);
      if (current.has(value)) current.delete(value);
      else current.add(value);
      return { ...prev, [group]: current };
    });
  }

  function clearAll() {
    setQuery("");
    setSection(null);
    setSelected({});
  }

  return (
    <div>
      <div className="sticky top-14 z-30 -mx-5 mb-6 border-b border-border bg-bg/90 px-5 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1">
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name, description or use-case…"
              aria-label="Filter tools"
              className="h-9 w-full rounded-md border border-border bg-bg-elevated pl-8 pr-3 text-[13.5px] outline-none placeholder:text-fg-subtle focus:border-border-strong"
            />
          </div>

          {query || activeCount ? (
            <button
              type="button"
              onClick={clearAll}
              className="h-9 rounded-md border border-border px-2.5 text-[13px] text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
            >
              Clear{activeCount ? ` (${activeCount})` : ""}
            </button>
          ) : null}

          <span aria-live="polite" className="font-mono text-[11px] text-fg-subtle">
            {results.length}
            {results.length === tools.length ? "" : ` / ${tools.length}`}
          </span>
        </div>

        {sections.length > 1 ? (
          <FacetRow label="Section">
            <FacetChip
              active={section === null}
              onClick={() => setSection(null)}
              label="All"
              count={poolFor("section").length}
            />
            {sections.map((s) => (
              <FacetChip
                key={s.value}
                active={section === s.value}
                onClick={() => setSection(section === s.value ? null : s.value)}
                label={s.label}
                count={s.count}
                layer={s.layer}
              />
            ))}
          </FacetRow>
        ) : null}

        {GROUPS.map((g) => {
          const items = facets.filter((f) => f.group === g.key);
          if (items.length < 2) return null;
          const open = expanded[g.key] ?? items.length <= 8;
          return (
            <FacetRow key={g.key} label={g.label}>
              {(open ? items : items.slice(0, 6)).map((f) => (
                <FacetChip
                  key={f.value}
                  active={Boolean(selected[g.key]?.has(f.value))}
                  onClick={() => toggle(g.key, f.value)}
                  label={f.label}
                  count={f.count}
                />
              ))}
              {items.length > 6 ? (
                <button
                  type="button"
                  onClick={() => setExpanded((p) => ({ ...p, [g.key]: !open }))}
                  className="rounded-md px-2 py-1 font-mono text-[11px] text-fg-subtle transition-colors hover:text-fg"
                >
                  {open ? "fewer" : `+${items.length - 6}`}
                </button>
              ) : null}
            </FacetRow>
          );
        })}
      </div>

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
                    <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                      {t.kind}
                    </span>
                    {t.license ? (
                      <span className="font-mono text-[10px] text-fg-subtle">
                        {t.license}
                      </span>
                    ) : null}
                    <span className="font-mono text-[11px] text-fg-subtle">
                      · {t.categoryShort}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-pretty text-[13px] leading-relaxed text-fg-muted">
                    {t.blurb}
                  </span>
                  <span className="mt-1 block text-pretty text-[12.5px] leading-relaxed text-fg-subtle">
                    <span className="text-fg-muted">Use when</span> {t.useWhen}
                  </span>
                </span>
                <a
                  href={`https://${t.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${t.name} (opens in a new tab)`}
                  className="mt-0.5 shrink-0 text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

function valueOf(t: ToolEntry, key: GroupKey): string {
  const v = t[key];
  return v ?? "unknown";
}

function matches(t: ToolEntry, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    t.name.toLowerCase().includes(q) ||
    t.blurb.toLowerCase().includes(q) ||
    t.domain.toLowerCase().includes(q) ||
    t.useWhen.toLowerCase().includes(q) ||
    t.skipWhen.toLowerCase().includes(q) ||
    (t.license?.toLowerCase().includes(q) ?? false) ||
    (t.language?.toLowerCase().includes(q) ?? false)
  );
}

function count<T>(rows: ToolEntry[], pick: (t: ToolEntry) => T) {
  const m = new Map<T, number>();
  for (const r of rows) {
    const k = pick(r);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()];
}

function FacetRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1">
      <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
        {label}
      </span>
      {children}
    </div>
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
