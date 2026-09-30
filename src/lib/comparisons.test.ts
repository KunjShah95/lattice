import { describe, expect, it } from "vitest";
import { comparisons, getComparison, resolvedComparisons } from "./comparisons";
import { getCategory, getToolByName } from "./data";
import { posts } from "./posts";

/**
 * A comparison is the most fragile thing in the dataset: it references tools
 * by name, sections by slug and essays by slug, and any of those drifting
 * produces a dead link rather than a build error. The module throws on the
 * bad cases at load; these assertions catch the subtler ones.
 */

describe("comparison metadata", () => {
  it("gives every comparison a unique slug", () => {
    const slugs = comparisons.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("returns a comparison by slug", () => {
    expect(getComparison("inference-runtimes")?.title).toBe(
      "vLLM vs SGLang vs TGI vs llama.cpp",
    );
    expect(getComparison("nope")).toBeUndefined();
  });

  it("writes a meta description within a sensible length", () => {
    for (const c of comparisons) {
      expect(c.description.length, c.slug).toBeGreaterThan(50);
      // Google truncates past ~160; anything longer is wasted effort.
      expect(c.description.length, c.slug).toBeLessThan(200);
    }
  });

  it("compares at least two tools", () => {
    for (const c of comparisons) {
      expect(c.tools.length, c.slug).toBeGreaterThanOrEqual(2);
    }
  });

  it("names each tool distinctly", () => {
    for (const c of comparisons) {
      const names = c.tools.map((t) => t.name);
      expect(new Set(names).size, `${c.slug} repeats a tool`).toBe(names.length);
    }
  });

  it("ends every verdict with a full stop, as a paragraph", () => {
    for (const c of comparisons) {
      expect(c.verdict.endsWith("."), c.slug).toBe(true);
      expect(c.verdict.length, c.slug).toBeGreaterThan(80);
    }
  });

  it("offers rules of thumb", () => {
    for (const c of comparisons) {
      expect(c.rules.length, c.slug).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("comparison tables", () => {
  it("gives one value per tool in every row", () => {
    for (const c of comparisons) {
      for (const row of c.rows) {
        expect(
          row.values.length,
          `${c.slug} / "${row.dimension}" has ${row.values.length} values for ${c.tools.length} tools`,
        ).toBe(c.tools.length);
      }
    }
  });

  it("uses distinct dimension labels", () => {
    for (const c of comparisons) {
      const dims = c.rows.map((r) => r.dimension);
      expect(new Set(dims).size, `${c.slug} repeats a dimension`).toBe(dims.length);
    }
  });

  it("leaves no cell blank — a blank cell is a question the reader cannot answer", () => {
    for (const c of comparisons) {
      for (const row of c.rows) {
        for (const [i, value] of row.values.entries()) {
          expect(value.trim().length, `${c.slug}/${row.dimension}/${c.tools[i].name}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("compares on more than one dimension", () => {
    for (const c of comparisons) {
      expect(c.rows.length, c.slug).toBeGreaterThanOrEqual(4);
    }
  });
});

describe("resolvedComparisons", () => {
  it("resolves one entry per comparison", () => {
    expect(resolvedComparisons).toHaveLength(comparisons.length);
  });

  it("resolves every tool against the dataset", () => {
    for (const c of resolvedComparisons) {
      for (const t of c.tools) {
        const found = getToolByName(t.name);
        expect(found.name, `${c.slug}: ${t.name}`).toBe(t.name);
        expect(t.url, `${c.slug}: ${t.name}`).toBe(found.url);
      }
    }
  });

  it("carries a layer for each tool, from its section", () => {
    for (const c of resolvedComparisons) {
      for (const t of c.tools) {
        expect(t.layer, `${c.slug}: ${t.name} has no layer`).toBeTypeOf("number");
      }
    }
  });

  it("resolves every section reference", () => {
    for (const c of resolvedComparisons) {
      expect(c.sections.length, c.slug).toBe(c.sections.length);
      for (const s of c.sections) {
        expect(getCategory(s.slug)?.slug, `${c.slug}: ${s.slug}`).toBe(s.slug);
      }
    }
  });

  it("only links to essays that exist", () => {
    const slugs = new Set(posts.map((p) => p.meta.slug));
    for (const c of comparisons) {
      for (const slug of c.related) {
        expect(slugs.has(slug), `${c.slug} links to missing essay "${slug}"`).toBe(true);
      }
    }
  });

  it("does not compare a tool against itself", () => {
    for (const c of resolvedComparisons) {
      const names = c.tools.map((t) => t.name);
      expect(new Set(names).size, c.slug).toBe(names.length);
    }
  });
});
