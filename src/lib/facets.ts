/**
 * Facet filtering for the tool index, as pure functions.
 *
 * This lives outside `tool-explorer.tsx` because the component is `"use client"`
 * and vitest runs in a node environment — logic inside it cannot be tested
 * without a DOM. The filtering is the part with real behaviour in it: OR within
 * a group, AND across groups, with counts that respect the *other* active
 * filters. That is subtle enough to be worth testing, and untestable-in-place is
 * the same as untested.
 *
 * Nothing here imports React or touches the DOM, so the component keeps only
 * the `useMemo`/`useCallback` wiring and the markup.
 */

/** One row of the index, as the client receives it. */
export type FacetRow = {
  slug: string;
  name: string;
  blurb: string;
  domain: string;
  kind: string;
  /** Specialisation display names, not ids. */
  roles: string[];
  deployment: string | null;
  license: string | null;
  language: string | null;
  cost: string;
  useWhen: string;
  skipWhen: string;
  categorySlug: string;
  categoryShort: string;
  layer: number | null;
};

/**
 * Facet dimensions, OR within a group and AND across groups.
 *
 * `roles` is first because it is the axis a reader arrives with — they know
 * their job before they know which layer they need — and every other facet here
 * is a property of the tool rather than of them.
 */
export const FACET_GROUPS = [
  { key: "roles", label: "Role", multi: true },
  { key: "deployment", label: "Deployment", multi: false },
  { key: "kind", label: "Kind", multi: false },
  { key: "cost", label: "Cost", multi: false },
] as const;

export type FacetKey = (typeof FACET_GROUPS)[number]["key"];

/** Single-valued keys only — the ones `valueOf` is allowed to index into. */
export type SingleFacetKey = Exclude<FacetKey, "roles">;

/**
 * Which selections are active.
 *
 * `section` lives alongside the facet groups rather than being a separate
 * argument because it is a filter like any other — it is just single-valued,
 * always exclusive, and rendered above the facet rows rather than inside one.
 */
export type FacetSelection = Partial<Record<FacetKey, ReadonlySet<string>>> & {
  section?: string | null;
};

const EMPTY_SET: ReadonlySet<string> = new Set();

/**
 * The value a single-valued facet tests a row against.
 *
 * `roles` never reaches here — it is a list, and `inGroup` handles it. The
 * fallback keeps a row with a missing attribute filterable as "unknown" rather
 * than dropping it out of every count silently.
 */
export function valueOf(row: FacetRow, key: SingleFacetKey): string {
  return row[key] ?? "unknown";
}

/**
 * Does a row satisfy the active selections in one group?
 *
 * Roles branch because they are multi-valued and OR across the selected set:
 * a tool tagged for Platform and Infra matches *either* selection, because the
 * question being asked is "show me what my job uses". Everything else is one
 * `Set.has`.
 */
export function inGroup(
  row: FacetRow,
  key: FacetKey,
  selected: ReadonlySet<string> = EMPTY_SET,
): boolean {
  if (!selected.size) return true;
  if (key === "roles") {
    for (const role of selected) if (row.roles.includes(role)) return true;
    return false;
  }
  return selected.has(valueOf(row, key));
}

/** Rows surviving the text query and the section filter, ignoring facets. */
export function textAndSectionMatches(
  rows: readonly FacetRow[],
  query: string,
  section: string | null,
): FacetRow[] {
  return rows.filter((row) => {
    if (section && row.categorySlug !== section) return false;
    return matchesQuery(row, query);
  });
}

/**
 * The pool a group's counts are drawn from.
 *
 * `skip` is the group being counted: its own selections are excluded, otherwise
 * every count would collapse to the size of the current selection and the
 * numbers beside the unselected options would say nothing about what picking
 * them would yield.
 */
export function poolFor(
  rows: readonly FacetRow[],
  selection: FacetSelection,
  skip: FacetKey | "section",
): FacetRow[] {
  return rows.filter((row) => {
    if (skip !== "section" && selection.section && row.categorySlug !== selection.section) {
      return false;
    }
    for (const g of FACET_GROUPS) {
      if (g.key === skip) continue;
      if (!inGroup(row, g.key, selection[g.key])) return false;
    }
    return true;
  });
}

export type FacetOption = {
  group: FacetKey;
  label: string;
  value: string;
  count: number;
};

/**
 * Facet options with counts.
 *
 * `roleOrder` is passed in rather than imported so the vocabulary order stays a
 * parameter: the caller derives it from `ROLES`, and this module stays free of
 * the role definitions. Options come out in vocabulary order for roles and
 * count order for the rest, which is what the existing UI already did.
 */
export function facetOptions(
  rows: readonly FacetRow[],
  selection: FacetSelection,
  roleOrder: readonly string[],
): FacetOption[] {
  const out: FacetOption[] = [];

  for (const g of FACET_GROUPS) {
    if (g.multi) {
      const counts = new Map<string, number>();
      for (const row of poolFor(rows, selection, g.key)) {
        for (const role of row.roles) counts.set(role, (counts.get(role) ?? 0) + 1);
      }
      // Vocabulary order, not count order: the roles are a fixed set and the
      // reader is looking for their own, so alphabetical would be arbitrary and
      // count-sorted would shuffle as the dataset grows.
      for (const role of roleOrder) {
        const count = counts.get(role);
        if (count) out.push({ group: g.key, label: role, value: role, count });
      }
      continue;
    }
    const key = g.key as SingleFacetKey;
    const counts = new Map<string, number>();
    for (const row of poolFor(rows, selection, key)) {
      const value = valueOf(row, key);
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    for (const [value, count] of [...counts].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    )) {
      out.push({ group: key, label: value, value, count });
    }
  }
  return out;
}

/** How many filters are active, for the "Clear (n)" affordance. */
export function activeFilterCount(selection: FacetSelection): number {
  return (
    FACET_GROUPS.reduce((n, g) => n + (selection[g.key]?.size ?? 0), 0) +
    (selection.section ? 1 : 0)
  );
}

/**
 * Free-text match over the fields a reader might type.
 *
 * Roles are included, which is the point of the axis: someone who knows their
 * job types "infra" or "platform", not a tool name.
 */
export function matchesQuery(row: FacetRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    row.name.toLowerCase().includes(q) ||
    row.blurb.toLowerCase().includes(q) ||
    row.domain.toLowerCase().includes(q) ||
    row.useWhen.toLowerCase().includes(q) ||
    row.skipWhen.toLowerCase().includes(q) ||
    (row.license?.toLowerCase().includes(q) ?? false) ||
    (row.language?.toLowerCase().includes(q) ?? false) ||
    row.roles.some((r) => r.toLowerCase().includes(q))
  );
}