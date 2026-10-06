/**
 * Facet filters for the search corpus, as pure functions.
 *
 * ## Why this is not in `search.ts`
 *
 * `search.ts` answers "which entries match these words". This answers the
 * orthogonal question "of the entries that matched, which ones are the shape I
 * asked for". Split because the ranking function is shared by the palette, the
 * MCP server and `/api/search`, while the filters are only ever applied on the
 * query surface — putting them in `search.ts` would put a concept the palette
 * never uses next to the tiers, and the palette already does this filtering
 * better in `facets.ts` against the whole dataset.
 *
 * ## Why the filters are not the same shape as `facets.ts`
 *
 * `facets.ts` ORs within a group and ANDs across groups, over the flat tool
 * rows. This is a query string: `?cost=free&cost=usage-based` is a set, and it
 * has to survive a URL. So each filter here is a *set of accepted values*,
 * `undefined` meaning "no constraint on this axis", and the semantics are
 * AND across axes, OR within one — the same rule, arrived at from the other
 * direction.
 *
 * ## What happens to a non-tool entry
 *
 * Essays, symptom guides, comparisons and alternatives pages have no
 * `kind`, `deployment` or `cost` — they are not tools. Applying `cost=free`
 * therefore *excludes* them rather than letting them through unfiltered, because
 * "free tools that also explain evals" is not what the query asked for. The
 * exception is `layer` and `section`, which every entry has, because those
 * describe where a page sits rather than what kind of thing it is.
 */

import type { SearchEntry } from "./search";

/**
 * The controlled facet fields carried on tool entries only.
 *
 * A separate object rather than more top-level fields on `SearchEntry` because
 * these are the *filterable* values: `kind` here is the closed `ToolKind`
 * vocabulary, whereas `SearchEntry.tag` is the display label the palette shows
 * and is set on essays too. Conflating the two would mean a filter on
 * `kind=reading` could match an essay whose tag happens to say "reading".
 */
export type SearchFacets = {
  /** Section slug. Present on every entry, not just tools. */
  section: string;
  /** Stack depth. Present on every entry, not just tools. */
  layer: number | null;
  /** Role *ids*, not display names — this is a machine surface. */
  roles: readonly string[];
  kind: string;
  deployment: string | null;
  cost: string;
};

/** One axis: no constraint, or a set of accepted values. */
export type FilterSpec = ReadonlySet<string> | undefined;

/** Every filter axis, all optional. */
export type EntryFilters = {
  layer?: FilterSpec;
  section?: FilterSpec;
  role?: FilterSpec;
  kind?: FilterSpec;
  deployment?: FilterSpec;
  cost?: FilterSpec;
};

export const FILTER_KEYS = [
  "layer",
  "section",
  "role",
  "kind",
  "deployment",
  "cost",
] as const;

export type FilterKey = (typeof FILTER_KEYS)[number];

/** Is any axis constrained at all? */
export function hasAnyFilter(filters: EntryFilters): boolean {
  return FILTER_KEYS.some((k) => (filters[k]?.size ?? 0) > 0);
}

/** The number of axes carrying a constraint, for echoing back in a response. */
export function activeFilterCount(filters: EntryFilters): number {
  return FILTER_KEYS.reduce((n, k) => n + (filters[k]?.size ?? 0), 0);
}

/**
 * Read one axis out of a `URLSearchParams` into a set.
 *
 * `getAll` rather than `get` so `?cost=free&cost=usage-based` means the OR a
 * reader expects rather than the last one winning. An empty or whitespace-only
 * value collapses to "no constraint" — `?cost=` is a hand-edited URL, and the
 * useful behaviour is to ignore the filter rather than return nothing.
 */
export function parseFilterParam(params: URLSearchParams, key: string): Set<string> | undefined {
  const out = new Set<string>();
  for (const raw of params.getAll(key)) {
    const value = raw.trim().toLowerCase();
    if (value) out.add(value);
  }
  return out.size ? out : undefined;
}

