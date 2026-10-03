import { describe, expect, it } from "vitest";
import {
  comparisons,
  comparisonMetaTitle,
  comparisonQuestions,
  decisionQuestion,
  getComparison,
  resolvedComparisons,
  shortAnswer,
} from "./comparisons";
import { bandOf } from "./layer";
import { AS_OF } from "./attributes";
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

/**
 * Cross-layer comparisons are the surface no vendor will publish: "here is how
 * your gateway compares to your eval suite." Their value is that each column
 * is a different place in the stack, so the invariants are about layers, not
 * substitutability.
 */
describe("cross-layer comparisons", () => {
  const crossLayer = resolvedComparisons.filter((c) => c.kind === "cross-layer");

  it("classifies every comparison", () => {
    for (const c of comparisons) {
      expect(["substitutes", "cross-layer"], c.slug).toContain(c.kind);
    }
  });

  it("ships at least three", () => {
    expect(crossLayer.length).toBeGreaterThanOrEqual(3);
  });

  it("puts every column in a different layer", () => {
    for (const c of crossLayer) {
      const layers = c.tools.map((t) => t.layer);
      expect(new Set(layers).size, c.slug).toBe(layers.length);
    }
  });

  it("spans at least two bands — otherwise it is a substitutes page", () => {
    for (const c of crossLayer) {
      const bands = new Set(c.tools.map((t) => bandOf(t.layer)));
      expect(bands.size, c.slug).toBeGreaterThanOrEqual(2);
    }
  });

  it("lists columns in stack order, substrate first", () => {
    for (const c of crossLayer) {
      const layers = c.tools.map((t) => t.layer ?? 0);
      expect(layers, c.slug).toEqual([...layers].sort((a, b) => a - b));
    }
  });

  it("names every layer it spans as a section", () => {
    for (const c of crossLayer) {
      const sectionLayers = new Set(c.sections.map((s) => s.layer));
      for (const t of c.tools) {
        expect(sectionLayers.has(t.layer), `${c.slug}: ${t.name}`).toBe(true);
      }
    }
  });

  it("asks the adoption question, not the substitution one", () => {
    for (const c of resolvedComparisons) {
      const q = decisionQuestion(c);
      if (c.kind === "cross-layer") expect(q, c.slug).toMatch(/^Which should you adopt first/);
      else expect(q, c.slug).toMatch(/^Which should you choose/);
    }
  });
});

/**
 * Citation surface. The pages engines quoted in the category audit shared a
 * shape: the answer first, a question-form FAQ, the year in the title, and a
 * stated caveat. These pin that shape so a new comparison cannot ship without it.
 */
describe("citation surface", () => {
  const words = (s: string) => s.trim().split(/\s+/).length;

  it("lifts a short, self-contained answer from every verdict", () => {
    for (const c of resolvedComparisons) {
      const a = shortAnswer(c.verdict);
      expect(c.verdict.startsWith(a), c.slug).toBe(true);
      expect(a.endsWith("."), c.slug).toBe(true);
      expect(words(a), `${c.slug}: "${a}"`).toBeGreaterThanOrEqual(8);
      expect(words(a), `${c.slug}: "${a}"`).toBeLessThanOrEqual(75);
    }
  });

  it("asks the decision first, then one use/skip question per tool", () => {
    for (const c of resolvedComparisons) {
      const qs = comparisonQuestions(c);
      expect(qs[0].question, c.slug).toBe(decisionQuestion(c));
      expect(qs[0].answer, c.slug).toBe(c.verdict);
      expect(qs).toHaveLength(c.tools.length + 1);
      for (const [i, t] of c.tools.entries()) {
        const qa = qs[i + 1];
        expect(qa.question).toBe(`When should you use ${t.name}, and when should you skip it?`);
        const entry = getToolByName(t.name);
        expect(qa.answer).toContain(`Use ${t.name} when`);
        expect(qa.answer).toContain(`Skip it when`);
        expect(qa.answer.toLowerCase()).toContain(entry.skipWhen.slice(1, 20).toLowerCase());
      }
    }
  });

  it("puts the verification year in the meta title", () => {
    const year = AS_OF.slice(0, 4);
    for (const c of resolvedComparisons) {
      const title = comparisonMetaTitle(c);
      expect(title, c.slug).toContain(year);
      expect(title.startsWith(c.title), c.slug).toBe(true);
    }
  });
});
