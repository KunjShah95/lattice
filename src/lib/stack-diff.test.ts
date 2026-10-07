import { describe, expect, it } from "vitest";
import { recommendStack, type StackInput, type StackPick } from "./stacks";
import { describeChange, diffPicks } from "./stack-diff";

const pick = (sectionSlug: string, tool: string): StackPick =>
  ({ sectionSlug, section: sectionSlug.toUpperCase(), tool }) as StackPick;

describe("diffPicks", () => {
  it("is empty when nothing changed", () => {
    const a = [pick("s1", "A"), pick("s2", "B")];
    expect(diffPicks(a, [...a])).toEqual([]);
  });

  it("reports a swapped tool under the section it happened in", () => {
    const d = diffPicks([pick("s1", "A"), pick("s2", "B")], [pick("s1", "A"), pick("s2", "C")]);
    expect(d).toEqual([{ sectionSlug: "s2", section: "S2", from: "B", to: "C" }]);
  });

  it("reports a layer that gained or lost its pick", () => {
    expect(diffPicks([pick("s1", "A")], [pick("s1", "A"), pick("s2", "B")])).toEqual([
      { sectionSlug: "s2", section: "S2", from: null, to: "B" },
    ]);
    expect(diffPicks([pick("s1", "A"), pick("s2", "B")], [pick("s1", "A")])).toEqual([
      { sectionSlug: "s2", section: "S2", from: "B", to: null },
    ]);
  });

  it("matches by section, so reordering is not a change", () => {
    expect(diffPicks([pick("s1", "A"), pick("s2", "B")], [pick("s2", "B"), pick("s1", "A")])).toEqual([]);
  });
});

describe("describeChange", () => {
  it("reads as a sentence for each kind of change", () => {
    expect(describeChange({ sectionSlug: "s", section: "Retrieval", from: "A", to: "B" })).toBe(
      "Retrieval: A → B",
    );
    expect(describeChange({ sectionSlug: "s", section: "Retrieval", from: null, to: "B" })).toBe(
      "Retrieval: now B",
    );
    expect(describeChange({ sectionSlug: "s", section: "Retrieval", from: "A", to: null })).toBe(
      "Retrieval: A no longer fits",
    );
  });
});

describe("against the real engine", () => {
  const base: StackInput = {
    workload: "rag",
    queriesPerMonth: 500_000,
    documents: 10_000_000,
    latency: "fast",
    filtering: "heavy",
  };

  it("is deterministic: the same answers diff to nothing", () => {
    expect(diffPicks(recommendStack(base).picks, recommendStack({ ...base }).picks)).toEqual([]);
  });

  it("only ever names sections that exist in one of the two stacks", () => {
    const a = recommendStack(base).picks;
    const b = recommendStack({ ...base, workload: "agent" }).picks;
    const known = new Set([...a, ...b].map((p) => p.sectionSlug));
    for (const c of diffPicks(a, b)) expect(known.has(c.sectionSlug)).toBe(true);
    // A different workload needs different sections, so something must have changed.
    expect(diffPicks(a, b).length).toBeGreaterThan(0);
  });
});
