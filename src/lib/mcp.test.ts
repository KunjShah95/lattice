import fs from "node:fs";
import { describe, expect, it } from "vitest";
import {
  about,
  compareTools,
  define,
  diagnose,
  getTool,
  layerOverlaps,
  listComparisons,
  listLayers,
  readResource,
  recommendStack,
  RESOURCE_DESCRIPTIONS,
  RESOURCE_TEMPLATES,
  searchTools,
  TOOL_DESCRIPTIONS,
  TOOL_MANIFEST,
} from "./mcp";
import { allTools, toolCount } from "./data";
import { posts } from "./posts";
import { resolvedComparisons } from "./comparisons";
import { resolvedSymptoms } from "./symptoms";
import { glossary } from "./glossary";
import { essayBodies } from "@/content/essay-text.generated";
import { encodeStackInput } from "./stack-url";
import { site } from "./site";

/**
 * The MCP surface.
 *
 * Most of these are not "does it work" tests. The handlers are a thin shell over
 * functions the rest of the suite already covers, so what is worth asserting is
 * the things that are *specific to a machine reader* and would pass unnoticed in
 * a browser:
 *
 *   1. Nothing here ranks by popularity. A ranking leak into an API is invisible
 *      on a page — the reader cannot tell that results were ordered by stars —
 *      but a model given an ordered list will repeat the order as a
 *      recommendation, and that is the one claim the site sells.
 *   2. `skipWhen` travels with every tool. An API that returns only `useWhen` is
 *      a directory of vendor blurbs, and the skip line is the field no
 *      competitor publishes.
 *   3. Every payload carries a citable URL, or a model cannot cite it.
 */

describe("the tool manifest", () => {
  it("is the single source of the client's view of each tool", () => {
    // `TOOL_DESCRIPTIONS` is what `tools/list` returns and `TOOL_MANIFEST` is
    // what `tools/call` dispatches. They are derived from one table, so this
    // asserts the derivation rather than a hand-kept pair — the failure mode
    // this replaced was two lists drifting, and a tool in one and not the other
    // silently stops existing for MCP clients.
    expect(TOOL_DESCRIPTIONS.map((t) => t.name)).toEqual(TOOL_MANIFEST.map((t) => t.name));
    for (const described of TOOL_DESCRIPTIONS) {
      expect(described.inputSchema).toBeDefined();
    }
  });

  it("imports no third-party protocol library into the route", () => {
    // The regression that cost a production incident: `@modelcontextprotocol/sdk`
    // built, passed every test, served fine under `next start`, and then 500'd on
    // the Worker with `interopDefault: undefined.default` at module-evaluation
    // time. The route's module graph has to resolve inside the Worker, and the
    // SDK pulled in express, hono, jose and cross-spawn.
    const route = fs.readFileSync("src/app/mcp/route.ts", "utf8");
    const bare = [...route.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);
    const external = bare.filter((spec) => !spec.startsWith("@/") && !spec.startsWith("."));
    expect(external, `route imports ${external.join(", ")}`).toEqual([]);
  });

  it("gives every tool a description that says when to use it", () => {
    for (const t of TOOL_MANIFEST) {
      expect(t.description.length, t.name).toBeGreaterThan(60);
    }
  });

  it("declares a JSON Schema that agrees with its own properties", () => {
    // The invariant that actually bites: a key in `required` that is not a
    // declared property makes a well-formed call fail validation, and the client
    // has no way to satisfy it.
    //
    // Deliberately *not* asserted: that every tool with arguments marks
    // something required. `search_tools` is all-optional by design — an empty
    // query is a legitimate "list me layer 7", and requiring one would push a
    // model to invent a query string.
    for (const t of TOOL_MANIFEST) {
      const schema = t.inputSchema as {
        type?: string;
        required?: string[];
        properties?: Record<string, unknown>;
      };
      expect(schema.type, t.name).toBe("object");
      expect(schema.properties, t.name).toBeDefined();

      const required = schema.required ?? [];
      expect(new Set(required).size, `${t.name} repeats a required key`).toBe(required.length);
      for (const key of required) {
        expect(schema.properties, `${t.name} requires undeclared "${key}"`).toHaveProperty(key);
      }
      if (Object.keys(schema.properties!).length === 0) {
        expect(required, `${t.name} takes no arguments but marks some required`).toEqual([]);
      }
    }
  });

  it("bounds the one argument with a real cardinality limit", () => {
    // `compare_tools` returns `{error}` above six, and `diagnose`/search are
    // unbounded. The bounds are declared rather than only enforced in the
    // handler so a client sees the limit in `tools/list` and can avoid the
    // round trip.
    const compare = TOOL_MANIFEST.find((t) => t.name === "compare_tools")!;
    const names = (compare.inputSchema as { properties: { names: { minItems?: number; maxItems?: number } } })
      .properties.names;
    expect(names.minItems).toBe(2);
    expect(names.maxItems).toBe(6);
  });

  it("gives every optional argument a description a model can act on", () => {
    for (const t of TOOL_MANIFEST) {
      const properties = (t.inputSchema as { properties?: Record<string, { description?: string }> })
        .properties ?? {};
      for (const [key, prop] of Object.entries(properties)) {
        // Enums are self-documenting; a free-form string is not.
        if ("enum" in prop) continue;
        expect(prop.description, `${t.name}.${key}`).toBeTruthy();
      }
    }
  });
});

