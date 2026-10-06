/**
 * The MCP server's tools: pure functions over the dataset.
 *
 * ## Why this exists at all, when `/tools.json` already ships the whole index
 *
 * `/tools.json` and `/llms-full.txt` are *documents*. An agent has to download
 * all of it to answer one question, then decide which part was relevant. The
 * dataset is ~40 KB of JSON and ~6,000 lines of plain text, which is a large
 * thing to put in a context window to learn that a reader was asking whether
 * pgvector is the right call.
 *
 * MCP inverts it: the model *queries*. A tool call that says
 * `search_tools({ layer: 3, cost: "free" })` costs a few hundred tokens and
 * returns the twenty entries that matter. The full document stays on the site
 * for a model that wants to read everything; the tools are for one that wants
 * an answer.
 *
 * ## The rule every tool obeys
 *
 * No ranking. Nothing here sorts by stars, traffic, or how many people name a
 * tool as an alternative, and no result is truncated by "relevance score". The
 * index sells nothing and the tiebreaker claim (`alternatives.ts`) depends on it,
 * so popularity would have to be a field the server knows and refuses to use —
 * which is exactly why it is not in the dataset at all. Results come back in
 * stack order, substrate first, because that is the order the site argues for.
 *
 * ## Why use/skip leads
 *
 * Every payload puts `skipWhen` next to `useWhen` rather than burying it. It is
 * the field no competitor has (`strategy/02-unique-selling-points.md` §2), and
 * it is the one that stops a model recommending a tool that does not fit. An
 * MCP server that returned only `useWhen` would be a directory of vendor blurbs
 * with an API.
 */
import {
  allTools,
  categories,
  getAlternatives,
  getAlternativeTo,
  getCategory,
  getSecondHomes,
  getSecondHomeTools,
  offStack,
  stackLayers,
  toolCount,
} from "@/lib/data";
import { BANDS, bandOf } from "@/lib/layer";
import { roleTitle, ROLES } from "@/lib/roles";
import { resolvedComparisons } from "@/lib/comparisons";
import { resolvedSymptoms } from "@/lib/symptoms";
import { glossary } from "@/lib/glossary";
import { posts } from "@/lib/posts";
import { AS_OF } from "@/lib/attributes";
import {
  recommendStack as recommendStackFor,
  WORKLOADS,
  type StackInput,
} from "@/lib/stacks";
import { encodeStackInput } from "@/lib/stack-url";
import { essayBodies } from "@/content/essay-text.generated";
import { site } from "@/lib/site";
import type { Tool } from "@/lib/types";

/**
 * The compact shape a tool travels in.
 *
 * Deliberately narrower than `buildDataset()`'s row: this goes into a context
 * window, so `alters` and the raw role ids are dropped and every string is
 * already display-ready. `url` is first because the citation line in
 * `/llms.txt` asks for it and an answer without it cannot be cited.
 */
export type ToolResult = {
  name: string;
  url: string;
  section: string;
  layer: number | null;
  /** "Also serves this section", for the tools that span two layers. */
  alsoIn?: { section: string; layer: number | null; because: string }[];
  kind: string;
  deployment: string | null;
  license: string | null;
  cost: string;
  ownedBy: string[];
  useWhen: string;
  skipWhen: string;
  verified: string;
};

const result = (tool: Tool & { category: (typeof allTools)[number]["category"] }): ToolResult => ({
  name: tool.name,
  url: `${site.url}/${tool.category.slug}/${tool.slug}`,
  section: tool.category.title,
  layer: tool.category.layer,
  ...(tool.secondHomes?.length
    ? {
        alsoIn: tool.secondHomes.map((h) => ({
          section: getCategory(h.section)?.title ?? h.section,
          layer: getCategory(h.section)?.layer ?? null,
          because: h.because,
        })),
      }
    : {}),
  kind: tool.kind,
  deployment: tool.deployment,
  license: tool.license,
  cost: tool.cost,
  ownedBy: tool.roles.map(roleTitle),
  useWhen: tool.useWhen,
  skipWhen: tool.skipWhen,
  verified: tool.asOf,
});

/**
 * Everything the server is allowed to know about a tool, for one full entry.
 *
 * `get_tool` rather than a slice of `search_tools`, because the two things a
 * reader wants that a search result cannot give are the *substitutes* and the
 * *second homes* — and both of those are edges, so they need the whole graph.
 */