/** Parse every axis off a query string. */
export function parseFilters(params: URLSearchParams): EntryFilters {
  const filters: EntryFilters = {};
  for (const key of FILTER_KEYS) {
    filters[key] = parseFilterParam(params, key);
  }
  return filters;
}

/**
 * Does one entry satisfy every constrained axis?
 *
 * `layer` and `section` read off the entry itself, because every entry has
 * them. The rest read off `facets`, which only tool entries carry — hence the
 * "unconstrained means pass" guard above each one. A constrained axis with no
 * facets to test against is a filter that cannot match, and returning `true`
 * there would silently ignore the caller's constraint, which is the exact
 * failure mode this whole module exists to avoid.
 */
export function matchesFilters(entry: SearchEntry, filters: EntryFilters): boolean {
  if (filters.layer?.size && !filters.layer.has(String(entry.categoryLayer))) {
    return false;
  }
  if (filters.section?.size) {
    // A tool entry's own section is authoritative; fall back to the facet object
    // rather than parsing `categoryTitle`, which is a display string.
    const section = entry.facets?.section;
    if (!section || !filters.section.has(section)) return false;
  }
  if (!entry.facets) {
    // Non-tool entry. `layer` was already tested above; the tool-only axes have
    // nothing to test, so any constraint on them excludes this entry.
    return !(
      (filters.role?.size ?? 0) > 0 ||
      (filters.kind?.size ?? 0) > 0 ||
      (filters.deployment?.size ?? 0) > 0 ||
      (filters.cost?.size ?? 0) > 0
    );
  }

  const f = entry.facets;
  if (filters.role?.size && !filters.role.has("")) {
    // Roles are multi-valued: a tool tagged Platform and Infra matches either
    // selection, which is the same OR-within-a-group rule `facets.ts` uses.
    let hit = false;
    for (const role of f.roles) {
      if (filters.role.has(role)) {
        hit = true;
        break;
      }
    }
    if (!hit) return false;
  }
  if (filters.kind?.size && !filters.kind.has(f.kind)) return false;
  if (filters.deployment?.size) {
    if (!f.deployment || !filters.deployment.has(f.deployment)) return false;
  }
  if (filters.cost?.size && !filters.cost.has(f.cost)) return false;
  return true;
}

/**
 * Every controlled value the shipped corpus actually carries, per axis.
 *
 * Published so `/api/search` can echo the legal values back to a caller who
 * guessed wrong, and so a test can assert the filter vocabulary against the
 * dataset instead of against a hand-copied list — which is how the role
 * validator in `roles.test.ts` was found to be checking five ids when the
 * vocabulary had six.
 */
export function filterVocabulary(entries: readonly SearchEntry[]) {
  const roles = new Set<string>();
  const kind = new Set<string>();
  const deployment = new Set<string>();
  const cost = new Set<string>();
  const layer = new Set<string>();
  const section = new Set<string>();

  for (const entry of entries) {
    if (entry.categoryLayer != null) layer.add(String(entry.categoryLayer));
    const f = entry.facets;
    if (!f) continue;
    for (const r of f.roles) roles.add(r);
    kind.add(f.kind);
    if (f.deployment) deployment.add(f.deployment);
    cost.add(f.cost);
    section.add(f.section);
  }

  // Keyed by the *filter* names, not by the field names on the entry — so the
  // vocabulary a caller reads back is spelled exactly as the query parameter
  // they would pass it under. Publishing `roles` here while the parameter is
  // `role` is the kind of small mismatch that costs a caller a round trip.
  return {
    layer: [...layer].sort((a, b) => Number(a) - Number(b)),
    section: [...section].sort(),
    role: [...roles].sort(),
    kind: [...kind].sort(),
    deployment: [...deployment].sort(),
    cost: [...cost].sort(),
  };
}

/** Apply every axis to the corpus, preserving order. */
export function applyFilters<T extends { entry: SearchEntry }>(
  index: readonly T[],
  filters: EntryFilters,
): T[] {
  if (!hasAnyFilter(filters)) return index as T[];
  return index.filter((row) => matchesFilters(row.entry, filters));
}