import { describe, expect, it } from "vitest";
import { getSymptom, resolvedSymptoms, symptomQuestions, symptoms } from "./symptoms";

/**
 * Symptom pages are checklists that name tools, comparisons and essays. The
 * resolver throws on dead references at build time; these pin the editorial
 * shape that makes the pages worth citing.
 */

const words = (s: string) => s.trim().split(/\s+/).length;

describe("symptoms", () => {
  it("has unique, URL-safe slugs", () => {
    const slugs = symptoms.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9-]+$/);
  });

  it("phrases every title as the question a reader types", () => {
    for (const s of symptoms) expect(s.title.endsWith("?"), s.slug).toBe(true);
  });

  it("answers in a passage that stands alone (40–75 words)", () => {
    for (const s of symptoms) {
      expect(words(s.answer), s.slug).toBeGreaterThanOrEqual(40);
      expect(words(s.answer), s.slug).toBeLessThanOrEqual(75);
    }
  });

  it("keeps meta descriptions inside the snippet budget", () => {
    for (const s of symptoms) {
      expect(s.description.length, s.slug).toBeGreaterThan(50);
      expect(s.description.length, s.slug).toBeLessThan(200);
    }
  });

  it("gives at least four ordered checks, each with a reason", () => {
    for (const s of symptoms) {
      expect(s.checks.length, s.slug).toBeGreaterThanOrEqual(4);
      for (const c of s.checks) expect(c.why.length, `${s.slug}: ${c.check}`).toBeGreaterThan(40);
    }
  });

  it("names the moves that are not fixes", () => {
    for (const s of symptoms) expect(s.notTheFix.length, s.slug).toBeGreaterThanOrEqual(2);
  });

  it("resolves every tool with its skip-when sentence", () => {
    for (const s of resolvedSymptoms) {
      for (const c of s.checks) {
        for (const t of c.tools) {
          expect(t.href, t.name).toMatch(/^\/[a-z0-9-]+\/[a-z0-9-]+$/);
          expect(t.skipWhen.length, t.name).toBeGreaterThan(0);
        }
      }
    }
  });

  it("links onward to at least one comparison and one essay", () => {
    for (const s of resolvedSymptoms) {
      expect(s.comparisons.length, s.slug).toBeGreaterThanOrEqual(1);
      expect(s.related.length, s.slug).toBeGreaterThanOrEqual(1);
    }
  });

  it("covers every band at least once across the set", () => {
    const bands = new Set(resolvedSymptoms.map((s) => s.band));
    for (const b of ["compute", "state", "control"]) expect(bands.has(b as never), b).toBe(true);
  });

  it("files each symptom under the band whose failure it sounds like", () => {
    expect(getSymptom("llm-app-too-slow")?.band).toBe("compute");
    expect(getSymptom("llm-costs-too-high")?.band).toBe("compute");
    expect(getSymptom("llm-wrong-answers")?.band).toBe("state");
    expect(getSymptom("ai-agent-unreliable")?.band).toBe("control");
  });

  it("builds a FAQ that leads with the title question", () => {
    for (const s of symptoms) {
      const qs = symptomQuestions(s);
      expect(qs[0]).toEqual({ question: s.title, answer: s.answer });
      expect(qs.every((q) => q.question.endsWith("?"))).toBe(true);
    }
  });
});