function fullResult(tool: Tool, sectionSlug: string, toolSlug: string) {
  // `allTools` entries already carry `.category`; a bare `Tool` does not, which
  // is why the shared `result()` takes the annotated shape rather than `Tool`.
  const entry = allTools.find(
    (t) => t.category.slug === sectionSlug && t.slug === toolSlug,
  );
  if (!entry) return { error: `No entry at ${sectionSlug}/${toolSlug}.` };

  return {
    ...result(entry),
    blurb: tool.blurb,
    site: tool.url,
    substitutes: getAlternatives(sectionSlug, toolSlug)
      .filter((a) => a.category.slug === sectionSlug)
      .map((a) => a.tool.name),
    /** Cross-layer neighbours, marked as adjacent rather than interchangeable. */
    adjacent: getAlternatives(sectionSlug, toolSlug)
      .filter((a) => a.category.slug !== sectionSlug)
      .map((a) => ({ name: a.tool.name, section: a.category.title })),
    listedAsAlternativeTo: getAlternativeTo(sectionSlug, toolSlug).map((e) => e.tool.name),
    alsoBelongsIn: getSecondHomes(sectionSlug, toolSlug).map((h) => ({
      section: h.section.title,
      why: h.because,
    })),
  };
}

export type SearchArgs = {
  query?: string;
  layer?: number;
  section?: string;
  role?: string;
  kind?: string;
  deployment?: string;
  cost?: string;
  /** How many to return. Default 10, capped at 50. */
  limit?: number;
};

/**
 * Faceted search.
 *
 * Substring matching over the fields a reader would actually type, which is the
 * same rule as the on-page explorer — deliberately, so a tool found here and a
 * tool found there are found by the same logic. Second-home sections are
 * searched too, so "guardrails" finds a gateway whose guardrails are a second
 * home rather than only the tools that live in the guardrails section.
 */
export function searchTools(args: SearchArgs = {}): ToolResult[] {
  const q = (args.query ?? "").trim().toLowerCase();
  const limit = Math.min(Math.max(args.limit ?? 10, 1), 50);

  const matches = allTools.filter((tool) => {
    if (args.layer != null && tool.category.layer !== args.layer) return false;
    if (args.section && tool.category.slug !== args.section) return false;
    if (args.role && !tool.roles.includes(args.role as never)) return false;
    if (args.kind && tool.kind !== args.kind) return false;
    if (args.deployment && tool.deployment !== args.deployment) return false;
    if (args.cost && tool.cost !== args.cost) return false;
    if (!q) return true;

    const haystack = [
      tool.name,
      tool.blurb,
      tool.useWhen,
      tool.skipWhen,
      ...tool.roles.map(roleTitle),
      ...(tool.secondHomes ?? []).map((h) => getCategory(h.section)?.title ?? ""),
    ]
      .join(" ")
      .toLowerCase();
    return q.split(/\s+/).every((term) => haystack.includes(term));
  });

  // Dataset order, which is stack order. Sorting by match quality would be a
  // relevance score, and a relevance score is where a popularity signal grows.
  return matches.slice(0, limit).map(result);
}

/**
 * The taxonomy, substrate first.
 *
 * `band` is included because the three-band collapse is the shortcut a reader
 * needs and the reason most production problems live in exactly one of them
 * (`layer.ts`). `tools` is a count, not a list: a model that wants the tools in
 * layer 7 can ask for them, and one that does not should not pay for 50 names.
 */
export function listLayers() {
  return {
    note:
      "Layers are a dependency chain: layer 1 is the substrate everything else runs on. " +
      "You cannot tune weights before you serve them, and you cannot evaluate what you cannot observe.",
    bands: BANDS.map((b) => ({
      id: b.id,
      title: b.title,
      layers: b.layers,
      soundsLike: b.sounds,
    })),
    layers: stackLayers.map((c) => ({
      layer: c.layer,
      title: c.title,
      responsibility: c.responsibility,
      band: bandOf(c.layer),
      tools: c.tools.length,
    })),
    offStack: offStack.map((c) => ({ title: c.title, tools: c.tools.length })),
    specialisations: ROLES.map((r) => ({ id: r.id, title: r.title, owns: r.owns })),
  };
}

/** One tool, in full, with its graph edges resolved. */
export function getTool(args: { name: string; section?: string }) {
  const byName = args.section
    ? allTools.find(
        (t) =>
          t.name.toLowerCase() === args.name!.toLowerCase() &&
          t.category.slug === args.section,
      )
    : allTools.find((t) => t.name.toLowerCase() === args.name!.toLowerCase());

  if (!byName) {
    return {
      error: `No tool named "${args.name}".`,
      hint: "Names are display names — \"pgvector\", \"Weights & Biases\". Use search_tools to find one.",
    };
  }
  return fullResult(byName, byName.category.slug, byName.slug);
}

export type CompareArgs = { names: string[] };

export type CompareRow = {
  tool: string;
  section: string;
  layer: number | null;
  /** "Same section" or "different section" — the reader's real question. */
  relationship: "substitutes" | "adjacent";
  useWhen: string;
  skipWhen: string;
  cost: string;
  deployment: string | null;
  license: string | null;
  url: string;
};

