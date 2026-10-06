/**
 * Facet selection ↔ query string, for the `/all` explorer.
 *
 * ## Why this exists
 *
 * `stack-builder.tsx` writes its state to the URL on every change, so a stack is
 * a link you can send to a colleague. The explorer did not, and that is an
 * asymmetry rather than a design choice: for a directory whose entire argument is
 * findability, "the 24 tools an ML platform engineer owns that are free and
 * self-hosted" is the single most linkable claim the site can make, and it could
 * not be expressed as a URL. Nothing about that view was citable.
 *
 * ## Why it is not `search-filters.ts`
 *
 * That module parses the query surface's flat `?cost=free&cost=usage-based`
 * form, where each axis is a set and only tools carry the tool-only facets. This
 * one round-trips a `FacetSelection` — nested, section-aware, with an
 * `expanded` UI map that must *not* travel — and it is used by a React
 * component on mount. Different job, different shape; sharing the key names is
 * the only thing they should have in common, and that is asserted below.
 *
 * ## What is not encoded
 *
 * `expanded` is which facet rows are open. It is view state, not a filter, and
 * encoding it would make every collapsed row part of the URL. Kept out.
 */

import { FACET_GROUPS, type FacetKey, type FacetSelection } from "./facets";

/**
 * Query keys, one per facet group plus the section.
 *
 * Spelled the same as the `/api/search` parameters so a reader who learns one
 * surface has learned the other — and so a link can be moved between them with
 * a change of path.
 */
export const FACET_KEYS: Record<FacetKey, string> = {
  roles: "role",
  deployment: "deployment",
  kind: "kind",
  cost: "cost",
};

const SECTION_KEY = "section";
const QUERY_KEY = "q";

/** An empty selection, in the shape `decodeFacetSelection` returns. */
export const EMPTY_SELECTION: FacetSelection = { section: null };

/**
 * Read a selection out of a query string.
 *
 * Tolerant by design: an unknown group, an unknown value or a hand-edited URL all
 * produce a selection the UI can render rather than an error. The values are not
 * checked against a vocabulary here — `facetOptions` only emits options that
 * exist, so an unknown value simply selects nothing visible. That is the right
 * failure: a stale link showing the unfiltered list beats a crash, and it still
 * shows a non-empty `?` that tells the reader something was meant.
 */
export function decodeFacetSelection(search: string): FacetSelection {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);

  const selection: FacetSelection = { section: null };

  const section = params.get(SECTION_KEY);
  if (section) selection.section = section;

  for (const group of FACET_GROUPS) {
    // `getAll`, so `?role=platform&role=infra` is the OR a reader means. With
    // `get` the second value would silently replace the first and the facet row
    // would show one chip lit for a link that selected two.
    const values = params
      .getAll(FACET_KEYS[group.key])
      .map((v) => v.trim())
      .filter(Boolean);
    if (values.length) selection[group.key] = new Set(values);
  }

  return selection;
}

/** The free-text query, or an empty string. */
export function decodeFacetQuery(search: string): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return params.get(QUERY_KEY) ?? "";
}

/**
 * Serialise a selection, omitting anything at its default.
 *
 * Omitting rather than emitting empty values is what keeps the URL of an
 * unfiltered `/all` equal to `/all`: a page that rewrote its own canonical with
 * `?role=&cost=` on load would make the canonical and the visible state disagree
 * before the reader had touched anything.
 */
export function encodeFacetSelection(
  query: string,
  selection: FacetSelection,
): string {
  const params = new URLSearchParams();

  const q = query.trim();
  if (q) params.set(QUERY_KEY, q);

  if (selection.section) params.set(SECTION_KEY, selection.section);

  for (const group of FACET_GROUPS) {
    const set = selection[group.key];
    if (!set?.size) continue;
    // Sorted so the same selection always produces the same URL. Without it,
    // `replaceState` on every keystroke would shuffle the parameter order and
    // churn the history entry for no reason.
    for (const value of [...set].sort()) params.append(FACET_KEYS[group.key], value);
  }

  return params.toString();
}

/** Does this selection filter anything? */
export function isEmptySelection(selection: FacetSelection): boolean {
  if (selection.section) return false;
  return FACET_GROUPS.every((g) => !(selection[g.key]?.size ?? 0));
}