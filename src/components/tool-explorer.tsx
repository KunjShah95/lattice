"use client";

import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { FilterChip } from "@/components/ui/filter-chip";
import { FilterEmptyState } from "@/components/ui/filter-empty-state";
import { layerColor } from "@/lib/layer-color";
import { ROLES } from "@/lib/roles";
import {
  activeFilterCount,
  facetOptions,
  poolFor,
  textAndSectionMatches,
  FACET_GROUPS,
  type FacetKey,
  type FacetRow,
  type FacetSelection,
} from "@/lib/facets";
import {
  decodeFacetQuery,
  decodeFacetSelection,
  encodeFacetSelection,
  EMPTY_SELECTION,
} from "@/lib/facet-url";

const ROLE_ORDER = ROLES.map((r) => r.title);

export type ToolEntry = FacetRow & {
  name: string;
  categoryTitle: string;
  /** YYYY-MM. Shown right-aligned, where a date is scannable at a glance. */
  asOf?: string;
};

type GroupKey = FacetKey;
type View = "list" | "grid";
type Sort = "curated" | "az" | "layer";

/**
 * Filterable view of the whole index.
 *
 * Three shapes of information, three shapes of control:
 *
 *   - The query is a full-width field with a placeholder that names what it
 *     searches. "Filter…" tells a reader nothing; the corpus is tools, layers,
 *     licences and languages, so the field says so.
 *   - The facets are chips in one scrollable block. They stay on the page
 *     rather than in a drawer because there are only five axes and the counts
 *     beside them are the thing that makes choosing fast — hiding them behind
 *     a "Filters" button would add a tap to every decision and hide the
 *     trade-offs the counts exist to show.
 *   - The results have a view toggle. A dense list answers "compare facts"; a
 *     card grid answers "show me what this is". Neither is the right default
 *     for everyone, so the reader picks.
 *
 * Filtering runs on the client because the dataset is ~113 rows. Counts
 * respect the other active filters, so the number beside an option is what
 * picking it would actually yield.
 */