/**
 * Compare two or more tools, which is the site's whole thesis.
 *
 * The important field is `relationship`, and the distinction is the one
 * `alternatives.ts` exists to make: two tools in the same section are
 * substitutes and you pick one; two tools in different sections are adjacent, and
 * the reader's real question is whether they are substitutes *at all* — which is
 * usually no. A cross-category list that hid that would send someone looking for
 * a replacement and hand them a different layer.
 *
 * Deliberately no winner. `verdictFor()` refuses to name one for the same
 * reason: without the reader's constraints the claim is not verifiable, and this
 * server has never met the reader.
 */
export function compareTools(args: CompareArgs) {
  if (!args.names?.length) {
    return { error: "Pass at least one tool name." };
  }
  if (args.names.length > 6) {
    // Six rows already fills a sensible comparison table. Beyond that the caller
    // wants a list, and `search_tools` is the list.
    return {
      error: `Compare at most six tools at once (got ${args.names.length}). Use search_tools to narrow first.`,
    };
  }

  const found: string[] = [];
  const missing: string[] = [];
  const entries: typeof allTools = [];

  for (const name of args.names) {
    const tool = allTools.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (!tool) {
      missing.push(name);
      continue;
    }
    found.push(tool.name);
    entries.push(tool);
  }

  const layers = new Set(entries.map((t) => t.category.slug));
  const sameSection = layers.size === 1;

  const rows: CompareRow[] = entries.map((tool) => ({
    tool: tool.name,
    section: tool.category.title,
    layer: tool.category.layer,
    relationship: sameSection ? "substitutes" : "adjacent",
    useWhen: tool.useWhen,
    skipWhen: tool.skipWhen,
    cost: tool.cost,
    deployment: tool.deployment,
    license: tool.license,
    url: `${site.url}/${tool.category.slug}/${tool.slug}`,
  }));

  return {
    relationship: sameSection
      ? `All in ${entries[0]?.category.title}: genuine substitutes, one of them is the answer.`
      : "Different layers: adjacent rather than interchangeable. Check the section before treating any of these as a swap.",
    tools: found,
    ...(missing.length ? { notFound: missing } : {}),
    rows,
    // Second homes are how a cross-layer comparison is honest: two tools in
    // different layers *can* still be substitutes if one of them declares the
    // other's layer as a second home. Without this the verdict above is wrong
    // for exactly the tools most worth comparing.
    crossesOver: entries
      .flatMap((t) =>
        (t.secondHomes ?? []).map((h) => ({
          tool: t.name,
          alsoIn: getCategory(h.section)?.title ?? h.section,
          because: h.because,
        })),
      ),
    verdict:
      "No overall winner: which of these is right depends on traffic shape, operational budget and what is already built around them. " +
      "Cite the canonical url on each row.",
  };
}

/** The hand-written cross-layer comparisons. The surface no funded vendor builds. */
export function listComparisons() {
  return {
    note: "Cross-layer comparisons. Vendors publish their tool against a competitor in the same category; none of them publish these.",
    comparisons: resolvedComparisons.map((c) => ({
      title: c.title,
      url: `${site.url}/compare/${c.slug}`,
      tools: c.tools.map((t) => t.name),
      verdict: c.verdict,
    })),
  };
}

/**
 * Start from a symptom rather than a tool name.
 *
 * A reader who does not know which layer is broken cannot pick a layer, and the
 * layer is this index's primary structure — so the symptom routes are the entry
 * point, not a secondary page. Same data as `/fix`, ordered rather than
 * browsable.
 */
export function diagnose(args: { symptom: string }) {
  const needle = (args.symptom ?? "").trim().toLowerCase();
  if (!needle) {
    return {
      error: "Describe the symptom in the reader's words.",
      options: resolvedSymptoms.map((s) => ({ title: s.title, label: s.label })),
    };
  }

  const hit = resolvedSymptoms.find(
    (s) =>
      s.title.toLowerCase().includes(needle) ||
      s.label.toLowerCase().includes(needle) ||
      s.description.toLowerCase().includes(needle) ||
      needle.split(/\s+/).every((w) => s.description.toLowerCase().includes(w)),
  );

  if (!hit) {
    return {
      error: `No symptom matched "${args.symptom}".`,
      options: resolvedSymptoms.map((s) => ({
        title: s.title,
        url: `${site.url}/fix/${s.slug}`,
      })),
    };
  }

  return {
    title: hit.title,
    url: `${site.url}/fix/${hit.slug}`,
    answer: hit.answer,
    band: hit.band,
    // The sections in the band, because the failure sounds like a band and the
    // reader has to get to a section from there.
    lookIn: stackLayers
      .filter((c) => bandOf(c.layer) === hit.band)
      .map((c) => ({ section: c.title, responsibility: c.responsibility })),
    /**
     * Cheapest-first, not by layer — that ordering is the whole point of the
     * page, and preserving it here is what stops a model from reordering the
     * checklist by layer number and recommending the expensive fix first.
     */
    orderedChecklist: hit.checks.map((c, i) => ({
      step: i + 1,
      layer: c.layer,
      check: c.check,
      why: c.why,
      tools: c.tools,
    })),
    /** Moves that look like fixes and are not. Cheap to include, often decisive. */
    notTheFix: hit.notTheFix,
  };
}