describe("search_tools", () => {
  it("finds tools by the words a reader would actually type", () => {
    // "retrieval" is in blurbs and use-when lines, and is the word a reader
    // reaches for before they have met a product name.
    const hits = searchTools({ query: "retrieval", limit: 50 });
    expect(hits.length).toBeGreaterThan(0);
  });

  it("searches use-when and skip-when, not just the name", () => {
    // "regression" appears in three useWhen/skipWhen clauses and in no tool
    // name, so a hit proves the decision fields are in the search surface. A
    // reader describes their situation, not the product they have not met.
    const bySituation = searchTools({ query: "regression", limit: 50 });
    expect(bySituation.length).toBeGreaterThan(0);
    // And they are genuinely decision-field hits, not blurb coincidences.
    expect(
      bySituation.every(
        (h) =>
          h.useWhen.toLowerCase().includes("regression") ||
          h.skipWhen.toLowerCase().includes("regression"),
      ),
    ).toBe(true);
  });

  it("filters by layer, and returns that layer only", () => {
    const hits = searchTools({ layer: 7, limit: 50 });
    expect(hits.length).toBeGreaterThan(0);
    for (const h of hits) expect(h.layer).toBe(7);
  });

  it("filters by role, deployment and cost together", () => {
    const hits = searchTools({
      role: "production",
      deployment: "self-hosted",
      cost: "free",
      limit: 50,
    });
    for (const h of hits) {
      expect(h.ownedBy.length).toBeGreaterThan(0);
      expect(h.deployment).toBe("self-hosted");
      expect(h.cost).toBe("free");
    }
  });

  it("matches a layer a tool only reaches as a second home", () => {
    // "Where does agent memory live" is the question this server exists to
    // answer, and it is an inverse lookup — Letta is indexed in 05, not 03.
    const hits = searchTools({ query: "agent memory" });
    expect(hits.some((h) => h.name === "Letta")).toBe(true);
  });

  it("returns results in stack order, never by score", () => {
    // The whole neutrality claim, in one assertion. A relevance score is where a
    // popularity signal grows, and on a page nobody would notice; here a model
    // would read the order as a recommendation.
    const hits = searchTools({ limit: 50 });
    const layers = hits.map((h) => h.layer).filter((l): l is number => l != null);
    expect(layers).toEqual([...layers].sort((a, b) => a - b));
  });

  it("carries skipWhen on every result", () => {
    for (const h of searchTools({ limit: 50 })) {
      expect(h.skipWhen.length, h.name).toBeGreaterThan(15);
      expect(h.useWhen.length, h.name).toBeGreaterThan(15);
    }
  });

  it("gives every result a citable absolute url", () => {
    for (const h of searchTools({ limit: 50 })) {
      expect(h.url, h.name).toMatch(
        new RegExp(`^${site.url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/[a-z0-9-]+/`),
      );
    }
  });

  it("caps the result set, so a tool call cannot flood a context window", () => {
    expect(searchTools({ limit: 999 }).length).toBeLessThanOrEqual(50);
    expect(searchTools({}).length).toBeLessThanOrEqual(10);
  });

  it("finds a tool by a word that is only in its description", () => {
    // "kubernetes" is in Envoy AI Gateway's blurb and in no other field. This
    // is the substring match doing its job — a term genuinely absent from every
    // field is covered separately below.
    const hits = searchTools({ query: "kubernetes" });
    expect(hits.map((h) => h.name)).toContain("Envoy AI Gateway");
  });

  it("returns nothing rather than everything for a term in no field", () => {
    expect(searchTools({ query: "kubernetes" }).every((h) => h.name === "Envoy AI Gateway")).toBe(
      true,
    );
    expect(searchTools({ query: "kubernetesoperator" })).toEqual([]);
  });

  it("requires every term, so 'vector free' narrows rather than widens", () => {
    const both = searchTools({ query: "vector free", limit: 50 });
    const one = searchTools({ query: "vector", limit: 50 });
    expect(both.length).toBeLessThanOrEqual(one.length);
  });
});

