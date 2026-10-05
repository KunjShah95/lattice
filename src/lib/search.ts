/**
 * What a search hit is. Tools are the bulk of the index, but the essays and
 * the comparisons are where the site's actual argument lives — a query for
 * "evals" that only returns tools is hiding the best answer on the site.
 */
export type SearchKind = "tool" | "essay" | "comparison";

/**
 * One row in the search index. Deliberately flattened rather than a union of
 * three shapes: the ranking below reads name / blurb / category / tag / domain
 * for every kind, and a discriminated union would just push the branching
 * into the scoring function.
 *
 * `name` is the display label and the strongest matching signal, whatever the
 * underlying thing is. For a tool that is its name; for an essay, its title.
 */
export type SearchEntry = {
  kind: SearchKind;
  /** Display label and primary match field. */
  name: string;
  /** Secondary line shown under the label. */
  blurb: string;
  /** Owning section, used for the category line and the accent rule. */
  categoryTitle: string;
  /** Stack depth for the accent. Null renders muted. */
  categoryLayer: number | null;
  /** Internal route — every hit has one, so the palette always navigates. */
  href: string;
  /** Present on tools only: the tool's own site, opened in a new tab. */
  external?: string;
  /** Host for tools, tag for everything. */
  domain?: string;
  tag?: string;
  /**
   * Tools only: the specialisations this tool belongs to, as display strings.
   *
   * Flattened into `haystack` so "platform" and "infra" both find the right
   * tools, which is the whole reason for the axis — a reader arrives knowing
   * their job, not the name of the thing they need.
   */
  roles?: string[];
  /**
   * Tools only: display titles of the sections this tool also serves.
   *
   * Matched the same way roles are — declared fields rather than incidental
   * prose — so typing a layer name finds the tools that reach it even when that
   * layer is not where they are indexed.
   */
  alsoIn?: string[];
};

/** @deprecated Retained so existing imports keep working during the rename. */
export type SearchableTool = SearchEntry;

type IndexedTool = {
  entry: SearchEntry;
  name: string;
  /** Individual words in the name, so "guard" can find "Llama Guard". */
  nameWords: string[];
  domain: string;
  blurb: string;
  category: string;
  tag: string;
  /** Lowercased role display names, or empty for non-tool entries. */
  roles: string[];
  /** Lowercased second-home section titles, or empty for non-tool entries. */
  alsoIn: string[];
  /** All fields joined once, for the single-pass fuzzy scan. */
  haystack: string;
};

/**
 * Score bands. A stronger signal always outranks a weaker one regardless of
 * name length, so a tool literally called "TensorRT-LLM" beats one that merely
 * mentions LLMs in its blurb.
 */
const TIER = {
  exactName: 100_000,
  namePrefix: 90_000,
  nameWordPrefix: 80_000,
  tagExact: 60_000,
  namePhrase: 50_000,
  domainPrefix: 45_000,
  /** A contiguous phrase in the blurb. This is the signal that used to be
   *  missing entirely, which is why "rag" failed to find the one tool whose
   *  description literally contains "RAG". */
  blurbPhrase: 40_000,
  categoryPhrase: 30_000,
  tagPhrase: 25_000,
  /**
   * A word of a role display name ("platform", "infra", "data"). Above the fuzzy
   * tier because a role is a declared field rather than incidental prose, and
   * because a fuzzy scan cannot find it: the span gate rejects "platform" against
   * a blurb where the letters happen to appear scattered, which is most of them.
   * Still below every phrase match — typing "data" should not outrank a tool
   * whose description says it.
   */
  roleWord: 22_000,
  domainPhrase: 20_000,
  /** Fuzzy fallback sits an order of magnitude below every real match so it
   *  can never outrank an actual hit. */
  fuzzy: 10_000,
} as const;

/** Below this, a fuzzy match is more likely to be noise than intent. */
const MIN_FUZZY_QUERY = 2;

/**
 * Lowercase and pre-split every entry once, at module load.
 *
 * This is what makes each keystroke linear: without it, every keystroke
 * re-lowercased all 73 blurbs just to throw the work away.
 */