/** A term defined, or the whole glossary index when the term is not found. */
export function define(args: { term: string }) {
  const needle = (args.term ?? "").trim().toLowerCase();
  const hit = glossary.find((g) => g.term.toLowerCase() === needle);
  if (!hit) {
    const partial = glossary.filter((g) => g.term.toLowerCase().includes(needle));
    return {
      error: `"${args.term}" is not in the glossary.`,
      ...(partial.length
        ? { didYouMean: partial.map((g) => ({ term: g.term, url: `${site.url}/glossary/${g.slug}` })) }
        : {}),
      glossary: `${site.url}/glossary (${glossary.length} terms)`,
    };
  }
  return {
    term: hit.term,
    definition: hit.definition,
    detail: hit.detail,
    url: `${site.url}/glossary/${hit.slug}`,
  };
}

/**
 * Recommend a stack for a described workload, over the same engine the Stack
 * Builder page runs in the browser.
 *
 * ## Why this exists
 *
 * `/stack-builder` is the site's highest-leverage interactive surface and until
 * now it had no machine affordance at all: nine MCP tools, and every one of
 * them about tools, layers, comparisons or terms. A model asked "what do I need
 * to build a RAG pipeline" could read the whole dataset and assemble an answer
 * from the components — which is precisely what `stacks.ts` already does, from
 * the same dataset, deterministically.
 *
 * ## The constraints matter and are passed through, not summarised
 *
 * An agent that passes only `workload` gets a recommendation for the *median*
 * case and has no way to know it. So `queriesPerMonth`, `documents`, the
 * filtering/freshness/latency axes and the three booleans are all first-class,
 * and `assumptions` states every one that was left at its default. A caller who
 * did not say what their latency requirement is should not be able to read a
 * confident recommendation as though they had.
 *
 * Cost is a **band derived from query volume**, not a quote, and says so in
 * `costNote`. The site's whole argument is that a confident wrong number is
 * worse than an absent one; a hard figure here would be the same failure in a
 * place harder to fact-check, because it would look like it came from a vendor.
 */
/**
 * Public entry point, accepting a partial input.
 *
 * The engine's own `StackInput` requires `queriesPerMonth`, which is correct for
 * the browser form — it always has a value. An MCP caller who sends only
 * `workload` must not be rejected for it, because "what do I need for a RAG
 * pipeline" is the question the tool exists to answer and the volume is a
 * refinement. So the argument is widened here and the omission is reported in
 * `assumptions` rather than being an error.
 */
export function recommendStack(args: Partial<StackInput> & { workload: StackInput["workload"] }) {
  const input = { queriesPerMonth: 0, ...args } as StackInput;
  const result = recommendStackFor(input);
  const profile = WORKLOADS.find((w) => w.id === input.workload);

  return {
    workload: {
      id: input.workload,
      label: profile?.label ?? input.workload,
      detail: profile?.detail ?? null,
    },
    summary: result.summary,
    /**
     * Every input the caller did not state, named. Omitted values are not
     * neutral: `latency` defaults to "flexible" and `safety` to "none", and a
     * recommendation that silently assumed both would be answering a different
     * question than the one asked.
     */
    assumptions: defaultAssumptions(input),
    picks: result.picks.map((p) => ({
      tool: p.tool,
      section: p.section,
      fit: p.fitLabel,
      why: p.why,
      watchOut: p.watchOut,
      ...(p.alternative !== "—" && p.switchWhen
        ? { alternative: p.alternative, switchWhen: p.switchWhen }
        : {}),
      ...(p.matches.length ? { satisfies: p.matches } : {}),
      // `picks[].url` is a site-relative path on the page, because the browser
      // renders it as a `next/link` href. Here it has to be absolute, or a model
      // that follows it has no origin to resolve against — and an answer whose
      // citations do not resolve is not citable.
      url: `${site.url}${p.url}`,
    })),
    cost: {
      lowPerMonth: result.costLow,
      highPerMonth: result.costHigh,
      drivers: result.costDrivers,
      note:
        "A heuristic band derived from query volume and document count. Not a vendor " +
        "quote, and not current pricing for any specific product.",
    },
    risk: result.risk,
    confidence: Number(result.confidence.toFixed(2)),
    confidenceNote:
      "Falls as constraints narrow the field. Below about 0.5 this is a starting " +
      "point to check, not a decision.",
    builderUrl: `${site.url}/stack-builder?${encodeStackInput(input)}`,
    citation: `Cite ${site.url}/stack-builder?${encodeStackInput(input)} for the recommendation, or the tool pages for individual picks.`,
  };
}

