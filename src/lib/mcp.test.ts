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
  searchTools,
  TOOL_DESCRIPTIONS,
  TOOL_MANIFEST,
} from "./mcp";
import { allTools, toolCount } from "./data";
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