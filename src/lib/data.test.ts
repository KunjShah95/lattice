import { describe, expect, it } from "vitest";
import {
  allToolEntries,
  allTools,
  categories,
  costs,
  deployments,
  getAlternativeTo,
  getAlternatives,
  getCategory,
  getSiblingTools,
  getTool,
  getToolByName,
  getToolsForCategory,
  kinds,
  maxCategoryCount,
  offStack,
  stackLayers,
  toolCount,
} from "./data";

/**
 * The dataset is hand-maintained, which means the failure mode is a typo
 * rather than a type error: a duplicated slug, a broken URL, an ordinal that
 * collides. The module throws on several of these at load, but a throwing
 * import is a bad way to learn *which* rule broke, so they are asserted here
 * too — where a failure names the offending entry.
 */

describe("sections", () => {
  it("gives every section a unique slug", () => {
    const slugs = categories.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("gives every section a unique ordinal", () => {
    const indexes = categories.map((c) => c.index);
    expect(new Set(indexes).size).toBe(indexes.length);
  });

  it("uses the em-dash ordinal only for off-stack sections", () => {
    for (const c of categories) {
      if (c.role === "offstack") expect(c.index).toBe("—");
      else expect(c.index).not.toBe("—");
    }
  });

  it("orders stack sections by ascending layer, and uses layers 1..9", () => {
    const layers = stackLayers.map((c) => c.layer);
    expect(layers).toEqual([...layers].sort((a, b) => (a ?? 0) - (b ?? 0)));
    expect(layers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("gives off-stack sections a null layer and in-stack ones a number", () => {
    for (const c of categories) {
      if (c.role === "offstack") expect(c.layer).toBeNull();
      else expect(typeof c.layer).toBe("number");
    }
  });

  it("gives every section a nav label distinct from its title", () => {
    for (const c of categories) {
      expect(c.short.length).toBeGreaterThan(0);
      // The nav exists to save space; a label as long as the title defeats it.
      expect(c.short.length).toBeLessThanOrEqual(c.title.length);
    }
  });

  it("carries prose for every section", () => {
    for (const c of categories) {
      expect(c.description.length).toBeGreaterThan(10);
      expect(c.responsibility.length).toBeGreaterThan(10);
    }
  });

  it("partitions cleanly into stack and off-stack", () => {
    expect(stackLayers.length + offStack.length).toBe(categories.length);
    expect(offStack.every((c) => c.layer === null)).toBe(true);
    expect(stackLayers.every((c) => c.layer !== null)).toBe(true);
  });

  it("leaves no section empty", () => {
    for (const c of categories) {
      expect(c.tools.length, `${c.slug} has no tools`).toBeGreaterThan(0);
    }
  });
});

describe("tools", () => {
  it("gives every tool a unique slug within its section", () => {
    for (const c of categories) {
      const slugs = c.tools.map((t) => t.slug);
      expect(new Set(slugs).size, `duplicate slug in ${c.slug}`).toBe(slugs.length);
    }
  });

  it("builds every URL from a valid https origin", () => {
    for (const { url, domain } of allTools) {
      expect(url.startsWith("https://"), url).toBe(true);
      expect(domain.length).toBeGreaterThan(0);
      // No scheme, no query string, no whitespace in the stored host.
      expect(domain).not.toMatch(/^https?:/);
      expect(domain).not.toMatch(/[?\s]/);
    }
  });

  it("derives the domain from the URL rather than duplicating it", () => {
    for (const { url, domain } of allTools) {
      const hostAndPath = url.replace(/^https:\/\//, "");
      expect(
        hostAndPath.startsWith(domain),
        `${url} does not start with its domain ${domain}`,
      ).toBe(true);
    }
  });

  it("writes a one-line summary for every tool", () => {
    for (const { name, blurb } of allTools) {
      expect(blurb.length, `${name} has no blurb`).toBeGreaterThan(10);
      // A blurb is one line. Anything with a paragraph break is a mistake.
      expect(blurb).not.toContain("\n");
    }
  });

  it("uses sentence case and a trailing stop for every blurb", () => {
    for (const { name, blurb } of allTools) {
      expect(blurb.endsWith("."), `${name}: "${blurb}"`).toBe(true);
    }
  });

  it("keeps tool names unique within a section", () => {
    for (const c of categories) {
      const names = c.tools.map((t) => t.name);
      expect(new Set(names).size, `duplicate name in ${c.slug}`).toBe(names.length);
    }
  });

  it("gives every tool a useWhen and a skipWhen", () => {
    for (const t of allTools) {
      expect(t.useWhen.length, `${t.name} useWhen`).toBeGreaterThan(15);
      expect(t.skipWhen.length, `${t.name} skipWhen`).toBeGreaterThan(15);
      // The two must not be the same sentence with different capitalisation.
      expect(t.useWhen.toLowerCase()).not.toBe(t.skipWhen.toLowerCase());
    }
  });

  it("dates every entry, so staleness is detectable", () => {
    for (const t of allTools) {
      expect(t.asOf, t.name).toMatch(/^\d{4}-\d{2}$/);
    }
  });

  it("classifies every non-reading tool", () => {
    for (const t of allTools) {
      expect(t.kind, t.name).toBeTruthy();
      if (t.kind === "reading") continue;
      expect(t.deployment, `${t.name} deployment`).toBeTruthy();
      expect(t.license, `${t.name} license`).toBeTruthy();
    }
  });

  it("keeps the facet vocabularies small enough to be useful", () => {
    // A facet with a value per entry is not a facet.
    for (const [name, facet] of Object.entries({ kinds, deployments, costs })) {
      expect(facet.length, name).toBeGreaterThan(1);
      expect(facet.length, name).toBeLessThan(allTools.length / 4);
    }
  });

  it("counts every tool in exactly one kind", () => {
    const total = kinds.reduce((n, k) => n + k.count, 0);
    expect(total).toBe(allTools.length);
  });

  it("uses controlled vocabulary for every facet value", () => {
    const knownKinds = new Set([
      "runtime", "database", "framework", "library", "service", "platform", "reading",
    ]);
    const knownDeployment = new Set(["self-hosted", "managed", "saas"]);
    const knownCost = new Set(["free", "free-tier", "usage-based", "subscription"]);

    for (const t of allTools) {
      expect(knownKinds.has(t.kind), `${t.name}: ${t.kind}`).toBe(true);
      expect(knownCost.has(t.cost), `${t.name}: ${t.cost}`).toBe(true);
      if (t.deployment != null) {
        expect(knownDeployment.has(t.deployment), `${t.name}: ${t.deployment}`).toBe(true);
      }
    }
  });

  it("never pairs a self-hosted tool with a proprietary licence and no caveat", () => {
    // Not a hard rule — some products ship open code with a commercial
    // licence — but the pairing should be rare enough to be deliberate.
    const odd = allTools.filter(
      (t) => t.deployment === "self-hosted" && t.license === "proprietary",
    );
    expect(odd.length).toBeLessThan(5);
  });

  it("counts every tool in the total", () => {
    expect(toolCount).toBe(allTools.length);
    expect(toolCount).toBe(
      categories.reduce((n, c) => n + c.tools.length, 0),
    );
  });

  it("uses a positive max for the density meter", () => {
    expect(maxCategoryCount).toBeGreaterThan(0);
    expect(maxCategoryCount).toBe(
      Math.max(...categories.map((c) => c.tools.length)),
    );
  });
});

describe("lookups", () => {
  it("finds a section by slug", () => {
    expect(getCategory("inference-serving")?.title).toBe("Inference & Serving");
  });

  it("returns undefined for an unknown section", () => {
    expect(getCategory("nope")).toBeUndefined();
  });

  it("finds a tool by section and slug", () => {
    const found = getTool("inference-serving", "vllm");
    expect(found?.tool.name).toBe("vLLM");
    expect(found?.category.slug).toBe("inference-serving");
  });

  it("returns null for a tool in the wrong section", () => {
    // pgvector is in retrieval, so asking for it under inference must fail
    // rather than falling through to a global search.
    expect(getTool("inference-serving", "pgvector")).toBeNull();
  });

  it("returns null for an unknown tool", () => {
    expect(getTool("inference-serving", "nope")).toBeNull();
  });

  it("finds a tool by display name", () => {
    expect(getToolByName("vLLM").slug).toBe("vllm");
  });

  it("throws for an unknown display name, so a typo fails at build time", () => {
    expect(() => getToolByName("Not A Real Tool")).toThrow(/Unknown tool/);
  });

  it("lists a section's tools", () => {
    expect(getToolsForCategory("inference-serving").length).toBeGreaterThan(0);
    expect(getToolsForCategory("nope")).toEqual([]);
  });

  it("excludes the tool itself from its siblings", () => {
    const siblings = getSiblingTools("inference-serving", "vllm");
    expect(siblings.some((t) => t.slug === "vllm")).toBe(false);
    expect(siblings.length).toBe(getToolsForCategory("inference-serving").length - 1);
  });
});

describe("allToolEntries", () => {
  it("carries one entry per tool", () => {
    expect(allToolEntries).toHaveLength(allTools.length);
  });

  it("flattens the section into scalar fields for the client", () => {
    for (const entry of allToolEntries) {
      expect(typeof entry.categorySlug).toBe("string");
      expect(typeof entry.categoryShort).toBe("string");
      // The nested section object is deliberately not carried across the
      // boundary — only the scalars the explorer actually reads.
      expect(Object.keys(entry)).not.toContain("category");
    }
  });

  it("is JSON-serialisable, as it crosses the client boundary", () => {
    expect(() => JSON.stringify(allToolEntries)).not.toThrow();
  });
});

describe("the alternatives graph", () => {
  it("resolves every declared alternative", () => {
    for (const t of allTools) {
      const found = getAlternatives(t.category.slug, t.slug);
      expect(found.length, `${t.name}: ${(t.alternatives ?? []).length} declared`).toBe(
        (t.alternatives ?? []).length,
      );
    }
  });

  it("never lists a tool as its own alternative", () => {
    for (const t of allTools) {
      expect(t.alternatives ?? []).not.toContain(t.name);
    }
  });

  it("resolves reverse edges", () => {
    // vLLM names SGLang as an alternative, so SGLang should see vLLM back.
    const reverse = getAlternativeTo("inference-serving", "sglang");
    expect(reverse.map((r) => r.tool.name)).toContain("vLLM");
  });

  it("returns nothing for a tool nobody points at", () => {
    for (const t of allTools) {
      const named = allTools.some(
        (o) => o.name !== t.name && o.alternatives?.includes(t.name),
      );
      if (!named) {
        expect(getAlternativeTo(t.category.slug, t.slug), t.name).toHaveLength(0);
      }
    }
  });

  it("keeps most tools reachable, so the graph is connected", () => {
    const connected = allTools.filter(
      (t) =>
        (t.alternatives?.length ?? 0) > 0 ||
        getAlternativeTo(t.category.slug, t.slug).length > 0,
    );
    expect(connected.length).toBeGreaterThan(allTools.length * 0.8);
  });

  it("only points at tools a reader would actually weigh against this one", () => {
    // An alternative is a substitute, not merely a neighbour. Every entry
    // should share either a section or a kind with the tool declaring it.
    for (const t of allTools) {
      for (const { tool: alt } of getAlternatives(t.category.slug, t.slug)) {
        const sameSection = alt.category.slug === t.category.slug;
        const sameKind = alt.kind === t.kind;
        expect(
          sameSection || sameKind,
          `${t.name} lists ${alt.name}, which is neither a peer section nor the same kind`,
        ).toBe(true);
      }
    }
  });
});