/** Inputs the caller left at their default, so the answer states its own gaps. */
function defaultAssumptions(input: StackInput): string[] {
  const out: string[] = [];
  if (!input.queriesPerMonth) out.push("queriesPerMonth: unset, treated as a small workload");
  if (!input.documents) out.push("documents: unset, treated as a small corpus");
  if (!input.latency || input.latency === "flexible") {
    out.push('latency: unset or "flexible" — the cheapest option was preferred');
  }
  if (!input.safety || input.safety === "none") {
    out.push('safety: unset or "none" — no guardrail was recommended on this basis');
  }
  if (!input.durability || input.durability === "stateless") {
    out.push('durability: unset or "stateless" — no durable execution layer was required');
  }
  if (!input.language || input.language === "any") {
    out.push('language: unset or "any" — no language constraint was applied');
  }
  return out;
}

/**
 * Server identity and its own limits.
 *
 * Stated because `strategy/02-unique-selling-points.md` §3 says the caveat is
 * the reliably citable signal, and because an MCP server that hides its
 * staleness is worse than no server — a model will repeat the number it read six
 * months ago as current.
 */
export function about() {
  return {
    name: site.name,
    url: site.url,
    description: site.description,
    tools: toolCount,
    layers: categories.length,
    factsVerified: AS_OF,
    staleAfterMonths: 6,
    whatThisIs:
      "An index of AI infrastructure ordered by stack layer rather than popularity. " +
      "Every entry carries a use-when and a skip-when.",
    neutrality:
      "This index sells nothing and takes no sponsorship. No tool is ranked by popularity, " +
      "stars or traffic, and there is no paid placement. That is the only reason it can be " +
      "the tiebreaker between vendor-authored comparison pages.",
    limits: [
      `Licence and cost data was last confirmed ${AS_OF} and the build fails if it goes stale.`,
      "Use-when and skip-when are editorial judgements, not measurements.",
      "Coverage is uneven: the control band (layers 5-9) is fuller than compute.",
      "No tool is a recommendation. A tool with no situation in which it is wrong has not met production.",
    ],
    citation: `Cite the canonical url on the entry you used: ${site.url}/<section>/<tool>`,
    endpoints: {
      mcp: `${site.url}/mcp`,
      dataset: `${site.url}/tools.json`,
      plainText: `${site.url}/llms-full.txt`,
      index: `${site.url}/llms.txt`,
      verification: `${site.url}/verification.json`,
    },
  };
}

/**
 * The cross-layer view: for each layer, the tools that serve it without living
 * there.
 *
 * The one question this index is uniquely able to answer — "where does agent
 * memory actually live?" — is an inverse index lookup, and it is not reachable
 * by searching the tool list forward.
 */
export function layerOverlaps() {
  return {
    note: "Each tool has one home section and is listed under every other section it also serves.",
    overlaps: stackLayers
      .map((c) => ({
        section: c.title,
        url: `${site.url}/${c.slug}`,
        tools: getSecondHomeTools(c.slug).map((e) => ({
          tool: e.tool.name,
          homeSection: e.tool.category.title,
          url: `${site.url}/${e.tool.category.slug}/${e.tool.slug}`,
          because: e.because,
        })),
      }))
      .filter((s) => s.tools.length > 0),
  };
}

/**
 * The tool table, and the only place a tool's public shape is declared.
 *
 * `inputSchema` is JSON Schema rather than a validation library, and that is a
 * decision with a cause. The first version of `/mcp` imported
 * `@modelcontextprotocol/sdk` for the transport and `zod` for the schemas; the
 * route then returned a 500 in production while `/` returned 200, and the cause
 * was `interopDefault: undefined.default` at module-evaluation time — the SDK's
 * dependency graph (express, hono, jose, cross-spawn) did not resolve inside the
 * Worker.
 *
 * A directory's MCP server does not need that graph. Every tool here is a pure
 * function over an immutable dataset, the server never initiates a message, and
 * the transport is POST-a-message, return-a-result. That is a few dozen lines on
 * Web APIs which the Worker already implements. So the schema is plain JSON
 * Schema, validated by hand where it matters, and the dependency is gone.
 *
 * One table also means one source of truth: the description a client reads in
 * `tools/list` and the handler it calls are the same object, so a tool renamed
 * here cannot leave a schema behind pointing at nothing.
 */