describe("get_tool", () => {
  it("returns the decision pair and the provenance", () => {
    const t = getTool({ name: "pgvector" }) as Record<string, unknown>;
    expect(t.useWhen).toBeTruthy();
    expect(t.skipWhen).toBeTruthy();
    expect(t.license).toBeTruthy();
    expect(t.verified).toMatch(/^\d{4}-\d{2}$/);
  });

  it("resolves the substitutes graph in both directions", () => {
    const t = getTool({ name: "vLLM" }) as Record<string, unknown>;
    expect((t.substitutes as string[]).length).toBeGreaterThan(0);
  });

  it("reports an unknown name as a value a model can act on", () => {
    // Not a throw and not a JSON-RPC error: a model can read this and try
    // `search_tools` instead, which is what the hint is for.
    const r = getTool({ name: "Definitely Not A Tool" }) as Record<string, unknown>;
    expect(r.error).toMatch(/No tool named/);
    expect(r.hint).toMatch(/search_tools/);
  });

  it("finds a tool whose name has non-alphanumerics in it", () => {
    const t = getTool({ name: "Weights & Biases" }) as Record<string, unknown>;
    expect(t.name).toBe("Weights & Biases");
  });
});

describe("compare_tools", () => {
  it("says substitutes when both tools are in one section", () => {
    const r = compareTools({ names: ["Qdrant", "Milvus"] }) as Record<string, unknown>;
    expect(r.relationship).toMatch(/genuine substitutes/);
    const rows = r.rows as { relationship: string }[];
    for (const row of rows) expect(row.relationship).toBe("substitutes");
  });

  it("says adjacent when they are in different sections", () => {
    // The distinction `alternatives.ts` exists to make. A cross-layer list that
    // hid it would send someone looking for a replacement and hand them a
    // different layer.
    const r = compareTools({ names: ["LiteLLM", "Braintrust"] }) as Record<string, unknown>;
    expect(r.relationship).toMatch(/adjacent rather than interchangeable/);
    const rows = r.rows as { relationship: string }[];
    for (const row of rows) expect(row.relationship).toBe("adjacent");
  });

  it("names no winner, and says why", () => {
    const r = compareTools({ names: ["Qdrant", "Milvus"] }) as Record<string, unknown>;
    expect(r.verdict).toMatch(/No overall winner/);
    for (const value of Object.values(r)) {
      if (typeof value === "string") expect(value).not.toMatch(/\bthe best\b/i);
    }
  });

  it("carries skipWhen on every row", () => {
    const rows = (compareTools({ names: ["Qdrant", "Pinecone", "pgvector"] }) as {
      rows: { skipWhen: string; useWhen: string; url: string }[];
    }).rows;
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.skipWhen.length).toBeGreaterThan(15);
      expect(row.url).toContain(site.url);
    }
  });

  it("reports which names it could not resolve", () => {
    const r = compareTools({ names: ["Qdrant", "Nope Tool"] }) as Record<string, unknown>;
    expect(r.tools).toEqual(["Qdrant"]);
    expect(r.notFound).toEqual(["Nope Tool"]);
  });

  it("refuses more than six, and says to narrow first", () => {
    const names = allTools.slice(0, 7).map((t) => t.name);
    const r = compareTools({ names }) as Record<string, unknown>;
    expect(r.error).toMatch(/at most six/);
    expect(r.error).toMatch(/search_tools/);
  });

  it("surfaces a second home that makes two cross-layer tools comparable", () => {
    // Without this, "adjacent" is wrong for exactly the tools most worth
    // comparing: Letta (05) and a vector store (03) are adjacent, but Letta's
    // memory *is* the store, so the reader needs the crossing before deciding.
    const r = compareTools({
      names: ["Letta", "Qdrant"],
    }) as Record<string, unknown>;
    expect(r.relationship).toMatch(/adjacent/);
    expect((r.crossesOver as { tool: string }[]).map((c) => c.tool)).toContain("Letta");
  });
});