export function ToolExplorer({ tools }: { tools: ToolEntry[] }) {
  const [query, setQuery] = useState(() =>
    typeof window === "undefined" ? "" : decodeFacetQuery(window.location.search),
  );
  const [selection, setSelection] = useState<FacetSelection>(() =>
    typeof window === "undefined"
      ? EMPTY_SELECTION
      : decodeFacetSelection(window.location.search),
  );
  const [view, setView] = useState<View>("list");
  const [sort, setSort] = useState<Sort>("curated");
  const [expanded, setExpanded] = useState<Partial<Record<GroupKey, boolean>>>({});
  /** Below `sm`, the four secondary axes are behind one disclosure. */
  const [filtersOpen, setFiltersOpen] = useState(false);

  const section = selection.section ?? null;
  const selected = selection;

  // The input updates immediately; the rows it drives trail behind it, so the
  // character lands before 113 rows reconcile inside the keystroke's frame.
  const deferredQuery = useDeferredValue(query);

  const textMatch = useMemo(
    () => textAndSectionMatches(tools, deferredQuery, null),
    [tools, deferredQuery],
  );

  const poolForGroup = useCallback(
    (skip: GroupKey | "section") =>
      poolFor(textMatch, { section, ...selected }, skip),
    [textMatch, section, selected],
  );

  const sections = useMemo(() => {
    const pool = poolForGroup("section");
    const counts = new Map<string, number>();
    for (const row of pool) {
      counts.set(row.categorySlug, (counts.get(row.categorySlug) ?? 0) + 1);
    }
    return [...counts]
      .map(([value, n]) => {
        const first = tools.find((t) => t.categorySlug === value)!;
        return {
          label: first.categoryShort,
          value,
          count: n,
          layer: first.layer,
        };
      })
      .sort((a, b) => (a.layer ?? 99) - (b.layer ?? 99));
  }, [tools, poolForGroup]);

  const facets = useMemo(
    () => facetOptions(textMatch, { section, ...selected }, ROLE_ORDER),
    [textMatch, section, selected],
  );

  const pool = useMemo(() => poolForGroup("section"), [poolForGroup]);

  const results = useMemo(() => {
    // `poolFor(..., "section")` deliberately ignores the section selection so
    // the section chips can count themselves. The result list must not: a
    // reader who picks a section expects the list to narrow, and a toolbar that
    // says "41" while showing 113 rows is the fastest way to lose their trust.
    const scoped = section
      ? pool.filter((row) => row.categorySlug === section)
      : pool;
    // `poolFor` is typed against `FacetRow`; every row here came from `tools`,
    // so the narrower shape is safe and the view components need its fields.
    const next = [...scoped] as ToolEntry[];
    if (sort === "az") next.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "layer")
      next.sort(
        (a, b) =>
          (a.layer ?? 99) - (b.layer ?? 99) ||
          a.categoryShort.localeCompare(b.categoryShort) ||
          a.name.localeCompare(b.name),
      );
    return next;
  }, [pool, sort, section]);

  const activeCount = activeFilterCount({ section, ...selected });

  const activeChips = (() => {
    const out: Array<{ group: GroupKey | "section"; value: string; label: string }> = [];
    if (section) {
      const first = tools.find((t) => t.categorySlug === section);
      out.push({ group: "section", value: section, label: first?.categoryShort ?? section });
    }
    for (const g of FACET_GROUPS) {
      for (const value of selected[g.key] ?? []) {
        const known = facets.find((f) => f.group === g.key && f.value === value);
        out.push({ group: g.key, value, label: known?.label ?? value });
      }
    }
    return out;
  })();

  function toggle(group: GroupKey, value: string) {
    setSelection((prev) => {
      const current = new Set(prev[group] ?? []);
      if (current.has(value)) current.delete(value);
      else current.add(value);
      return { ...prev, [group]: current };
    });
  }

  function pickSection(value: string | null) {
    setSelection((prev) => ({ ...prev, section: value }));
  }

  function clearAll() {
    setQuery("");
    setSelection(EMPTY_SELECTION);
  }

  /**
   * Mirror the selection into the URL with `replaceState`, so typing does not
   * fill Back with one entry per keystroke. The cost is that Back leaves `/all`
   * rather than undoing the last chip; the alternative is worse.
   */
  useEffect(() => {
    const search = encodeFacetSelection(query, selection);
    const next = `${window.location.pathname}${search ? `?${search}` : ""}`;
    if (next !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, "", next);
    }
  }, [query, selection]);

  return (
    <div>
      {/* Toolbar. Solid, not blurred: a sticky blur over scrolling rows is the
          one case backdrop-filter is worst at. */}
      <div className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-30 -mx-5 border-b border-border bg-bg px-5 py-3 sm:-mx-8 sm:px-8">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[15rem] flex-1">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && query) setQuery("");
              }}
              placeholder="Search tools, layers, licences, languages…"
              aria-label="Filter tools"
              className="field h-11 pl-10 pr-10"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear the search text"
                className="press absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-[var(--r-control)] text-fg-subtle hover:bg-bg-sunken hover:text-fg"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            ) : null}
          </div>

          <ViewToggle view={view} onChange={setView} />

          {query || activeCount ? (
            <button
              type="button"
              onClick={clearAll}
              className="press h-11 rounded-[var(--r-control)] border border-border px-3.5 text-[14px] text-fg-muted transition-colors hover:border-border-strong hover:bg-bg-sunken hover:text-fg"
            >
              Clear{activeCount ? ` (${activeCount})` : ""}
            </button>
          ) : null}

          <span
            aria-live="polite"
            className="ml-auto min-w-[4.5rem] text-right font-mono text-[13px] tabular-nums text-fg-muted"
          >
            {results.length}
            {results.length === tools.length ? "" : ` / ${tools.length}`}
          </span>
        </div>
      </div>

      {/* Facets live below the sticky bar rather than inside it. The search and
          the count stay pinned because they change as you type; five axes of
          chips do not need to occupy half the viewport for the whole scroll. */}
      <div className="-mx-5 border-b border-border px-5 pb-5 pt-1 sm:-mx-8 sm:px-8">
        {sections.length > 1 ? (
          <FacetRow label="Section">
            <FacetChip
              active={section === null}
              onClick={() => pickSection(null)}
              label="All"
              count={poolForGroup("section").length}
            />
            {sections.map((s) => (
              <FacetChip
                key={s.value}
                active={section === s.value}
                onClick={() => pickSection(section === s.value ? null : s.value)}
                label={s.label}
                count={s.count}
                layer={s.layer}
              />
            ))}
          </FacetRow>
        ) : null}

        {FACET_GROUPS.length ? (
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            aria-controls="facet-groups"
            className="chip mt-3 min-h-9 sm:hidden"
          >
            {filtersOpen ? "Hide filters" : "More filters"}
            {activeCount ? (
              <span className="font-mono text-[12px]">({activeCount})</span>
            ) : null}
          </button>
        ) : null}

        <div
          id="facet-groups"
          className={filtersOpen ? "block" : "hidden sm:block"}
        >
        <div className="grid gap-x-8 sm:grid-cols-2">
        {FACET_GROUPS.map((g) => {
          const items = facets.filter((f) => f.group === g.key);
          if (items.length < 2) return null;
          const open = expanded[g.key] ?? items.length <= 6;
          return (
            <FacetRow key={g.key} label={g.label}>
              {(open ? items : items.slice(0, 6)).map((f) => (
                <FacetChip
                  key={f.value}
                  active={Boolean(selected[g.key]?.has(f.value))}
                  onClick={() => toggle(g.key, f.value)}
                  label={f.label}
                  count={f.count}
                  facetGroup={g.key}
                  facetValue={f.value}
                />
              ))}
              {items.length > 6 ? (
                <button
                  type="button"
                  onClick={() => setExpanded((p) => ({ ...p, [g.key]: !open }))}
                  className="press rounded-full px-2.5 py-1 font-mono text-[13px] text-fg-muted transition-colors hover:text-fg"
                >
                  {open ? "Fewer" : `+${items.length - 6} more`}
                </button>
              ) : null}
            </FacetRow>
          );
        })}
        </div>
        </div>
      </div>

      {/* The control row: sort on the left, what is active on the right. Sorting
          is exposed rather than buried in a select because it is the second
          thing a reader reaches for after filtering. */}
      <div className="mb-6 mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Sort results">
          <span className="mr-1 font-mono text-[12px] uppercase tracking-[0.08em] text-fg-subtle">
            Sort
          </span>
          {(
            [
              { value: "curated", label: "Curated" },
              { value: "az", label: "A–Z" },
              { value: "layer", label: "By layer" },
            ] as const
          ).map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSort(s.value)}
              aria-pressed={sort === s.value}
              className="chip min-h-9"
            >
              {s.label}
            </button>
          ))}
        </div>

        {activeChips.length ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {activeChips.map((a) => (
              <button
                key={`${a.group}-${a.value}`}
                type="button"
                onClick={() =>
                  a.group === "section"
                    ? pickSection(null)
                    : toggle(a.group as GroupKey, a.value)
                }
                className="chip is-active min-h-8 gap-1.5"
                title={`Remove the ${a.label} filter`}
              >
                {a.label}
                <span aria-hidden="true" className="text-bg/70">×</span>
                <span className="sr-only">(remove filter)</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {results.length === 0 ? (
        <FilterEmptyState
          query={query}
          active={activeChips}
          onClearQuery={() => setQuery("")}
          onRemove={(group, value) =>
            group === "section" ? pickSection(null) : toggle(group as GroupKey, value)
          }
          onReset={clearAll}
        />
      ) : view === "list" ? (
        <ListView results={results} />
      ) : (
        <GridView results={results} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* View toggle                                                         */
/* ------------------------------------------------------------------ */

function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <div
      role="group"
      aria-label="Result view"
      className="flex h-11 items-center gap-0.5 rounded-[var(--r-control)] border border-border bg-bg-elevated p-1"
    >
      {(
        [
          { value: "list", label: "List" },
          { value: "grid", label: "Cards" },
        ] as const
      ).map((v) => (
        <button
          key={v.value}
          type="button"
          onClick={() => onChange(v.value)}
          aria-pressed={view === v.value}
          title={`${v.label} view`}
          className={`press inline-flex h-9 items-center gap-1.5 rounded-[8px] px-2.5 text-[13px] transition-colors ${
            view === v.value
              ? "bg-fg text-bg"
              : "text-fg-muted hover:bg-bg-sunken hover:text-fg"
          }`}
        >
          {v.value === "list" ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
              <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
              <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
              <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
            </svg>
          )}
          {v.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Results                                                             */
/* ------------------------------------------------------------------ */

function ListView({ results }: { results: ToolEntry[] }) {
  return (
    <ul className="divide-y divide-border">
      {results.map((t) => (
        <li key={`${t.categorySlug}-${t.slug}`}>
          <div className="group relative -mx-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3.5 rounded-[var(--r-control)] px-2 py-4 transition-colors hover:bg-bg-sunken">
            <span
              aria-hidden="true"
              className="mt-1.5 h-11 w-[3px] shrink-0 rounded-full transition-[width] duration-300 ease-[var(--ease-spring)] group-hover:w-[5px]"
              style={{ backgroundColor: layerColor(t.layer) }}
            />

            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <Link
                  href={`/${t.categorySlug}/${t.slug}`}
                  className="link-draw text-[17px] font-medium leading-snug tracking-[-0.012em]"
                >
                  {t.name}
                </Link>
                <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 font-mono text-[12px] uppercase tracking-[0.06em] text-fg-muted">
                  {t.kind}
                </span>
              </div>

              <p className="mt-1 line-clamp-2 text-[14.5px] leading-relaxed text-fg-muted">
                {t.blurb}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <MetaChip label={t.categoryShort} swatch={layerColor(t.layer)} />
                {t.license ? <MetaChip label={t.license} /> : null}
                {t.cost ? <MetaChip label={costLabel(t.cost)} /> : null}
                {t.deployment ? <MetaChip label={deploymentLabel(t.deployment)} /> : null}
              </div>

              <details className="group/det mt-2.5">
                <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-[var(--r-control)] py-1.5 text-[13.5px] font-medium text-fg-muted transition-colors hover:text-fg">
                  <span className="grid h-4 w-4 place-items-center rounded-[var(--r-pill)] border border-border-strong text-[12px] leading-none transition-transform group-open/det:rotate-45">
                    +
                  </span>
                  When to use it, when to skip it
                </summary>
                <div className="mt-2 rounded-[var(--r-control)] border border-border bg-bg-elevated p-3">
                  <p className="text-pretty text-[14px] leading-relaxed">
                    <span className="font-medium text-fg">Use when</span>{" "}
                    <span className="text-fg-muted">{t.useWhen}</span>
                  </p>
                  <p className="mt-1.5 text-pretty text-[14px] leading-relaxed">
                    <span className="font-medium text-fg-muted">Skip when</span>{" "}
                    <span className="text-fg-muted">{t.skipWhen}</span>
                  </p>
                  {t.secondHomes?.length ? (
                    <p className="mt-2 font-mono text-[12.5px] text-fg-subtle">
                      Also in {t.secondHomes.join(", ")}
                    </p>
                  ) : null}
                </div>
              </details>
            </div>

            <div className="flex flex-col items-end gap-1.5">
              <a
                href={`https://${t.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${t.name} — visit the project (opens in a new tab)`}
                title={`Visit ${t.name} (opens in a new tab)`}
                className="press grid h-9 w-9 place-items-center rounded-[var(--r-control)] text-fg-subtle transition-colors hover:bg-bg hover:text-fg"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7 17 17 7M9 7h8v8" />
                </svg>
              </a>
              {t.asOf ? (
                <span
                  title={`Licence and cost last confirmed ${t.asOf}`}
                  className="hidden font-mono text-[12px] tabular-nums text-fg-subtle sm:block"
                >
                  {t.asOf}
                </span>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function GridView({ results }: { results: ToolEntry[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {results.map((t) => (
        <li key={`${t.categorySlug}-${t.slug}`}>
          <article className="card group flex h-full flex-col overflow-hidden transition-[box-shadow,border-color,transform] duration-200 hover:-translate-y-0.5 hover:shadow-lift">
            {/* The picture is the layer: a colour field carrying the section
                and its ordinal. It is generated, not a vendor logo — the
                subject is where the tool sits in the stack. Text sits below
                the field, never on it, so a photo or a tint can never make the
                name unreadable. */}
            <div
              aria-hidden="true"
              className="hatch hatch-stack relative flex h-24 items-end justify-between px-4 pb-3"
              style={{
                color: layerColor(t.layer),
                backgroundColor: `color-mix(in oklab, ${layerColor(t.layer)} 12%, var(--bg-elevated))`,
                borderBottom: `2px solid ${layerColor(t.layer)}`,
              }}
            >
              <span className="font-mono text-[12px] uppercase tracking-[0.1em]" style={{ color: "var(--fg-muted)" }}>
                {t.categoryShort}
              </span>
              <span className="font-mono text-[12px] tabular-nums" style={{ color: "var(--fg-muted)" }}>
                {String(t.layer ?? "—").padStart(2, "0")}
              </span>
            </div>

            <div className="flex flex-1 flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[18px] font-medium leading-snug tracking-[-0.014em]">
                  <Link href={`/${t.categorySlug}/${t.slug}`} className="link-draw">
                    {t.name}
                  </Link>
                </p>
                <span className="mt-1 shrink-0 font-mono text-[12px] uppercase tracking-[0.06em] text-fg-subtle">
                  {t.kind}
                </span>
              </div>

              <p className="mt-2 line-clamp-3 text-[14px] leading-relaxed text-fg-muted">
                {t.blurb}
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {t.license ? <MetaChip label={t.license} /> : null}
                {t.cost ? <MetaChip label={costLabel(t.cost)} /> : null}
                {t.deployment ? <MetaChip label={deploymentLabel(t.deployment)} /> : null}
              </div>

              <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                <Link
                  href={`/${t.categorySlug}/${t.slug}`}
                  className="inline-flex min-h-9 items-center gap-1.5 text-[13.5px] font-medium text-fg-muted transition-colors hover:text-fg"
                >
                  Why or why not
                  <span aria-hidden="true" className="nudge">→</span>
                </Link>
                <a
                  href={`https://${t.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${t.name} — visit the project (opens in a new tab)`}
                  title={`Visit ${t.name} (opens in a new tab)`}
                  className="press grid h-9 w-9 place-items-center rounded-[var(--r-control)] text-fg-subtle transition-colors hover:bg-bg-sunken hover:text-fg"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M7 17 17 7M9 7h8v8" />
                  </svg>
                </a>
              </div>
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}

/** A datum, not a control: bordered pill, no hover, no tap target. */
function MetaChip({ label, swatch }: { label: string; swatch?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-elevated px-2.5 py-1 text-[12.5px] leading-none text-fg-muted">
      {swatch ? (
        <span
          aria-hidden="true"
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: swatch }}
        />
      ) : null}
      {label}
    </span>
  );
}

function costLabel(cost: string) {
  const labels: Record<string, string> = {
    free: "Free",
    "free-tier": "Free tier",
    "usage-based": "Usage-based",
    subscription: "Subscription",
  };
  return labels[cost] ?? cost;
}

function deploymentLabel(value: string) {
  const labels: Record<string, string> = {
    "self-hosted": "Self-hosted",
    managed: "Managed",
    saas: "SaaS",
  };
  return labels[value] ?? value;
}

/* ------------------------------------------------------------------ */
/* Facet row and chip                                                  */
/* ------------------------------------------------------------------ */

function FacetRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rail -mx-5 mt-3 items-center gap-1.5 scroll-px-5 px-5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:[mask-image:none]">
      <span className="mr-1 shrink-0 font-mono text-[12px] uppercase tracking-[0.08em] text-fg-subtle">
        {label}
      </span>
      {children}
    </div>
  );
}

function FacetChip({
  layer,
  ...rest
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  layer?: number | null;
  facetGroup?: string;
  facetValue?: string;
}) {
  return <FilterChip tickColor={layer != null ? layerColor(layer) : undefined} {...rest} />;
}