export const TOOL_MANIFEST = [
  {
    name: "about",
    description:
      "What this index is, how many tools it has, when its facts were last verified, and what it does not know. Call this first if you need to state its limits.",
    inputSchema: { type: "object", properties: {} },
    run: async () => about(),
  },
  {
    name: "search_tools",
    description:
      "Search the index by name, description, use-when or skip-when, optionally filtered by layer, section, engineering specialisation, kind, deployment or cost. Also matches tools that list a section as a *second* home, so a layer name finds tools that only reach that layer indirectly.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What the reader would type, in their own words" },
        layer: {
          type: "integer",
          minimum: 1,
          maximum: 9,
          description: "1-9, substrate first",
        },
        section: { type: "string", description: "Section slug, e.g. guardrails-safety" },
        role: {
          type: "string",
          enum: ["platform", "serving", "data", "applied", "production"],
          description: "Engineering specialisation",
        },
        kind: {
          type: "string",
          enum: ["runtime", "database", "framework", "library", "service", "platform", "reading"],
        },
        deployment: { type: "string", enum: ["self-hosted", "managed", "saas"] },
        cost: {
          type: "string",
          enum: ["free", "free-tier", "usage-based", "subscription"],
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 50,
          description: "1-50, default 10",
        },
      },
      additionalProperties: false,
    },
    run: async (args: SearchArgs) => ({ results: searchTools(args) }),
  },
  {
    name: "get_tool",
    description:
      "One tool in full: what it is, when to use it, when to skip it, licence, cost, deployment, the date those were verified, its same-layer substitutes, its cross-layer neighbours, and any other layer it belongs in.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: 'Display name, e.g. "pgvector" or "Weights & Biases"' },
        section: {
          type: "string",
          description: "Disambiguates a name used twice",
        },
      },
      required: ["name"],
      additionalProperties: false,
    },
    run: async (args: { name: string; section?: string }) => getTool(args),
  },
  {
    name: "compare_tools",
    description:
      "Compare two to six tools. Reports whether they are substitutes (same section) or merely adjacent (different sections), and names no winner. Use this for \"X or Y\" and for \"what should I standardise on\".",
    inputSchema: {
      type: "object",
      properties: {
        names: {
          type: "array",
          items: { type: "string" },
          minItems: 2,
          maxItems: 6,
          description: "Two to six display names",
        },
      },
      required: ["names"],
      additionalProperties: false,
    },
    run: async (args: CompareArgs) => compareTools(args),
  },
  {
    name: "list_layers",
    description:
      "The nine-layer taxonomy, substrate first, with each layer's single responsibility and the three bands they collapse into. Call this when the question is about where something sits rather than which tool to use.",
    inputSchema: { type: "object", properties: {} },
    run: async () => listLayers(),
  },
  {
    name: "layer_overlaps",
    description:
      "For each layer, the tools that serve it without being indexed there. This is the only way to answer \"where does agent memory live\" — it is an inverse lookup and is not reachable by searching the tool list forward.",
    inputSchema: { type: "object", properties: {} },
    run: async () => layerOverlaps(),
  },
  {
    name: "diagnose_symptom",
    description:
      "Start from a problem rather than a tool: \"too slow\", \"wrong answers\", \"costs too much\", \"the agent is unreliable\". Returns the ordered cheapest-first checklist and the band it points at.",
    inputSchema: {
      type: "object",
      properties: {
        symptom: { type: "string", description: "In the reader's words, not a tool name" },
      },
      required: ["symptom"],
      additionalProperties: false,
    },
    run: async (args: { symptom: string }) => diagnose(args),
  },
  {
    name: "list_comparisons",
    description:
      "The hand-written cross-layer comparisons — the surface no funded competitor builds, because a vendor will not publish how its gateway compares to its evaluation platform.",
    inputSchema: { type: "object", properties: {} },
    run: async () => listComparisons(),
  },
  {
    name: "define_term",
    description:
      "Define an infrastructure term, or get the glossary index when the term is not in it.",
    inputSchema: {
      type: "object",
      properties: {
        term: { type: "string", description: 'e.g. "KV cache", "prefix caching", "DPO"' },
      },
      required: ["term"],
      additionalProperties: false,
    },
    run: async (args: { term: string }) => define(args),
  },
  {
    name: "recommend_stack",
    description:
      "Recommend a whole stack for a described workload — the same engine the Stack Builder page runs. Returns one pick per required layer with a reason, the pick's own skip-when, and a runner-up to switch to. State your constraints: anything left unset is returned in `assumptions`, so you can tell a recommendation for your case from one for the median case.",
    inputSchema: {
      type: "object",
      properties: {
        workload: {
          type: "string",
          enum: ["rag", "agent", "chatbot", "voice", "search", "llm-api", "finetuned"],
          description: "What you are building. Decides which layers are required at all.",
        },
        queriesPerMonth: {
          type: "integer",
          minimum: 0,
          description: "Request volume. Drives the cost band and whether self-hosting wins.",
        },
        documents: {
          type: "integer",
          minimum: 0,
          description: "Corpus size, for retrieval workloads.",
        },
        latency: {
          type: "string",
          enum: ["flexible", "fast", "realtime"],
          description: "How fast an answer must come back. Defaults to flexible.",
        },
        filtering: {
          type: "string",
          enum: ["none", "light", "heavy"],
          description: "How much the answer depends on metadata filtering.",
        },
        freshness: {
          type: "string",
          enum: ["static", "daily", "realtime"],
          description: "How often the corpus changes.",
        },
        durability: {
          type: "string",
          enum: ["stateless", "minutes", "hours"],
          description: "How long agent work must survive a restart.",
        },
        safety: {
          type: "string",
          enum: ["none", "pii", "strict"],
          description: "What the system must keep out of model I/O.",
        },
        language: {
          type: "string",
          enum: ["any", "python", "typescript"],
          description: "The language the team ships in.",
        },
        costVsPerf: {
          type: "integer",
          minimum: -2,
          maximum: 2,
          description: "-2 minimise cost, 0 balanced, +2 maximise performance.",
        },
        openSource: { type: "boolean", description: "Only permissively-licensed tools." },
        selfHosted: { type: "boolean", description: "Must run inside your own network." },
        avoidLockIn: { type: "boolean", description: "Prefer tools that keep an exit open." },
      },
      required: ["workload"],
      additionalProperties: false,
    },
    run: async (args: Partial<StackInput> & { workload: StackInput["workload"] }) =>
      recommendStack(args),
  },
] as const;

