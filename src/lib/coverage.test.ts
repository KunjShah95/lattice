import { describe, expect, it } from "vitest";
import { stackLayers } from "./data";
import { extremeLayers, joinNames, layerCoverage, type CoverageRow } from "./coverage";

const row = (short: string, count: number): CoverageRow => ({
  slug: short.toLowerCase(),
  index: "00",
  short,
  layer: 1,
  count,
  share: 0,
});

describe("layerCoverage", () => {
  const rows = layerCoverage();

  it("has one row per in-stack layer, in stack order", () => {
    expect(rows.map((r) => r.slug)).toEqual(stackLayers.map((c) => c.slug));
    expect(rows.map((r) => r.layer)).toEqual([...rows.map((r) => r.layer)].sort((a, b) => a - b));
  });

  it("counts the entries each layer really holds", () => {
    for (const r of rows) {
      const section = stackLayers.find((c) => c.slug === r.slug)!;
      expect(r.count, r.slug).toBe(section.tools.length);
    }
  });

  it("excludes off-stack material, which has no layer", () => {
    expect(rows.some((r) => r.slug === "learning-reference")).toBe(false);
  });

  it("scales bars against the fullest layer", () => {
    expect(Math.max(...rows.map((r) => r.share))).toBe(1);
    for (const r of rows) {
      expect(r.share, r.slug).toBeGreaterThan(0);
      expect(r.share, r.slug).toBeLessThanOrEqual(1);
    }
  });
});

describe("extremeLayers", () => {
  it("returns every layer that ties for the extreme, not a fixed number", () => {
    const rows = [row("A", 8), row("B", 8), row("C", 12), row("D", 12), row("E", 10)];
    expect(extremeLayers(rows, "thinnest").map((r) => r.short)).toEqual(["A", "B"]);
    expect(extremeLayers(rows, "fullest").map((r) => r.short)).toEqual(["C", "D"]);
  });

  it("is empty for no rows rather than throwing", () => {
    expect(extremeLayers([], "thinnest")).toEqual([]);
  });
});

describe("joinNames", () => {
  it("reads as prose", () => {
    expect(joinNames([])).toBe("");
    expect(joinNames(["Guardrails"])).toBe("Guardrails");
    expect(joinNames(["Guardrails", "Prompts"])).toBe("Guardrails and Prompts");
    expect(joinNames(["A", "B", "C"])).toBe("A, B and C");
  });
});

describe("the methodology's coverage claim", () => {
  /**
   * `/methodology` renders its "coverage is uneven" sentence from `extremeLayers`
   * rather than naming layers by hand. This pins why: the hand-written version
   * said workflow orchestration and guardrails were the thinnest, and by entry
   * count Prompts (thinner than Workflows) was missing from it. The check is the
   * invariant, not the current numbers, so it stays true as the dataset grows.
   */
  const rows = layerCoverage();
  const thin = extremeLayers(rows, "thinnest");
  const full = extremeLayers(rows, "fullest");

  it("names layers that are genuinely at the extremes", () => {
    const counts = rows.map((r) => r.count);
    for (const r of thin) expect(r.count).toBe(Math.min(...counts));
    for (const r of full) expect(r.count).toBe(Math.max(...counts));
  });

  it("never names the same layer as both fullest and thinnest", () => {
    // Only possible if every layer has the same count, in which case "uneven" is
    // false and the page should say so rather than name an arbitrary extreme.
    const overlap = thin.filter((t) => full.some((f) => f.slug === t.slug));
    expect(overlap).toEqual([]);
  });
});
