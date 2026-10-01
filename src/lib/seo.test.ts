import { describe, expect, it } from "vitest";
import { allTools, getAlternatives, getSiblingTools } from "./data";
import { describeKind, listNames, lowerFirst, openness, toolDefinition, toolQuestions } from "./seo";

/**
 * The answer copy is generated for every tool, so a grammar slip is a slip on
 * 112 pages at once. These check the sentences, not just the shapes.
 */
describe("answer copy", () => {
  it("classifies licences", () => {
    expect(openness("Apache-2.0")).toBe("open-source");
    expect(openness("BSL-1.1")).toBe("source-available");
    expect(openness("proprietary")).toBe("proprietary");
    expect(openness(null)).toBe("unknown");
  });

  it("joins names as prose", () => {
    expect(listNames(["A"])).toBe("A");
    expect(listNames(["A", "B"])).toBe("A and B");
    expect(listNames(["A", "B", "C"])).toBe("A, B and C");
  });

  it("lower-cases sentence case but not names or acronyms", () => {
    expect(lowerFirst("General GPU serving")).toBe("general GPU serving");
    expect(lowerFirst("A team that ships")).toBe("a team that ships");
    expect(lowerFirst("GPU-first")).toBe("GPU-first");
    expect(lowerFirst("KV cache")).toBe("KV cache");
    expect(lowerFirst("PyTorch-native training")).toBe("PyTorch-native training");
    expect(lowerFirst("TypeScript")).toBe("TypeScript");
    expect(lowerFirst("LoRA adapters")).toBe("LoRA adapters");
    expect(lowerFirst("Python-native")).toBe("Python-native");
    expect(lowerFirst("Model Context Protocol")).toBe("Model Context Protocol");
    expect(lowerFirst("Paged attention")).toBe("paged attention");
  });

  it("describes kinds with an article", () => {
    expect(describeKind({ kind: "runtime", deployment: "self-hosted" })).toBe(
      "a self-hosted runtime",
    );
    expect(describeKind({ kind: "platform", deployment: "saas" })).toBe("a SaaS platform");
    expect(describeKind({ kind: "reading", deployment: null })).toBe("a reading resource");
  });

  it.each(allTools.map((t) => [t.name, t] as const))(
    "%s: every answer names its subject and ends as a sentence",
    (_, entry) => {
      const { category } = entry;
      const qas = toolQuestions(
        entry,
        category,
        getAlternatives(category.slug, entry.slug).map((a) => a.tool.name),
        getSiblingTools(category.slug, entry.slug).map((s) => s.name),
      );

      expect(toolDefinition(entry, category).startsWith(`${entry.name} is a`)).toBe(true);
      expect(qas[0].question).toBe(`What is ${entry.name}?`);
      for (const qa of qas) {
        expect(qa.answer.trim()).not.toBe("");
        expect(qa.answer).not.toMatch(/\.\./);
        expect(qa.answer).not.toMatch(/undefined|null/);
      }
    },
  );
});
