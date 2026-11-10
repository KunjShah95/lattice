import { afterEach, describe, expect, it, vi } from "vitest";
import { stackLayers } from "./data";
import {
  WORKLOAD_PAGE_CASE,
  perCaseCardsEnabled,
  stackCardData,
  stackCardDescription,
  stackCardUrl,
  volumeLabel,
} from "./stack-card";
import { stackInputFromSearch } from "./stack-url";
import { recommendStack, WORKLOADS } from "./stacks";

afterEach(() => vi.unstubAllEnvs());

describe("stack card data", () => {
  const input = { workload: "rag" as const, queriesPerMonth: 200_000, documents: 1_000_000 };

  it("draws all nine layers, surface first, like the live diagram", () => {
    const card = stackCardData(input);
    expect(card.rows).toHaveLength(stackLayers.length);
    expect(card.rows.map((r) => r.layer)).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1]);
  });

  it("puts each pick in its own layer's row, and only there", () => {
    const result = recommendStack(input);
    const card = stackCardData(input, result);
    for (const pick of result.picks) {
      const row = card.rows.find((r) => r.name === stackLayers.find((c) => c.slug === pick.sectionSlug)!.short);
      expect(row?.tool, pick.section).toBe(pick.tool);
    }
    expect(card.rows.filter((r) => r.tool !== null)).toHaveLength(result.picks.length);
  });

  it("leaves a layer the workload does not use empty rather than dropping it", () => {
    const card = stackCardData({ workload: "llm-api", queriesPerMonth: 100_000 });
    expect(card.rows.some((r) => r.tool === null)).toBe(true);
    expect(card.rows).toHaveLength(9);
  });

  it("lists the picked tools substrate first, for the alt text and the description", () => {
    const card = stackCardData(input);
    const lit = [...card.rows].reverse().filter((r) => r.tool).map((r) => r.tool);
    expect(card.tools).toEqual(lit);
  });

  it("states the case and the cost band", () => {
    const card = stackCardData({ ...input, selfHosted: true });
    expect(card.case).toBe("200K requests a month · 1M documents · self-hosted");
    expect(card.cost).toMatch(/^\$[\d,]+ to \$[\d,]+ a month$/);
    expect(card.label).toBe("RAG application");
  });

  it("describes the answer once, with the volume and the skip-when promise", () => {
    const d = stackCardDescription(stackCardData(input));
    expect(d).toContain("200K requests a month");
    expect(d).toContain("when to skip it");
    expect(d.length).toBeLessThan(300);
  });

  it("covers every workload the builder offers, from a link", () => {
    for (const w of WORKLOADS) {
      const fromLink = stackInputFromSearch(`?workload=${w.id}&q=50000`);
      expect(fromLink, w.id).not.toBeNull();
      expect(stackCardData(fromLink!).tools.length, w.id).toBeGreaterThan(1);
    }
  });

  it("matches the case a workload's own page describes", () => {
    expect(WORKLOAD_PAGE_CASE.queriesPerMonth).toBe(100_000);
  });
});

describe("volume labels", () => {
  it("says a volume the way a person does", () => {
    expect(volumeLabel(800)).toBe("800");
    expect(volumeLabel(8_000)).toBe("8K");
    expect(volumeLabel(200_000)).toBe("200K");
    expect(volumeLabel(1_500)).toBe("1.5K");
    expect(volumeLabel(2_000_000)).toBe("2M");
    expect(volumeLabel(10_000_000)).toBe("10M");
  });
});

describe("where a card lives", () => {
  const input = { workload: "agent" as const, queriesPerMonth: 50_000 };

  it("is off unless the runtime can read fonts", () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("LATTICE_DYNAMIC_CARDS", "");
    expect(perCaseCardsEnabled()).toBe(false);
    expect(stackCardUrl("https://x.test", input)).toBe("https://x.test/stack-card/default");
  });

  it("is on for Vercel and for an explicit opt-in", () => {
    vi.stubEnv("VERCEL", "1");
    expect(perCaseCardsEnabled()).toBe(true);
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("LATTICE_DYNAMIC_CARDS", "1");
    expect(perCaseCardsEnabled()).toBe(true);
  });

  it("points at the case when enabled, and at the default for no case", () => {
    vi.stubEnv("LATTICE_DYNAMIC_CARDS", "1");
    expect(stackCardUrl("https://x.test", input)).toMatch(/^https:\/\/x\.test\/stack-card\?workload=agent&q=50000/);
    expect(stackCardUrl("https://x.test", null)).toBe("https://x.test/stack-card/default");
  });
});
