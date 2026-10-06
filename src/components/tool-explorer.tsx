"use client";

import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { layerStyle } from "@/lib/layer";
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

/**
 * Role display names in vocabulary order.
 *
 * Derived from ROLES on the client rather than shipped in the payload: it is
 * five strings, the module is already in the client bundle for the facet row,
 * and a second copy in the RSC payload is a second thing to keep in step.
 */
const ROLE_ORDER = ROLES.map((r) => r.title);

/** The client row shape. Aliases the tested type rather than restating it. */
export type ToolEntry = FacetRow & {
  name: string;
  useWhen: string;
  skipWhen: string;
  categoryTitle: string;
};

type GroupKey = FacetKey;

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
  /**
   * Initial state read from the URL, so a shared link opens on the view it
   * describes. `useState`'s lazy initialiser runs once per mount, so a
   * `popstate` is handled by the effect below rather than by re-running it.
   *
   * Read in a client component rather than from a `searchParams` prop because
   * `/all` is prerendered — awaiting `searchParams` would make it dynamic and
   * trade a static page for one that can only be rendered per request.
   */
  const [query, setQuery] = useState(() =>
    typeof window === "undefined" ? "" : decodeFacetQuery(window.location.search),
  );
  const [selection, setSelection] = useState<FacetSelection>(() =>
    typeof window === "undefined"
      ? EMPTY_SELECTION
      : decodeFacetSelection(window.location.search),
  );
  const [expanded, setExpanded] = useState<Partial<Record<GroupKey, boolean>>>({});

  const section = selection.section ?? null;
  const selected = selection;

  /**
   * The filter input updates immediately while the row list it drives is
   * derived from a deferred copy of the query. Each keystroke is a discrete
   * interaction and INP is scored on the paint that follows it, so the character
   * has to land first and the re-render of up to 113 rows can trail behind it.
   * Without this the whole list reconciles inside the keystroke's own frame.
   */
  const deferredQuery = useDeferredValue(query);

  const textMatch = useMemo(
    () => textAndSectionMatches(tools, deferredQuery, null),
    [tools, deferredQuery],
  );

  /**
   * Which rows survive every *other* group, used to count each group's options.
   *
   * The `{ section, ...selected }` object is rebuilt on each render rather than
   * memoised, because the memos downstream are what make it worth not
   * recomputing, and an identity-stable selection object would need its own
   * dependency list to be correct. It is a shallow copy of a handful of keys.
   */
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

  const results = useMemo(() => poolForGroup("section"), [poolForGroup]);

  const activeCount = activeFilterCount({ section, ...selected });

  /** Every live constraint as a removable chip, for the empty state. */
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
   * Mirror the selection into the URL.
   *
   * `replaceState` rather than `pushState`, deliberately: typing a filter should
   * not fill the back button with one entry per keystroke, which is the
   * behaviour a reader would describe as "the back button is broken". The cost
   * is that Back leaves `/all` rather than undoing the last chip — and the
   * alternative is worse, so this is the trade.
   *
   * A no-op when the URL already says this, so the first render does not push a
   * history entry for state the reader did not choose.
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
      {/* Solid rather than `bg-bg/90 backdrop-blur-md`. This bar is sticky above a
          list of 113 rows, so it is exactly the case backdrop-filter is worst
          at: every scroll frame changes the content behind it, forcing a blur
          of the whole bar. At 90% opacity that blur is barely perceptible, and
          the rows scrolling under it are the point. */}
      <div className="sticky top-14 z-30 -mx-5 mb-6 border-b border-border bg-bg px-5 py-3 sm:-mx-6 sm:px-6">
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
              onKeyDown={(e) => {
                if (e.key === "Escape" && query) setQuery("");
              }}
              placeholder="Filter by name, description or use-case…"
              aria-label="Filter tools"
              // A soft accent halo on focus in place of the browser ring — the
              // field is already outlined, so a second hard outline doubles it.
              className="h-10 w-full rounded-lg border border-border bg-bg-elevated pl-8 pr-9 text-[14px] shadow-ink outline-none transition-[box-shadow,border-color] duration-200 placeholder:text-fg-subtle focus:border-border-strong focus:shadow-[0_0_0_4px_var(--selection)] focus-visible:outline-none sm:h-9 sm:text-[13.5px]"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Empty the filter text"
                className="press absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-fg-subtle hover:bg-bg-sunken hover:text-fg"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            ) : null}
          </div>

          {query || activeCount ? (
            <button
              type="button"
              onClick={clearAll}
              className="press h-10 rounded-lg border border-border px-3 text-[13px] text-fg-muted hover:border-border-strong hover:bg-bg-sunken hover:text-fg sm:h-9"
            >
              Clear{activeCount ? ` (${activeCount})` : ""}
            </button>
          ) : null}

          <span aria-live="polite" className="min-w-[3.5rem] text-right font-mono text-[11px] text-fg-subtle">
            {results.length}
            {results.length === tools.length ? "" : ` / ${tools.length}`}
          </span>
        </div>

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

        {FACET_GROUPS.map((g) => {
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
                  facetGroup={g.key}
                  facetValue={f.value}
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
        <EmptyState
          query={query}
          active={activeChips}
          onClearQuery={() => setQuery("")}
          onRemove={(group, value) =>
            group === "section" ? pickSection(null) : toggle(group, value)
          }
          onReset={clearAll}
        />
      ) : (
        <ul className="space-y-px">
          {results.map((t) => (
            <li key={`${t.categorySlug}-${t.slug}`}>
              <div className="group -mx-2 flex items-start gap-3 rounded-lg px-2 py-3 transition-colors duration-200 hover:bg-bg-sunken sm:py-2.5">
                <span
                  aria-hidden="true"
                  className="mt-1 h-8 w-[3px] shrink-0 rounded-full transition-[width] duration-300 ease-[var(--ease-spring)] group-hover:w-[5px]"
                  style={layerStyle(t.layer)}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <Link
                      href={`/${t.categorySlug}/${t.slug}`}
                      className="link-draw truncate text-[14px] font-medium"
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
                  {/* A compact marker, not a second list entry: the explorer
                      answers "where does this live" and the honest answer is
                      "here, and there too". The reason for the second home is on
                      the tool page, which has room for it. */}
                  {t.secondHomes?.length ? (
                    <span className="mt-1 block font-mono text-[10.5px] text-fg-subtle">
                      also in {t.secondHomes.join(", ")}
                    </span>
                  ) : null}
                </span>
                <a
                  href={`https://${t.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${t.name} (opens in a new tab)`}
                  className="press mt-0.5 shrink-0 rounded p-1.5 text-fg-subtle hover:bg-bg hover:text-fg focus-visible:opacity-100 sm:p-0.5 sm:opacity-0 sm:group-hover:opacity-100"
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

// The filtering logic — `valueOf`, `inGroup`, `matchesQuery`, the pool and the
// facet counts — now lives in `@/lib/facets`, where it can be tested without a
// DOM. This component keeps only the wiring and the markup.

/**
 * One facet axis. On a phone it is a single swipeable rail rather than a
 * wrapped block — five axes wrapping to three lines each pushed the first
 * result below the fold of a 390px screen, under a sticky bar. From `sm` up
 * there is room to wrap, so it does.
 */
function FacetRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rail -mx-5 mt-2 items-center gap-1 scroll-px-5 px-5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:[mask-image:none]">
      <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
        {label}
      </span>
      {children}
    </div>
  );
}

/**
 * The zero-result state. A dead end is the worst outcome of a filter UI, so
 * this names exactly what is narrowing the list and lets each constraint be
 * dropped on its own — usually one chip is the culprit, and resetting all of
 * them throws away the rest of the reader's intent.
 */
function EmptyState({
  query,
  active,
  onClearQuery,
  onRemove,
  onReset,
}: {
  query: string;
  active: Array<{ group: GroupKey | "section"; value: string; label: string }>;
  onClearQuery: () => void;
  onRemove: (group: GroupKey | "section", value: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="crop crop-static mx-auto my-10 max-w-md rounded-xl border border-dashed border-border-strong px-6 py-10 text-center [--crop-inset:-6px]">
      {/* An empty slot in the stack, drawn: three layers with the middle
          one missing. */}
      <svg width="56" height="44" viewBox="0 0 56 44" fill="none" aria-hidden="true" className="mx-auto text-fg-subtle">
        <rect x="4" y="2" width="48" height="10" rx="2" fill="currentColor" opacity="0.18" />
        <rect x="4.5" y="17.5" width="47" height="9" rx="2" stroke="currentColor" strokeDasharray="3 3" />
        <rect x="4" y="32" width="48" height="10" rx="2" fill="currentColor" opacity="0.18" />
      </svg>
      <p className="mt-5 font-serif text-[20px] font-medium tracking-[-0.01em] text-fg">
        No tool fills that slot.
      </p>
      <p className="mx-auto mt-2 max-w-[36ch] text-pretty text-[13px] leading-relaxed text-fg-muted">
        Every tool here is ruled out by at least one constraint. Drop the one
        that matters least:
      </p>
      <ul className="mt-5 flex flex-wrap justify-center gap-1.5">
        {query ? (
          <li>
            <button
              type="button"
              onClick={onClearQuery}
              className="press group inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elevated px-2 py-1 text-[12px] text-fg-muted hover:border-border-strong hover:text-fg"
            >
              <span className="font-mono text-[10px] text-fg-subtle">text</span>
              &ldquo;{query}&rdquo;
              <span aria-hidden="true" className="text-fg-subtle transition-transform group-hover:rotate-90">×</span>
              <span className="sr-only">(remove)</span>
            </button>
          </li>
        ) : null}
        {active.map((a) => (
          <li key={`${a.group}-${a.value}`}>
            <button
              type="button"
              onClick={() => onRemove(a.group, a.value)}
              className="press group inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elevated px-2 py-1 text-[12px] text-fg-muted hover:border-border-strong hover:text-fg"
            >
              <span className="font-mono text-[10px] text-fg-subtle">{a.group}</span>
              {a.label}
              <span aria-hidden="true" className="text-fg-subtle transition-transform group-hover:rotate-90">×</span>
              <span className="sr-only">(remove)</span>
            </button>
          </li>
        ))}
      </ul>
      {/* Named "Reset", not "Clear": the toolbar's Clear button stays the one
          control by that name. */}
      <button
        type="button"
        onClick={onReset}
        className="btn-paper mt-6 inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[13px] font-medium"
      >
        Reset every filter
      </button>
    </div>
  );
}

function FacetChip({
  active,
  onClick,
  label,
  count,
  layer,
  facetGroup,
  facetValue,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  layer?: number | null;
  /**
   * The facet axis and value this chip selects, as `data-` attributes.
   *
   * Not styling hooks. The accessible name is `${label} ${count}` — "Free 77" —
   * which collides: `free` and `free-tier` both start with "Free", so a
   * name-based selector matches two chips and fails in strict mode. The browser
   * tests need to address one facet deterministically, and there is no role or
   * ARIA attribute that distinguishes them without also changing what a screen
   * reader announces.
   */
  facetGroup?: string;
  facetValue?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      {...(facetGroup && facetValue
        ? { "data-facet": facetGroup, "data-facet-value": facetValue }
        : {})}
      className={`press inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2 py-1 text-[12px] sm:min-h-0 ${
        active
          ? "border-transparent bg-bg-elevated text-fg shadow-lift"
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
      <span
        className={`font-mono text-[10px] transition-colors ${active ? "text-fg-muted" : "text-fg-subtle"}`}
      >
        {count}
      </span>
    </button>
  );
}
