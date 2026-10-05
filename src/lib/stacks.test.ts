import { describe, expect, it } from "vitest";
import { recommendStack, WORKLOADS } from "./stacks";
import { allTools, categories, getToolByName } from "./data";

const sectionOf = (toolName: string) =>
  allTools.find((t) => t.name === toolName)?.category.slug;

describe("recommendStack — genuine subsystem search", () => {
  it("covers every workload with the workload's own sections", () => {
    for (const w of WORKLOADS) {
      const r = recommendStack({ workload: w.id, queriesPerMonth: 100_000 });
      expect(r.picks.length).toBeGreaterThanOrEqual(3);
      for (const p of r.picks) {
        // Every pick resolves to a real dataset entry in the claimed section.
        const entry = getToolByName(p.tool);
        expect(sectionOf(p.tool)).toBe(p.sectionSlug);
        expect(p.url).toBe(`/${p.sectionSlug}/${entry.slug}`);
        expect(p.why).toBe(entry.useWhen);
      }
    }
  });

  it("names no product that is not in the dataset", () => {
    const names = new Set(allTools.map((t) => t.name));
    for (const w of WORKLOADS) {
      const r = recommendStack({ workload: w.id, queriesPerMonth: 500_000, documents: 5_000_000 });
      for (const p of r.picks) {
        expect(names.has(p.tool)).toBe(true);
        if (p.alternative !== "—") expect(names.has(p.alternative)).toBe(true);
      }
    }
  });

  it("honours the self-hosted hard constraint across all picks", () => {
    const r = recommendStack({ workload: "llm-api", queriesPerMonth: 500_000, selfHosted: true });
    expect(r.picks.length).toBeGreaterThan(0);
    for (const p of r.picks) {
      expect(getToolByName(p.tool).deployment).toBe("self-hosted");
    }
  });

  it("honours the open-source hard constraint across all picks", () => {
    const open = new Set(["MIT", "Apache-2.0", "BSD-3-Clause", "BSL-1.1", "MPL-2.0", "PostgreSQL", "Elastic-License-2.0"]);
    const r = recommendStack({ workload: "agent", queriesPerMonth: 100_000, openSource: true });
    for (const p of r.picks) {
      expect(open.has(getToolByName(p.tool).license ?? "")).toBe(true);
    }
  });

  it("scale changes the retrieval answer without naming products", () => {
    const small = recommendStack({ workload: "rag", queriesPerMonth: 20_000, documents: 50_000 });
    const large = recommendStack({ workload: "rag", queriesPerMonth: 800_000, documents: 10_000_000 });
    const smallPick = small.picks.find((p) => p.sectionSlug === "retrieval-vector-stores")?.tool;
    const largePick = large.picks.find((p) => p.sectionSlug === "retrieval-vector-stores")?.tool;
    expect(smallPick).toBeTruthy();
    expect(largePick).toBeTruthy();
    // Both are genuine section members; scale must move the answer.
    expect(categories.find((c) => c.slug === "retrieval-vector-stores")?.tools.map((t) => t.name)).toContain(smallPick);
    expect(smallPick).not.toBe(largePick);
  });

  it("is deterministic — same input, same stack", () => {
    const a = recommendStack({ workload: "rag", queriesPerMonth: 500_000, documents: 10_000_000 });
    const b = recommendStack({ workload: "rag", queriesPerMonth: 500_000, documents: 10_000_000 });
    expect(a).toEqual(b);
  });

  it("returns a cost band, confidence and composed risk", () => {
    const r = recommendStack({ workload: "rag", queriesPerMonth: 500_000 });
    expect(r.costLow).toBeLessThan(r.costHigh);
    expect(r.confidence).toBeGreaterThanOrEqual(0.55);
    expect(r.confidence).toBeLessThanOrEqual(0.92);
    expect(r.risk.length).toBeGreaterThan(20);
  });

  it("clamps wild input instead of throwing", () => {
    const r = recommendStack({
      workload: "rag",
      queriesPerMonth: -99,
      costVsPerf: 99,
      simplicityVsControl: -99,
    } as never);
    expect(r.picks.length).toBeGreaterThan(0);
  });
});
