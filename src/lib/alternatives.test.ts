import { describe, expect, it } from "vitest";
import { BANDS, bandOf, hatchClass } from "./layer";
import {
  MIN_ALTERNATIVES,
  allAlternativesPages,
  getSubstitutes,
  hasAlternativesPage,
  verdictFor,
} from "./alternatives";
import { allTools, getTool, stackLayers } from "./data";

/**
 * The alternatives graph and the three-band grouping are both load-bearing
 * claims rather than presentation: "every entry says when to skip it" and
 * "the stack has three families" are only true if the data actually holds.
 */

describe("bandOf", () => {
  it("groups every layer in the dataset into a band", () => {
    for (const c of stackLayers) {
      expect(bandOf(c.layer), c.slug).not.toBeNull();
    }
  });

  it("assigns the three bands the membership the copy claims", () => {
    // The copy on the home page, in /methodology and in the moodboard all
    // names these specific layers per band. If a layer moves, those strings
    // become false, and this is the assertion that says so.
    expect(BANDS.find((b) => b.id === "compute")!.layers).toEqual([1, 2]);
    expect(BANDS.find((b) => b.id === "state")!.layers).toEqual([3, 4]);
    expect(BANDS.find((b) => b.id === "control")!.layers).toEqual([5, 6, 7, 8, 9]);
  });

  it("covers the stack exactly once, with no gaps or overlaps", () => {
    // `stackLayers` is filtered to non-null layers at runtime but the type is
    // still `number | null`, so narrow rather than asserting.
    const stack = stackLayers
      .map((c) => c.layer)
      .filter((l): l is number => l !== null)
      .sort((a, z) => a - z);
    const covered = BANDS.flatMap((b) => b.layers).sort((a, z) => a - z);
    expect(covered).toEqual(stack);
  });

  it("is null off-stack and for nonsense depths", () => {
    expect(bandOf(null)).toBeNull();
    expect(bandOf(0)).toBeNull();
    expect(bandOf(99)).toBeNull();
  });
});

describe("hatchClass", () => {
  it("distinguishes sitting in the stack from spanning it", () => {
    expect(hatchClass(3, "layer")).toBe("hatch hatch-stack");
    expect(hatchClass(9, "crosscutting")).toBe("hatch hatch-span");
  });

  it("leaves off-stack material unhatched, because it is drawn detached", () => {
    expect(hatchClass(null, "offstack")).toBe("");
  });
});

describe("getSubstitutes", () => {
  it("never lists a tool as a substitute for itself", () => {
    for (const { slug, tool } of allAlternativesPages()) {
      for (const s of getSubstitutes(slug, tool)) {
        expect(s.tool.slug, `${tool} listed itself`).not.toBe(tool);
      }
    }
  });

  it("never returns the same tool twice under different sections", () => {
    for (const { slug, tool } of allAlternativesPages()) {
      const keys = getSubstitutes(slug, tool).map(
        (s) => `${s.category.slug}/${s.tool.slug}`,
      );
      expect(new Set(keys).size, `${tool} has a duplicate substitute`).toBe(keys.length);
    }
  });

  it("every substitute is a real tool in the index", () => {
    const names = new Set(allTools.map((t) => t.name));
    for (const { slug, tool } of allAlternativesPages()) {
      for (const s of getSubstitutes(slug, tool)) {
        expect(names.has(s.tool.name), `${tool} -> unknown ${s.tool.name}`).toBe(true);
      }
    }
  });

  it("describes a cross-layer entry as adjacent rather than a swap", () => {
    // The distinction the whole page rests on. A different-layer substitute
    // that is described as a like-for-like replacement is the single most
    // misleading thing this surface could do.
    for (const { slug, tool } of allAlternativesPages()) {
      const subject = getTool(slug, tool)!;
      for (const s of getSubstitutes(slug, tool)) {
        if (s.category.layer !== subject.category.layer) {
          expect(s.angle, `${tool} -> ${s.tool.name}`).toMatch(/Different layer/);
        } else {
          expect(s.angle, `${tool} -> ${s.tool.name}`).toMatch(/Same layer/);
        }
      }
    }
  });

  it("respects the cap so the page cannot become an undifferentiated list", () => {
    for (const { slug, tool } of allAlternativesPages()) {
      expect(getSubstitutes(slug, tool).length).toBeLessThanOrEqual(12);
    }
  });
});

describe("hasAlternativesPage", () => {
  it("only grants a page where there is enough to say", () => {
    // Two rows and no verdict looks like an answer and is not one, which is
    // worse than no page at all.
    for (const t of allTools) {
      const n = getSubstitutes(t.category.slug, t.slug).length;
      expect(
        hasAlternativesPage(t.category.slug, t.slug),
        `${t.name} has ${n} substitutes`,
      ).toBe(n >= MIN_ALTERNATIVES);
    }
  });

  it("generates a param set with no duplicates", () => {
    const pages = allAlternativesPages();
    const keys = pages.map((p) => `${p.slug}/${p.tool}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("verdictFor", () => {
  it("refuses to name an overall winner, because the constraints are unknown", () => {
    // The one thing this surface must never do is what a vendor comparison
    // page does, since the whole point of it is that it is not written by one.
    for (const { slug, tool } of allAlternativesPages()) {
      const found = getTool(slug, tool)!;
      const v = verdictFor(found.tool, found.category, getSubstitutes(slug, tool));
      expect(v, tool).toMatch(/no overall winner/i);
    }
  });

  it("states the substitute count it is describing", () => {
    for (const { slug, tool } of allAlternativesPages()) {
      const found = getTool(slug, tool)!;
      const subs = getSubstitutes(slug, tool);
      const v = verdictFor(found.tool, found.category, subs);
      expect(v, tool).toContain(`${subs.length}`);
    }
  });

  it("is empty rather than misleading when there is nothing to say", () => {
    const found = getTool("inference-serving", "vllm")!;
    expect(verdictFor(found.tool, found.category, [])).toBe("");
  });
});