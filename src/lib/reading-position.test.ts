import { describe, expect, it } from "vitest";
import { activeIndex, scrollProgress } from "./reading-position";

describe("activeIndex", () => {
  const tops = [300, 900, 1500];

  it("is -1 before the first heading, so the intro lights nothing", () => {
    expect(activeIndex(tops, 100)).toBe(-1);
    expect(activeIndex([], 100)).toBe(-1);
  });

  it("picks the last heading that has reached the line", () => {
    expect(activeIndex(tops, 300)).toBe(0); // exactly on the line counts
    expect(activeIndex(tops, 899)).toBe(0);
    expect(activeIndex(tops, 900)).toBe(1);
    expect(activeIndex(tops, 1499)).toBe(1);
  });

  it("stays on the final heading once past it", () => {
    expect(activeIndex(tops, 99999)).toBe(2);
  });

  it("works with viewport-relative tops, which go negative once scrolled past", () => {
    expect(activeIndex([-1200, -400, 250, 900], 80)).toBe(1);
  });
});

describe("scrollProgress", () => {
  it("is 0 until the article's top reaches the viewport top", () => {
    expect(scrollProgress(500, 4000, 800)).toBe(0);
    expect(scrollProgress(0, 4000, 800)).toBe(0);
  });

  it("is 1 when the article's bottom reaches the viewport's bottom", () => {
    // Scrolled so the top is 3200px above: 4000 - 800 of range, fully used.
    expect(scrollProgress(-3200, 4000, 800)).toBe(1);
  });

  it("is linear in between", () => {
    expect(scrollProgress(-1600, 4000, 800)).toBeCloseTo(0.5, 5);
  });

  it("clamps overscroll rather than going past 0 or 1", () => {
    expect(scrollProgress(300, 4000, 800)).toBe(0);
    expect(scrollProgress(-9000, 4000, 800)).toBe(1);
  });

  it("reads 1 for an article shorter than the viewport once in view, never NaN or negative", () => {
    expect(scrollProgress(0, 500, 800)).toBe(1);
    expect(scrollProgress(-10, 500, 800)).toBe(1);
    expect(scrollProgress(200, 500, 800)).toBe(0);
    expect(Number.isNaN(scrollProgress(0, 800, 800))).toBe(false);
  });
});
