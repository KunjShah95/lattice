import { describe, expect, it } from "vitest";
import { categories } from "./data";
import {
  CATEGORY_GUIDANCE,
  PAGE_GUIDANCE,
  categoryGuidance,
  rulesForSections,
  rulesFromComparisons,
} from "./guidance";

const all = [
  ...Object.entries(CATEGORY_GUIDANCE),
  ...Object.entries(PAGE_GUIDANCE),
] as const;

describe("rules of thumb and quick answers", () => {
  it("covers every stack section", () => {
    for (const c of categories) {
      expect(CATEGORY_GUIDANCE[c.slug], c.slug).toBeDefined();
      expect(categoryGuidance(c.slug).rules.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("writes each rule as a claim followed by the move", () => {
    // Two or three sentences, short enough to quote whole.
    for (const [key, g] of all) {
      expect(g.rules.length, key).toBeGreaterThan(0);
      for (const rule of g.rules) {
        const sentences = rule.split(/(?<=[.!?])\s+(?=[A-Z'])/).length;
        expect(sentences, `${key}: ${rule}`).toBeGreaterThanOrEqual(2);
        expect(sentences, `${key}: ${rule}`).toBeLessThanOrEqual(3);
        expect(rule.split(/\s+/).length, `${key}: ${rule}`).toBeLessThanOrEqual(40);
        expect(rule.endsWith("."), `${key}: ${rule}`).toBe(true);
      }
    }
  });

  it("phrases each quick answer as a question with a self-contained answer", () => {
    for (const [key, g] of all) {
      for (const qa of g.answers) {
        expect(qa.question.endsWith("?"), `${key}: ${qa.question}`).toBe(true);
        const words = qa.answer.split(/\s+/).length;
        expect(words, `${key}: ${qa.question}`).toBeGreaterThanOrEqual(8);
        expect(words, `${key}: ${qa.question}`).toBeLessThanOrEqual(75);
      }
    }
  });

  it("never repeats a rule within one page", () => {
    for (const [key, g] of all) {
      expect(new Set(g.rules).size, key).toBe(g.rules.length);
    }
  });

  it("derives stack and fix rules from their sources", () => {
    const stack = rulesForSections(["retrieval-vector-stores", "evaluation-observability"]);
    expect(stack).toEqual([
      CATEGORY_GUIDANCE["retrieval-vector-stores"].rules[0],
      CATEGORY_GUIDANCE["evaluation-observability"].rules[0],
    ]);
    expect(rulesFromComparisons(["llm-gateways", "inference-runtimes"]).length).toBe(2);
    expect(rulesFromComparisons(["does-not-exist"])).toEqual([]);
  });
});
