import { describe, expect, it } from "vitest";
import { bandHex, bandOf as ogBandOf } from "./og";
import { bandOf, BANDS } from "./layer";
import { categories, licenses, stackLayers } from "./data";

/**
 * The OG card palette and the live-site palette are defined in two places that
 * cannot see each other: CSS custom properties for the site, and hex literals
 * for the Satori-rendered share images, which never execute CSS. Nothing
 * enforces they stay in step except this file.
 *
 * The card now carries the three bands rather than nine layer stops, so the
 * thing to assert is that both implementations classify the same layer the
 * same way — not that there are nine distinct colours, which was the old
 * contract and is now actively wrong.
 */

describe("the OG card palette", () => {
  it("resolves every layer in the dataset to a hex colour", () => {
    for (const c of stackLayers) {
      expect(bandHex(ogBandOf(c.layer)), c.slug).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("uses the muted token for off-stack", () => {
    expect(bandHex(null)).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("has exactly three distinct colours, not one per layer", () => {
    // The old contract asserted nine distinct colours. Nine hues is a
    // rainbow, and the card inherits that reasoning or it does not.
    const hexes = new Set(
      BANDS.map((b) => bandHex(b.id).toLowerCase()),
    );
    expect(hexes.size).toBe(3);
  });

  it("classifies every layer the same way the live site does", () => {
    // The two implementations are independent by necessity — Satori cannot
    // read a CSS custom property — so nothing but this test stops them
    // drifting. If they disagree, an OG card says one band and the page it
    // links to says another, which is worse than either being wrong alone.
    for (const c of stackLayers) {
      expect(ogBandOf(c.layer), `${c.slug} (layer ${c.layer})`).toBe(
        bandOf(c.layer),
      );
    }
  });

  it("agrees with the live site on off-stack material too", () => {
    expect(ogBandOf(null)).toBeNull();
    expect(bandOf(null)).toBeNull();
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

describe("the licence vocabulary", () => {
  it("keeps licence values short enough to display inline", () => {
    for (const { value, count } of licenses) {
      expect(value.length, value).toBeLessThanOrEqual(24);
      expect(count, value).toBeGreaterThan(0);
    }
  });

  it("uses SPDX ids, or the explicit word 'proprietary'", () => {
    for (const { value } of licenses) {
      const ok =
        value === "proprietary" ||
        /^[A-Za-z0-9.+-]+(-\d+(\.\d+)?)?$/.test(value);
      expect(ok, `${value} is neither SPDX-shaped nor "proprietary"`).toBe(true);
    }
  });

  it("counts every licensed tool exactly once", () => {
    const total = licenses.reduce((n, l) => n + l.count, 0);
    const licensed = categories.reduce(
      (n, c) => n + c.tools.filter((t) => t.license).length,
      0,
    );
    expect(total).toBe(licensed);
  });

  it("records a date for every tool, licensed or not", () => {
    for (const c of categories) {
      for (const t of c.tools) {
        expect(t.asOf, t.name).toMatch(/^\d{4}-\d{2}$/);
      }
    }
  });
});
