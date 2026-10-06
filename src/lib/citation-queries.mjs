/**
 * The citation query set.
 *
 * ## Why this is a module and not a table in the tracker
 *
 * `gtm/citation-tracker.md` carried a 20-row query table in prose, which meant
 * three things: nothing could run it, the monthly log was 200 rows of markdown
 * that nobody reads, and "the tactic category it maps to" — a column the
 * tracker's own instructions depend on — had no defined vocabulary anywhere. A
 * tracker that cannot be run is a wish, and a log of 200 blank rows is worse
 * than no log.
 *
 * So the queries live here, each mapped to the claim it is supposed to be
 * evidence for, and `scripts/cite-check.mjs` generates the markdown from the
 * results. The claim mapping is the part that makes the measurement actionable:
 * "position moved 4 places" says nothing, and "the `skip-when` queries moved,
 * the `neutrality` queries did not" says which half of the strategy is working.
 *
 * Plain `.mjs` rather than `.ts` because `cite-check.mjs` runs it under bare node
 * with no build step — the same constraint as `submissions.mjs`, and the reason
 * `generate-awesome-list.mjs` parses TypeScript with regexes. Regex-parsing a
 * file whose values contain commas and quotes is the fragile path; this is not.
 * The types live in `citation-queries.d.mts` beside it.
 *
 * ## The claims
 *
 * These are the six ranked as genuinely open in
 * `strategy/02-unique-selling-points.md` §"Ranked: what is genuinely open", plus
 * two route families that carry traffic rather than argument. If a claim is ever
 * retired from that document, retire it here too — otherwise the tracker spends
 * its budget measuring a category nobody is working on.
 */

/**
 * A claim a tracked query is evidence for.
 *
 * `symptom` and `definition` are not in the USP list. They are here because the
 * `/fix` and `/glossary` routes are the largest sets of pages a reader reaches
 * from a search engine, and a change in their citation rate is a change in
 * traffic that has nothing to do with the argument.
 */
export const CLAIMS = {
  "layer-ordering": {
    title: "Layer ordering as load-bearing architecture",
    note: "The one claim no competitor makes. If these never cite, the ordering is not reaching anyone.",
  },
  "skip-when": {
    title: "skipWhen — when not to use something",
    note: "112/112 entries, and not one competitor publishes the second half of the decision pair.",
  },
  freshness: {
    title: "The freshness guard, as a fact",
    note: "Licence and cost verified to a stated date, with a build-time gate behind it.",
  },
  neutrality: {
    title: "Neutrality, as the tiebreaker",
    note: "X or Y, where every funded competitor is arguing for themselves.",
  },
  "cross-layer": {
    title: "Cross-layer comparison",
    note: "The wedge vendors structurally cannot occupy.",
  },
  symptom: {
    title: "Symptom-first entry (/fix)",
    note: "Traffic rather than argument. A reader arrives with a problem, not a product name.",
  },
  definition: {
    title: "Glossary definitions",
    note: "Highest-volume search surface; the route with the lowest bar to be cited on.",
  },
};

/**
 * 20 queries, carried over verbatim from `gtm/citation-tracker.md`.
 *
 * The wording matters and should not be improved casually. These strings *are* the
 * measurement, so rewording one invalidates the comparison against every prior
 * month and starts a new series. Adding a query is fine.
 *
 * No query mentions Lattice. A query that names the site measures whether the
 * brand is known, not whether the content is chosen, and those are different
 * problems with different fixes.
 */
export const CITATION_QUERIES = [
  { id: 1, query: "why is my LLM app slow", target: "/fix/llm-app-too-slow", claim: "symptom" },
  { id: 2, query: "how to reduce LLM API costs", target: "/fix/llm-costs-too-high", claim: "symptom" },
  { id: 3, query: "why does my RAG give wrong answers", target: "/fix/llm-wrong-answers", claim: "symptom" },
  { id: 4, query: "why does my AI agent keep failing in production", target: "/fix/ai-agent-unreliable", claim: "symptom" },
  { id: 5, query: "how do I evaluate LLM prompt changes", target: "/fix/measure-llm-changes", claim: "symptom" },
  { id: 6, query: "vLLM vs SGLang vs TGI", target: "/compare/inference-runtimes", claim: "neutrality" },
  { id: 7, query: "best vector database 2026", target: "/compare/vector-databases", claim: "neutrality" },
  { id: 8, query: "pgvector vs Pinecone", target: "/compare/vector-databases", claim: "neutrality" },
  { id: 9, query: "Langfuse vs LangSmith vs Braintrust", target: "/compare/llm-observability", claim: "neutrality" },
  { id: 10, query: "LiteLLM vs Portkey", target: "/compare/llm-gateways", claim: "neutrality" },
  { id: 11, query: "Temporal vs Inngest for AI agents", target: "/compare/durable-workflows", claim: "neutrality" },
  { id: 12, query: "RAG vs fine-tuning vs prompt engineering", target: "/compare/retrieval-finetuning-prompting", claim: "cross-layer" },
  { id: 13, query: "should I build an LLM gateway or evals first", target: "/compare/gateway-guardrails-evals", claim: "cross-layer" },
  { id: 14, query: "self-host LLM vs API cost", target: "/compare/cutting-inference-cost", claim: "cross-layer" },
  { id: 15, query: "Instructor vs Outlines", target: "/compare/structured-output", claim: "neutrality" },
  { id: 16, query: "alternatives to Pinecone", target: "/retrieval-vector-stores/pinecone/alternatives", claim: "neutrality" },
  { id: 17, query: "when not to use LangChain", target: "/agent-frameworks/langchain", claim: "skip-when" },
  { id: 18, query: "is Langfuse open source", target: "/evaluation-observability/langfuse", claim: "freshness" },
  { id: 19, query: "what is paged attention", target: "/glossary/paged-attention", claim: "definition" },
  { id: 20, query: "AI infrastructure stack layers", target: "/", claim: "layer-ordering" },
];

/**
 * A second, smaller set aimed squarely at the `skip-when` claim.
 *
 * `02-unique-selling-points.md` §2 calls this the most defensible thing the site
 * has, and query 17 above is the only thing testing it. One query is not a
 * measurement of a claim that load-bearing, so this set gives the claim a
 * denominator.
 *
 * Kept separate rather than merged because these are the queries most likely to
 * need *new pages written* rather than better rankings. If one never cites, the
 * usual answer is "there is no page that says this" — `target: ""` marks exactly
 * those, and a query with an empty target is a content gap, not a ranking loss.
 */
export const SKIP_WHEN_QUERIES = [
  { id: 101, query: "when not to use a vector database", target: "", claim: "skip-when" },
  { id: 102, query: "do I need an AI gateway", target: "", claim: "skip-when" },
  { id: 103, query: "when is RAG the wrong choice", target: "/fix/llm-wrong-answers", claim: "skip-when" },
  { id: 104, query: "when not to use an agent framework", target: "", claim: "skip-when" },
  { id: 105, query: "is self-hosting an LLM worth it", target: "/compare/cutting-inference-cost", claim: "skip-when" },
  { id: 106, query: "when do I not need evals", target: "", claim: "skip-when" },
];

/** Every tracked query, in id order. */
export const ALL_QUERIES = [...CITATION_QUERIES, ...SKIP_WHEN_QUERIES].sort(
  (a, b) => a.id - b.id,
);

/** Claim ids, for the type declaration and for coverage assertions. */
export const CLAIM_IDS = Object.keys(CLAIMS);