describe("list_layers", () => {
  it("orders layers substrate first, which is the site's argument", () => {
    const layers = listLayers().layers;
    expect(layers.map((l) => l.layer)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("gives every layer a single responsibility and a band", () => {
    for (const l of listLayers().layers) {
      expect(l.responsibility.length, `layer ${l.layer}`).toBeGreaterThan(10);
      expect(["compute", "state", "control"]).toContain(l.band);
    }
  });

  it("counts tools rather than listing them", () => {
    // A model that wants the tools in a layer can ask; one that does not should
    // not pay 112 names to learn there are nine layers.
    const total = listLayers().layers.reduce((n, l) => n + l.tools, 0);
    expect(total).toBe(allTools.length - 10);
  });

  it("separates off-stack reading material from the stack", () => {
    expect(listLayers().offStack.length).toBeGreaterThan(0);
  });
});

describe("layer_overlaps", () => {
  it("answers the question the forward tool list cannot", () => {
    const overlaps = layerOverlaps().overlaps;
    const retrieval = overlaps.find((o) => o.section === "Retrieval & Vector Stores");
    expect(retrieval).toBeDefined();
    expect(retrieval!.tools.map((t) => t.tool)).toContain("Letta");
  });

  it("gives every crossing a reason, not just a link", () => {
    for (const section of layerOverlaps().overlaps) {
      for (const t of section.tools) {
        expect(t.because.length, `${t.tool} → ${section.section}`).toBeGreaterThan(15);
        expect(t.url, t.tool).toContain(site.url);
      }
    }
  });

  it("never lists a tool as overlapping its own section", () => {
    for (const section of layerOverlaps().overlaps) {
      for (const t of section.tools) expect(t.homeSection).not.toBe(section.section);
    }
  });
});

describe("diagnose_symptom", () => {
  it("matches the words a reader uses, not a tool name", () => {
    // The /fix labels are how the symptom is described to a human — "Agent
    // keeps failing", not "evaluate your agent framework".
    const r = diagnose({ symptom: "agent keeps failing" }) as Record<string, unknown>;
    expect(r.title).toBeTruthy();
    expect(r.url).toContain("/fix/");
  });

  it("matches on the description as well as the label", () => {
    const r = diagnose({ symptom: "bill so high" }) as Record<string, unknown>;
    expect(r.url).toContain("/fix/llm-costs-too-high");
  });

  it("keeps the checklist cheapest-first rather than reordering by layer", () => {
    // The ordering is the whole point of the /fix pages. A model reordering it by
    // layer number would recommend the expensive fix first.
    const r = diagnose({ symptom: "too slow" }) as {
      orderedChecklist: { step: number; layer: number }[];
    };
    expect(r.orderedChecklist[0].step).toBe(1);
    const layers = r.orderedChecklist.map((c) => c.layer);
    expect(layers).not.toEqual([...layers].sort((a, b) => a - b));
  });

  it("points at the band and the sections inside it", () => {
    const r = diagnose({ symptom: "wrong answers" }) as Record<string, unknown>;
    expect(["compute", "state", "control"]).toContain(r.band);
    expect((r.lookIn as unknown[]).length).toBeGreaterThan(0);
  });

  it("lists the options rather than guessing on a miss", () => {
    const r = diagnose({ symptom: "zzz" }) as Record<string, unknown>;
    expect(r.error).toMatch(/No symptom matched/);
    expect((r.options as unknown[]).length).toBeGreaterThan(3);
  });
});

describe("define_term", () => {
  it("defines a term", () => {
    const r = define({ term: "KV cache" }) as Record<string, unknown>;
    expect(r.definition).toBeTruthy();
    expect(r.url).toContain("/glossary/");
  });

  it("matches case-insensitively", () => {
    expect((define({ term: "kv cache" }) as Record<string, unknown>).definition).toBeTruthy();
  });

  it("offers near matches instead of a dead end", () => {
    const r = define({ term: "prefix cach" }) as Record<string, unknown>;
    expect(r.error).toBeTruthy();
    expect((r.didYouMean as { term: string }[]).length).toBeGreaterThan(0);
  });
});

describe("about", () => {
  it("states its own limits, which is the citable signal", () => {
    const r = about();
    expect(r.factsVerified).toMatch(/^\d{4}-\d{2}$/);
    expect(r.limits.length).toBeGreaterThan(3);
  });

  it("states the neutrality claim explicitly, for the audience most likely to check it", () => {
    expect(about().neutrality).toMatch(/sells nothing|takes no sponsorship/);
  });

  it("points at the non-MCP surfaces too", () => {
    const r = about();
    expect(r.endpoints.dataset).toBe(`${site.url}/tools.json`);
    expect(r.endpoints.plainText).toBe(`${site.url}/llms-full.txt`);
    expect(r.endpoints.mcp).toBe(`${site.url}/mcp`);
  });

  it("carries the citation instruction, because an uncited answer is useless", () => {
    expect(about().citation).toMatch(/<section>\/<tool>/);
  });
});

describe("nothing here ranks by popularity", () => {
  it("no result shape carries a popularity field to sort on", () => {
    // The dataset has no stars, no traffic and no score, so there is nothing for
    // a future edit to sort by — and nothing for a reader to accuse it of
    // sorting by. Asserted on the shapes so adding such a field fails here.
    const shapes = [
      ...searchTools({ limit: 50 }),
      layerOverlaps().overlaps.flatMap((s) => s.tools),
    ];
    for (const row of shapes) {
      expect(Object.keys(row).join(",")).not.toMatch(/star|rank|score|popular|upvote/i);
    }
  });

  it("names no superlative anywhere in the server's own copy", () => {
    // `strategy/02-unique-selling-points.md` §"What to refuse": never a
    // superlative. The server's strings are read by a model that will repeat
    // them, so a superlative here propagates further than one on a page.
    const strings = JSON.stringify([
      about(),
      listLayers(),
      listComparisons(),
      TOOL_MANIFEST,
    ]).toLowerCase();
    for (const banned of ["the best ", "largest", "most comprehensive", "#1"]) {
      expect(strings, `server copy contains "${banned}"`).not.toContain(banned);
    }
  });
});

describe("recommend_stack", () => {
  it("is published in the manifest with a workload enum the engine accepts", () => {
    // An undeclared argument is silently ignored by the handler, and a model
    // would then read a recommendation for the wrong case as though it had
    // specified the constraint. The enum is the contract.
    const tool = TOOL_MANIFEST.find((t) => t.name === "recommend_stack");
    expect(tool).toBeDefined();
    const schema = tool!.inputSchema as unknown as {
      required?: readonly string[];
      properties: Record<string, { enum?: readonly string[] }>;
    };
    expect(schema.required).toEqual(["workload"]);
    expect([...(schema.properties.workload.enum ?? [])]).toEqual([
      "rag",
      "agent",
      "chatbot",
      "voice",
      "search",
      "llm-api",
      "finetuned",
    ]);
  });

  it("recommends a pick per required layer, each with a reason and a way out", () => {
    const r = recommendStack({ workload: "rag", queriesPerMonth: 200_000 });
    expect(r.picks.length).toBeGreaterThan(2);
    for (const pick of r.picks) {
      expect(pick.why.length, `${pick.tool}: why`).toBeGreaterThan(10);
      // The skip-when is the field the whole site sells, and a stack
      // recommendation is where a model is most likely to over-commit.
      expect(pick.watchOut.length, `${pick.tool}: watchOut`).toBeGreaterThan(10);
    }
  });

  it("gives every pick an absolute, resolvable url", () => {
    // A model that cannot resolve a citation will paraphrase instead, which is
    // the outcome the citation instruction in `about()` exists to prevent.
    for (const pick of recommendStack({ workload: "agent", queriesPerMonth: 100_000 }).picks) {
      expect(pick.url, pick.tool).toMatch(new RegExp(`^${site.url}/[a-z0-9-]+/[a-z0-9-]+$`));
    }
  });

  it("states every constraint the caller left unset", () => {
    // The whole honesty argument: an agent that passes only `workload` must be
    // able to tell it has a recommendation for the median case, not for theirs.
    const bare = recommendStack({ workload: "rag" });
    expect(bare.assumptions.length).toBeGreaterThan(2);
    expect(bare.assumptions.join(" ")).toMatch(/unset/i);

    const full = recommendStack({
      workload: "rag",
      queriesPerMonth: 500_000,
      documents: 2_000_000,
      latency: "fast",
      safety: "pii",
      durability: "hours",
      language: "python",
    });
    expect(full.assumptions).toEqual([]);
  });

  it("labels the cost figure as a band, not a quote", () => {
    // A hard number here would be the single most citable and least defensible
    // claim the site could make, because it would read as vendor pricing.
    const r = recommendStack({ workload: "llm-api", queriesPerMonth: 900_000 });
    expect(r.cost.note).toMatch(/not a vendor quote|heuristic/i);
    expect(r.cost.lowPerMonth).toBeLessThanOrEqual(r.cost.highPerMonth);
  });

  it("links to a builder url that reproduces the same recommendation", () => {
    // The URL is the save, on the page and here. If it did not round-trip, the
    // citation a model hands a human would land on a different stack.
    const input = { workload: "search" as const, queriesPerMonth: 300_000, latency: "fast" as const };
    const r = recommendStack(input);
    expect(r.builderUrl).toBe(`${site.url}/stack-builder?${encodeStackInput(input)}`);
  });

  it("varies with the constraints, so the tool is not a fixed answer", () => {
    const cheap = recommendStack({ workload: "llm-api", queriesPerMonth: 10_000, costVsPerf: -2 });
    const fast = recommendStack({ workload: "llm-api", queriesPerMonth: 10_000, costVsPerf: 2 });
    expect(cheap.picks.map((p) => p.tool)).not.toEqual(fast.picks.map((p) => p.tool));
  });

  it("names no superlative, like every other surface on the server", () => {
    const copy = JSON.stringify(recommendStack({ workload: "rag", queriesPerMonth: 100_000 })).toLowerCase();
    for (const banned of ["the best ", "largest", "most comprehensive"]) {
      expect(copy).not.toContain(banned);
    }
  });
});

describe("MCP resources", () => {
  it("describes one resource per essay, comparison, symptom and term", () => {
    expect(RESOURCE_DESCRIPTIONS.length).toBe(
      posts.length + resolvedComparisons.length + resolvedSymptoms.length + glossary.length,
    );
    const uris = RESOURCE_DESCRIPTIONS.map((r) => r.uri);
    expect(new Set(uris).size).toBe(uris.length);
  });

  it("uses four uri shapes, each declared as a template", () => {
    // A client that has to page ~70 entries to discover essays exist will not.
    // The templates say "there are N of these" for the cost of four rows.
    expect(RESOURCE_TEMPLATES.length).toBe(4);
    const prefixes = new Set(RESOURCE_TEMPLATES.map((t) => t.uriTemplate.split("{")[0]));
    for (const r of RESOURCE_DESCRIPTIONS) {
      expect([...prefixes].some((p) => r.uri.startsWith(p)), r.uri).toBe(true);
    }
  });

  it("reads an essay as prose, not a stub", () => {
    const slug = posts[0].meta.slug;
    const r = readResource(`text://lattice/essay/${slug}`);
    expect("text" in r).toBe(true);
    if (!("text" in r)) return;
    // Long enough to be the essay rather than its metadata: the whole reason
    // this surface exists is that a model should not have to reassemble an
    // argument out of `useWhen` strings.
    expect(r.text.length).toBeGreaterThan(1500);
    expect(r.text).toContain(posts[0].meta.title);
    // And the body came from the generated projection, not just the frontmatter.
    expect(r.text).toContain(essayBodies[slug].slice(0, 40));
  });

  it("strips MDX syntax from the body it serves", () => {
    // Serving raw MDX would hand a model `<RagPipeline />` and a frontmatter
    // export, both of which it would either echo or choke on.
    const r = readResource(`text://lattice/essay/${posts[0].meta.slug}`);
    if (!("text" in r)) throw new Error("unreachable");
    expect(r.text).not.toMatch(/^import\s/m);
    expect(r.text).not.toMatch(/export const meta/);
    // A figure becomes a marker rather than vanishing, so a gap in the prose is
    // visible rather than silent.
    expect(r.text).not.toMatch(/<(RequestPath|RagPipeline|AgentLoop|EvalFlywheel|PromptVsTune)\s*\/>/);
  });

  it("carries the recommendation and the table for a comparison", () => {
    const c = resolvedComparisons[0];
    const r = readResource(`text://lattice/compare/${c.slug}`);
    if (!("text" in r)) throw new Error("unreachable");
    expect(r.text).toContain(c.verdict);
    for (const row of c.rows) expect(r.text).toContain(row.dimension);
  });

  it("keeps the cheapest-first order for a symptom guide", () => {
    const s = resolvedSymptoms[0];
    const r = readResource(`text://lattice/fix/${s.slug}`);
    if (!("text" in r)) throw new Error("unreachable");
    const first = r.text.indexOf(s.checks[0].check);
    const second = r.text.indexOf(s.checks[1].check);
    expect(first).toBeGreaterThan(-1);
    expect(second).toBeGreaterThan(first);
  });

  it("gives every document its canonical page, so a citation resolves", () => {
    for (const desc of RESOURCE_DESCRIPTIONS) {
      const r = readResource(desc.uri);
      if (!("text" in r)) throw new Error(`unreadable: ${desc.uri}`);
      expect(r.text, desc.uri).toContain(site.url);
    }
  });

  it("names the valid URIs when asked for one that does not exist", () => {
    // A guess needs to be correctable, or the client gives up on the surface.
    const r = readResource("text://lattice/essay/nope");
    expect("error" in r).toBe(true);
    if (!("error" in r)) return;
    expect(r.error).toMatch(/resources\/list/);
    expect(r.error).toMatch(/essay\/\{slug\}/);
  });

  it("rejects a missing uri", () => {
    expect("error" in readResource(undefined)).toBe(true);
  });

  it("declares a resource capability at initialize, or clients will not look", () => {
    // The manifest is asserted by name; the capability is what makes a client
    // *offer* the surface. A resource list behind an undeclared capability is
    // invisible to every client that respects the declaration.
    const source = fs.readFileSync(new URL("../app/mcp/route.ts", import.meta.url), "utf8");
    expect(source).toMatch(/capabilities:\s*\{[\s\S]{0,80}?resources/);
  });
});

describe("list_comparisons", () => {
  it("lists the cross-layer comparisons with a verdict and a url", () => {
    const c = listComparisons();
    expect(c.comparisons.length).toBeGreaterThan(0);
    for (const one of c.comparisons) {
      expect(one.verdict).toBeTruthy();
      expect(one.url).toContain("/compare/");
      expect(one.tools.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("covers every tool in the index somewhere", () => {
    // Not every tool appears in a comparison, and it should not claim to. What
    // matters is that the surface exists and is populated.
    const named = new Set(TOOL_MANIFEST.map((t) => t.name));
    expect(named.size).toBe(TOOL_MANIFEST.length);
    expect(toolCount).toBeGreaterThan(100);
  });
});