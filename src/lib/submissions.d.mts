/**
 * Types for `submissions.mjs`.
 *
 * The module is plain `.mjs` rather than `.ts` because the triage workflow runs
 * it under bare `node` — no build step, no TypeScript runtime — which is the
 * same constraint that shapes `scripts/generate-awesome-list.mjs`.
 *
 * This declaration is what lets the `/submit` page and the tests treat it as a
 * typed module instead of `any`. It is a real interface rather than a loose one
 * on purpose: the difference between `SubmissionValues` and
 * `{ [k: string]: any }` is whether renaming a field in the template gets caught
 * by the compiler here or by a maintainer noticing an empty PR field later.
 */

export type Layer = {
  index: string;
  slug: string;
  title: string;
};

/** Everything the form asks for. Mirrors the `FIELDS` list in the module. */
export type SubmissionValues = {
  name: string;
  homepage: string;
  repository: string | null;
  proposedLayer: string;
  why: string;
  useWhen: string;
  skipWhen: string;
  notes: string | null;
};

/**
 * A parse result.
 *
 * `ok: false` carries *every* missing field rather than the first, so the
 * maintainer reports all of them in one comment instead of seven round trips.
 * `values` is on both arms because the failure message quotes what was filled in.
 */
export type ParseResult =
  | { ok: true; missing: []; values: SubmissionValues }
  | { ok: false; missing: string[]; values: Record<string, string | null> };

/** What the GitHub API reports. Every field may be null; null means unconfirmed. */
export type RepoFacts = {
  license: string | null;
  language: string | null;
  deployment: boolean | null;
  kind: string | null;
  archived: boolean;
  pushedAt: string | null;
  stars: number | null;
  isOrg: boolean | null;
  hasReleases: boolean | null;
};

/** The pull request a submission becomes. */
export type Draft = {
  slug: string;
  name: string;
  /** Null when the submitted layer did not resolve to one of the nine. */
  section: string | null;
  /** The `t(...)` row for `data.ts`. */
  dataBlock: string;
  /** The attributes entry for `attributes.ts`. */
  attrBlock: string;
  /** The reviewer's summary: what was filled, and what was deliberately not. */
  judge: string;
  /** Names already in the dataset that match this submission. */
  duplicates: string[];
  /** False while the layer is unresolved or the tool is already listed. */
  ready: boolean;
};

export const REPO: string;
export const SUBMISSION_LABEL: string;
export const ISSUE_TEMPLATE: string;
export const LAYERS: Layer[];
export const PR_TITLE_PREFIX: string;
export const NOT_READY_MARKER: string;
export const READY_MARKER: string;

export function parseSubmission(body: string): ParseResult | null;
export function isPlausibleUrl(value: string): boolean;
export function hostOf(url: string): string | null;
export function repoSlug(url: string): string | null;
export function resolveLayer(value: string): Layer | null;
export function branchFor(slug: string): string;
/**
 * The merge rule, shared with the workflow's gate. One copy on purpose: two
 * definitions of "may this merge" drift, and the drift publishes an unreviewed
 * entry rather than failing a check.
 */
export function isMergeable(draft: {
  section: string | null;
  duplicates: string[];
  dataBlock: string;
  attrBlock: string;
}): boolean;
export function factsFromRepo(
  repo: Record<string, unknown> | null,
  options?: { archived?: boolean; pushedAt?: string | null },
): RepoFacts;
export function draftEntry(
  submission: Extract<ParseResult, { ok: true }>,
  facts: RepoFacts,
  options?: { slug: string; existingNames?: string[] },
): Draft;