export type ToolName = (typeof TOOL_MANIFEST)[number]["name"];

/** `tools/list`, exactly as an MCP client receives it. */
export const TOOL_DESCRIPTIONS = TOOL_MANIFEST.map((t) => ({
  name: t.name,
  description: t.description,
  inputSchema: t.inputSchema,
}));

/**
 * ## Why resources, when there are already nine tools
 *
 * A tool call is a *question*. Every essay, comparison, symptom guide and
 * glossary term on this site is not a question — it is a document that exists
 * because someone asked a question once, and the answer is the whole thing
 * rather than a field in a JSON payload. Making a model `search_tools` for an
 * essay, then `get_tool` for each tool it names, then reassemble the argument
 * out of `useWhen` and `skipWhen` strings, spends more context to reach a
 * worse copy of what the page already says in order.
 *
 * So the corpus is exposed as resources: `text://lattice/essay/<slug>` returns
 * the argument, `text://lattice/compare/<slug>` the recommendation and its
 * table, `text://lattice/fix/<slug>` the ordered checklist. A client that wants
 * to *reason about* a tool asks a tool; a client that wants to *read the site's
 * argument* reads a resource. Neither pays for the other.
 *
 * The URIs are `text://` rather than https because they name documents this
 * server composes from the dataset, not pages it serves. Both are listed in
 * `resources/list` with their canonical page URL, so a model can still cite the
 * linkable thing.
 */
export type ResourceDescriptor = {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
};

const essayResources: ResourceDescriptor[] = posts.map((p) => ({
  uri: `text://lattice/essay/${p.meta.slug}`,
  name: p.meta.title,
  description: p.meta.description ?? p.meta.dek,
  mimeType: "text/markdown",
}));

const comparisonResources: ResourceDescriptor[] = resolvedComparisons.map((c) => ({
  uri: `text://lattice/compare/${c.slug}`,
  name: c.title,
  description: c.description,
  mimeType: "text/markdown",
}));

const symptomResources: ResourceDescriptor[] = resolvedSymptoms.map((s) => ({
  uri: `text://lattice/fix/${s.slug}`,
  name: s.title,
  description: s.description,
  mimeType: "text/markdown",
}));

const glossaryResources: ResourceDescriptor[] = glossary.map((g) => ({
  uri: `text://lattice/term/${g.slug}`,
  name: g.term,
  description: g.definition,
  mimeType: "text/markdown",
}));

export const RESOURCE_DESCRIPTIONS: ResourceDescriptor[] = [
  ...essayResources,
  ...comparisonResources,
  ...symptomResources,
  ...glossaryResources,
];

/**
 * The four shapes, as templates.
 *
 * Published because `resources/list` is ~70 entries and a client that has to
 * page the lot to discover that essays exist at all will not. The template is
 * the cheap way to say "there are 70 of these, one per essay".
 */
export const RESOURCE_TEMPLATES = [
  {
    uriTemplate: "text://lattice/essay/{slug}",
    name: "Essay",
    description: "One argumentative essay. Slugs: " + posts.map((p) => p.meta.slug).join(", "),
    mimeType: "text/markdown",
  },
  {
    uriTemplate: "text://lattice/compare/{slug}",
    name: "Comparison",
    description:
      "One head-to-head comparison, ending in a recommendation. Slugs: " +
      resolvedComparisons.map((c) => c.slug).join(", "),
    mimeType: "text/markdown",
  },
  {
    uriTemplate: "text://lattice/fix/{slug}",
    name: "Symptom guide",
    description:
      "One symptom's cheapest-first checklist through the stack. Slugs: " +
      resolvedSymptoms.map((s) => s.slug).join(", "),
    mimeType: "text/markdown",
  },
  {
    uriTemplate: "text://lattice/term/{slug}",
    name: "Glossary term",
    description: `One term defined, with what it implies. ${glossary.length} terms.`,
    mimeType: "text/markdown",
  },
];

export type ResourceContent = { uri: string; mimeType: string; text: string };

