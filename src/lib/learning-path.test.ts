import { describe, expect, it } from "vitest";
import { getCategory, stackLayers } from "./data";
import { LESSONS, lessonAnchor } from "./learning-path";
import { getPost } from "./posts";

/**
 * The path promises one lesson per layer and one layer page per lesson. Both
 * halves break silently: a renamed section leaves a lesson linking nowhere,
 * and a tenth layer added to the index leaves the path one short.
 */
describe("the learning path", () => {
  it("teaches every stack layer exactly once", () => {
    expect(LESSONS.map((l) => l.section).sort()).toEqual(stackLayers.map((c) => c.slug).sort());
  });

  it("links each lesson to a layer that exists and an essay that exists", () => {
    for (const lesson of LESSONS) {
      expect(getCategory(lesson.section)?.layer, lesson.section).toBeTruthy();
      expect(getPost(lesson.essay)?.meta.slug, `${lesson.section}: ${lesson.essay}`).toBe(lesson.essay);
    }
  });

  it("sends each lesson to an essay about its own layer", () => {
    for (const lesson of LESSONS) {
      expect(getPost(lesson.essay)!.meta.sections, `${lesson.section}: ${lesson.essay}`).toContain(
        lesson.section,
      );
    }
  });

  it("starts with what a newcomer touches first and ends with what most never need", () => {
    // The order is the argument: prompts and evals before any infrastructure,
    // self-hosting and training last. `PAGE_GUIDANCE.start` says the same.
    const order = LESSONS.map((l) => l.section);
    expect(order.slice(0, 2)).toEqual(["prompt-engineering", "evaluation-observability"]);
    expect(order.slice(-2)).toEqual(["inference-serving", "fine-tuning"]);
  });

  it("keeps every lesson short, and gives each all four parts", () => {
    for (const lesson of LESSONS) {
      for (const field of ["what", "needWhen", "tryThis", "skipUntil"] as const) {
        expect(lesson[field].length, `${lesson.section}.${field}`).toBeGreaterThan(40);
        expect(lesson[field].length, `${lesson.section}.${field}`).toBeLessThan(320);
      }
      expect(lesson.question.endsWith("?"), lesson.section).toBe(true);
      expect(lesson.skipUntil.startsWith("Skip "), lesson.section).toBe(true);
    }
  });

  it("uses no em dashes, like the rest of the site's copy", () => {
    for (const lesson of LESSONS) expect(JSON.stringify(lesson), lesson.section).not.toContain("—");
  });

  it("names no tool as the answer: picking is the layer page's job", () => {
    const prose = LESSONS.map((l) => `${l.what} ${l.needWhen} ${l.tryThis} ${l.skipUntil}`).join(" ");
    for (const category of stackLayers) {
      for (const tool of category.tools) {
        // Whole-word, so a tool called "Instructor" does not match "instruction".
        const pattern = new RegExp(`(^|[^A-Za-z])${tool.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Za-z]|$)`);
        expect(pattern.test(prose), `a lesson names ${tool.name}`).toBe(false);
      }
    }
  });

  it("gives each lesson a stable anchor", () => {
    expect(lessonAnchor(0)).toBe("lesson-1");
    expect(new Set(LESSONS.map((_, i) => lessonAnchor(i))).size).toBe(LESSONS.length);
  });
});