export function buildIndex(entries: SearchableTool[]): IndexedTool[] {
  return entries.map((entry) => {
    const name = entry.name.toLowerCase();
    const domain = (entry.domain ?? "").toLowerCase();
    const blurb = entry.blurb.toLowerCase();
    const category = entry.categoryTitle.toLowerCase();
    const tag = (entry.tag ?? "").toLowerCase();
    const roles = (entry.roles ?? []).map((r) => r.toLowerCase());
    const alsoIn = (entry.alsoIn ?? []).map((s) => s.toLowerCase());

    return {
      entry,
      name,
      nameWords: name.split(/[\s\-_/.]+/).filter(Boolean),
      domain,
      blurb,
      category,
      tag,
      roles,
      alsoIn,
      // Roles and second homes also ride along in the fuzzy haystack, so
      // "infra engineer" and "guardrails layer" still reach them through the
      // fallback.
      haystack: `${name} ${tag} ${domain} ${category} ${blurb} ${roles.join(" ")} ${alsoIn.join(" ")}`,
    };
  });
}

/**
 * Subsequence match in a single pass over the haystack — O(len(haystack)),
 * not the O(m·n) restart-per-character scan this replaces.
 *
 * Returns 0 unless every query character appears in order *and* the span it
 * covers is tight. That span gate is what stops "vllm" from matching
 * Braintrust: a real match lands within a few characters, scattered matches
 * sprawl across the whole sentence.
 */
function fuzzyScore(haystack: string, q: string): number {
  let qi = 0;
  let first = -1;
  let last = -1;

  for (let hi = 0; hi < haystack.length && qi < q.length; hi++) {
    if (haystack[hi] === q[qi]) {
      if (first === -1) first = hi;
      last = hi;
      qi++;
    }
  }

  if (qi < q.length) return 0;

  const span = last - first + 1;
  if (span > q.length * 2) return 0;

  return Math.round(1000 * (q.length / span));
}

function scoreTerm(it: IndexedTool, q: string): number {
  // Within a band, shorter names win — "TRL" before "TensorRT-LLM".
  const brevity = Math.min(it.name.length, 999);

  if (it.name === q) return TIER.exactName;
  if (it.name.startsWith(q)) return TIER.namePrefix - brevity;
  if (it.nameWords.some((w) => w.startsWith(q))) return TIER.nameWordPrefix - brevity;
  if (it.tag && it.tag === q) return TIER.tagExact;
  if (it.name.includes(q)) return TIER.namePhrase - brevity;
  if (it.domain.startsWith(q)) return TIER.domainPrefix;
  if (it.blurb.includes(q)) return TIER.blurbPhrase - brevity;
  if (it.category.includes(q)) return TIER.categoryPhrase;
  if (it.tag && it.tag.includes(q)) return TIER.tagPhrase;
  // Word-prefix, so "infra" finds "AI Infrastructure" and "prod" does not
  // silently match "Production & Governance" — that would make a typo look like
  // a confident result.
  if (it.roles.some((r) => r.split(/\s+/).some((w) => w.startsWith(q))))
    return TIER.roleWord - brevity;
  // Same tier as roles, for the same reason: a second home is a declared
  // placement rather than prose, and "guardrails" should find a gateway that
  // does guardrails without beating a tool whose description says it.
  if (it.alsoIn.some((s) => s.split(/\s+/).some((w) => w.startsWith(q))))
    return TIER.roleWord - brevity;
  if (it.domain.includes(q)) return TIER.domainPhrase;

  if (q.length >= MIN_FUZZY_QUERY) {
    const f = fuzzyScore(it.haystack, q);
    if (f > 0) return TIER.fuzzy + f;
  }

  return 0;
}

/**
 * Score one tool against every term in the query, requiring all of them to
 * match. AND semantics is what makes multi-word queries behave: it lets
 * "open source" find "Open-source tracing…" even though the literal phrase
 * spans a hyphen, and "vector db" reach tools whose blurb says "database".
 */
function scoreOne(it: IndexedTool, terms: string[]): number {
  let total = 0;
  for (const term of terms) {
    const s = scoreTerm(it, term);
    if (s === 0) return 0;
    total += s;
  }
  return total;
}

/**
 * Rank the index against a query. Returns at most `limit` entries.
 *
 * Cost per keystroke is one pass per entry (O(n) over the corpus); the final
 * sort is O(n log n) over the handful that actually matched.
 */
export function searchTools(
  index: IndexedTool[],
  rawQuery: string,
  limit = 40,
): SearchableTool[] {
  const terms = rawQuery.toLowerCase().split(/\s+/).filter(Boolean);

  // Empty query browses the whole index in stack order rather than
  // pretending to be a result set.
  if (terms.length === 0)
    return index.slice(0, Math.max(limit, index.length)).map((it) => it.entry);

  const scored: Array<{ entry: SearchableTool; s: number }> = [];

  for (const it of index) {
    const s = scoreOne(it, terms);
    if (s > 0) scored.push({ entry: it.entry, s });
  }

  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, limit).map((r) => r.entry);
}
