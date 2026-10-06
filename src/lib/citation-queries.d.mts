/**
 * Types for `citation-queries.mjs`.
 *
 * Plain `.mjs` because `scripts/cite-check.mjs` imports it under bare node with
 * no build step, which is the same constraint that shapes `submissions.mjs`. This
 * declaration is what lets the test file treat it as typed rather than `any`.
 */

export type Claim =
  | "layer-ordering"
  | "skip-when"
  | "freshness"
  | "neutrality"
  | "cross-layer"
  | "symptom"
  | "definition";

export type ClaimMeta = {
  title: string;
  note: string;
};

/** One tracked query. */
export type CitationQuery = {
  /** Stable 1-based id. Never renumber — the monthly log references these. */
  id: number;
  /** The query exactly as a reader would type it. No brand names, no site names. */
  query: string;
  /**
   * The page on this site that should answer it, or `""` where none does.
   *
   * An empty target is a content gap rather than a ranking loss, and the two need
   * different responses — writing a page versus improving an existing one.
   */
  target: string;
  claim: Claim;
};

export const CLAIMS: Record<Claim, ClaimMeta>;
export const CITATION_QUERIES: CitationQuery[];
export const SKIP_WHEN_QUERIES: CitationQuery[];
export const ALL_QUERIES: CitationQuery[];
export const CLAIM_IDS: string[];