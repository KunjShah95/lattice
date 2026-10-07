/**
 * The compare builder's shareable state: up to three tool ids in the query string.
 *
 * Same principle as the Stack Builder (`stack-url.ts`): no account, no storage, the
 * URL is the save. A comparison is a link a colleague can open and see the same
 * table, which is the only reason to build it as a page and not as a modal.
 *
 * An id is `<section-slug>/<tool-slug>` — the tool's canonical path without the
 * leading slash — so the link is legible, survives a rename of the display name,
 * and is the same string the sitemap and the citation feed already use.
 */

export const MAX_COMPARE = 3;

/** `?tools=a/b,c/d`, or an empty string for no selection. Ids are slugs, so nothing needs escaping. */
export function encodeCompare(ids: string[]): string {
  const clean = dedupe(ids).slice(0, MAX_COMPARE);
  return clean.length ? `tools=${clean.join(",")}` : "";
}

/**
 * Parse a query string back into ids, keeping only ones that exist.
 *
 * `valid` is the set of real ids, so a hand-edited or stale link (a tool that was
 * renamed, a typo) degrades to the part of it that still resolves rather than
 * throwing or rendering a column of nothing. Order is the order in the URL — the
 * reader chose it — and duplicates and anything past the cap are dropped.
 */
export function decodeCompare(search: string, valid: ReadonlySet<string>): string[] {
  const p = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const raw = p.get("tools");
  if (!raw) return [];
  return dedupe(raw.split(",").map((s) => s.trim()))
    .filter((id) => valid.has(id))
    .slice(0, MAX_COMPARE);
}

/**
 * Starting points, so the page is never a blank search box. One same-layer pair
 * (where the differing rows are the decision) and two across layers (the case no
 * vendor will publish). Editorial, so each is guarded by a test against the dataset:
 * a renamed tool must fail a build rather than ship a link that opens an empty table.
 */
export const COMPARE_EXAMPLES: ReadonlyArray<{ label: string; ids: string[] }> = [
  {
    label: "Two inference runtimes",
    ids: ["inference-serving/vllm", "inference-serving/sglang"],
  },
  {
    label: "Two vector stores",
    ids: ["retrieval-vector-stores/qdrant", "retrieval-vector-stores/pgvector"],
  },
  {
    label: "A gateway against an eval platform",
    ids: ["routing-gateways/litellm", "evaluation-observability/langfuse"],
  },
];

function dedupe(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}
