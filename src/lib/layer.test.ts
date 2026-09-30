import { describe, expect, it } from "vitest";
import { layerColor, layerStyle } from "./layer";
import { layerHex } from "./og";
import { allTags, categories, stackLayers } from "./data";

/**
 * The layer ramp is the site's main identity device, and it is defined in two
 * places that cannot see each other: CSS custom properties for the live site,
 * and hex literals for the Satori-rendered cover images. Nothing enforces that
 * they stay in step except this file, plus the fact that a layer beyond nine
 * silently clamps to the last stop.
 */

describe("layerColor", () => {
  it("maps every layer in the dataset to a CSS variable", () => {
    for (const c of stackLayers) {
      expect(layerColor(c.layer), c.slug).toBe(`var(--layer-${c.layer})`);
    }
  });

  it("uses the muted token for off-stack and null", () => {
    expect(layerColor(null)).toBe("var(--fg-subtle)");
    expect(layerColor(0)).toBe("var(--fg-subtle)");
  });

  it("clamps rather than emitting a variable that does not exist", () => {
    // No section may be layer 10 today; if one is added, the CSS needs nine
    // more stops. Clamping keeps the render correct while the ramp catches up.
    expect(layerColor(99)).toBe("var(--layer-9)");
  });

  it("rounds a fractional depth", () => {
    expect(layerColor(3.4)).toBe("var(--layer-3)");
    expect(layerColor(3.6)).toBe("var(--layer-4)");
  });
});

describe("layerStyle", () => {
  it("produces a backgroundColor the DOM can use", () => {
    expect(layerStyle(4)).toEqual({ backgroundColor: "var(--layer-4)" });
  });

  it("is falsy-safe for missing layers", () => {
    expect(layerStyle(null)).toEqual({ backgroundColor: "var(--fg-subtle)" });
    expect(layerStyle(undefined)).toEqual({ backgroundColor: "var(--fg-subtle)" });
  });
});

describe("layerHex", () => {
  it("covers every layer in the dataset", () => {
    for (const c of stackLayers) {
      expect(layerHex(c.layer), c.slug).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("uses the muted token for off-stack", () => {
    expect(layerHex(null)).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("clamps beyond the ramp instead of returning undefined", () => {
    expect(layerHex(99)).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("gives a distinct colour to every layer", () => {
    const hexes = stackLayers.map((c) => layerHex(c.layer).toLowerCase());
    expect(new Set(hexes).size).toBe(hexes.length);
  });
});

describe("the ramp is sized to the data", () => {
  it("defines exactly as many stops as there are stack layers", () => {
    // globals.css defines --layer-1..--layer-9. If a tenth section is ever
    // added, this is the assertion that will point at the CSS to update.
    expect(stackLayers.length).toBe(9);
    expect(stackLayers[stackLayers.length - 1].layer).toBe(9);
  });

  it("keeps the first layer at the substrate", () => {
    expect(stackLayers[0].layer).toBe(1);
  });
});

describe("the tag vocabulary", () => {
  it("keeps tag names short enough to be a chip", () => {
    for (const { tag, count } of allTags) {
      expect(tag.length, tag).toBeLessThanOrEqual(12);
      expect(count, tag).toBeGreaterThan(0);
    }
  });

  it("uses sentence case, not SCREAMING or kebab", () => {
    for (const { tag } of allTags) {
      expect(tag, tag).toMatch(/^[A-Za-z][A-Za-z .]*[A-Za-z]$/);
    }
  });

  it("counts every tagged tool exactly once", () => {
    const total = allTags.reduce((n, t) => n + t.count, 0);
    const tagged = categories.reduce(
      (n, c) => n + c.tools.filter((t) => t.tag).length,
      0,
    );
    expect(total).toBe(tagged);
  });
});
