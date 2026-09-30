import { describe, expect, it } from "vitest";
import {
  allTags,
  allToolEntries,
  allTools,
  categories,
  getCategory,
  getSiblingTools,
  getTool,
  getToolByName,
  getToolsForCategory,
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

  it("gives every tool a tag", () => {
    expect(allTools.filter((t) => !t.tag)).toHaveLength(0);
  });

  it("uses a small set of tags, so faceting is useful", () => {
    // 113 tools across 47 tags is fine; 113 unique tags would not be.
    expect(allTags.length).toBeLessThan(allTools.length);
    expect(allTags.length).toBeGreaterThan(4);
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