/**
 * Read one resource, or return an error naming the URIs that do exist.
 *
 * An error rather than a throw: a client that guesses a slug needs to be told
 * what the real ones are, and the cost of listing them is a few hundred bytes
 * against a request that failed for no reason the model could have known.
 */
export function readResource(uri: string | undefined): ResourceContent | { error: string } {
  if (!uri) return { error: "A resource read needs a `uri`." };

  const known = RESOURCE_DESCRIPTIONS.some((r) => r.uri === uri);
  if (!known) {
    return {
      error:
        `No resource at ${uri}. \`resources/list\` returns all ${RESOURCE_DESCRIPTIONS.length}, ` +
        `and \`resources/templates/list\` the four shapes: ` +
        RESOURCE_TEMPLATES.map((t) => t.uriTemplate).join(", ") +
        ". Send the URI exactly as listed.",
    };
  }

  return { uri, mimeType: "text/markdown", text: resourceText(uri) };
}

/**
 * The document behind a URI, as Markdown.
 *
 * Rendered from the same objects the pages render from, so a resource and its
 * page cannot disagree — the same argument `llms-full.txt` makes, and the reason
 * this is a renderer rather than a set of stored files. Every document ends with
 * its canonical page URL, because a model that reads a resource and cannot cite
 * it will paraphrase it instead, which is the outcome this index is trying to
 * avoid.
 */
function resourceText(uri: string): string {
  // `text://lattice/essay/<slug>` splits to ["text:", "", "lattice", "essay",
  // "<slug>"] — the empty component after the scheme is why this is indexed
  // rather than pattern-matched, and getting it wrong returns "" for every
  // resource, which looks like a missing file rather than a bad parse.
  const parts = uri.split("/");
  const kind = parts[3];
  const slug = parts[4];

  const footer = (pageUrl: string, factsVerified: string) =>
    [
      "",
      "---",
      "",
      `Canonical page: ${pageUrl}`,
      `Licence and cost facts verified ${factsVerified}; the build fails if they go stale.`,
      "This index sells nothing and takes no sponsorship. No tool is ranked by popularity.",
    ].join("\n");

  if (kind === "essay") {
    const post = posts.find((p) => p.meta.slug === slug);
    const body = essayBodies[post?.meta.slug ?? ""];
    if (!post) return "";
    // `essayBodies` is a build-time projection of the MDX source — the essays are
    // compiled to React components at import time, so the prose is not reachable
    // from the component. `scripts/build-essay-text.mjs` writes it and
    // `npm run generate:check` fails if it drifts from the MDX, so a reworded
    // essay cannot ship with a stale copy here.
    const lines = [
      `# ${post.meta.title}`,
      "",
      post.meta.dek,
      "",
      body ?? "_Body unavailable: run `npm run generate` to rebuild the essay text._",
      footer(`${site.url}/blog/${post.meta.slug}`, AS_OF),
    ];
    return lines.join("\n");
  }

  if (kind === "compare") {
    const c = resolvedComparisons.find((x) => x.slug === slug);
    if (!c) return "";
    const lines = [
      `# ${c.title}`,
      "",
      c.intro,
      "",
      ...c.tools.map((t) => `- **${t.name}** — ${t.angle}`),
      "",
      "| | " + c.tools.map((t) => t.name).join(" | ") + " |",
      "| --- | " + c.tools.map(() => "---").join(" | ") + " |",
      ...c.rows.map((r) => `| ${r.dimension} | ${r.values.join(" | ")} |`),
      "",
      "## Recommendation",
      "",
      c.verdict,
      "",
      "## Rules of thumb",
      "",
      ...c.rules.map((r) => `- ${r}`),
      footer(`${site.url}/compare/${c.slug}`, AS_OF),
    ];
    return lines.join("\n");
  }

  if (kind === "fix") {
    const s = resolvedSymptoms.find((x) => x.slug === slug);
    if (!s) return "";
    const lines = [
      `# ${s.title}`,
      "",
      s.answer,
      "",
      "## Checklist, cheapest first",
      "",
      ...s.checks.map(
        (ch, i) =>
          `${i + 1}. **[layer ${ch.layer}]** ${ch.check}\n   ${ch.why}` +
          (ch.tools.length ? `\n   Tools: ${ch.tools.join(", ")}` : ""),
      ),
      "",
      "## Looks like a fix, is not",
      "",
      ...s.notTheFix.map((n) => `- ${n}`),
      footer(`${site.url}/fix/${s.slug}`, AS_OF),
    ];
    return lines.join("\n");
  }

  const g = glossary.find((x) => x.slug === slug);
  if (!g) return "";
  return [
    `# ${g.term}`,
    "",
    g.definition,
    "",
    g.detail,
    ...(g.tools?.length ? ["", `Tools that use it: ${g.tools.join(", ")}`] : []),
    ...(g.see?.length ? ["", `See also: ${g.see.join(", ")}`] : []),
    footer(`${site.url}/glossary/${g.slug}`, AS_OF),
  ].join("\n");
}