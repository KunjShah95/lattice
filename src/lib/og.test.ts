import { describe, expect, it } from "vitest";
import { OG_FONTS, OG_SIZE } from "./og";

/**
 * The share-card fonts.
 *
 * `OG_FONTS` degrades to an empty array when the font files cannot be read, so
 * that evaluating `lib/og.tsx` on Cloudflare — where there is no filesystem —
 * does not take the whole module graph down with it. That was the actual bug: a
 * bare top-level `await Promise.all([readFile(...)])` rejects on the Worker, and
 * every HTML route in the app 500'd, while the cards it exists to serve stayed
 * fine because they are prerendered.
 *
 * The cost of that safety is an empty `OG_FONTS` is also what a *build-time*
 * font failure looks like — and satori would render the cards in a fallback face
 * and ship them. These tests are what stop that being silent. They run under
 * Node, where the files are present, so a missing font is a failure here rather
 * than an Arial card on LinkedIn.
 */

describe("OG_FONTS", () => {
  it("loads all three faces when the files are reachable", () => {
    // If this fails, the subsets are missing or `subset-og-fonts.py` has not
    // been run. Every share card would render in a fallback face.
    expect(OG_FONTS.length).toBe(3);
  });

  it("gives every face a non-empty font buffer", () => {
    for (const font of OG_FONTS) {
      expect(font.data.byteLength, `${font.name} is empty`).toBeGreaterThan(1000);
    }
  });

  it("declares exactly the weights that ship, once each", () => {
    // Satori matches on weight and silently substitutes its own face when asked
    // for one it was not given. Asking for 400 would put Arial on the card, so
    // the set is deliberately small and asserted rather than documented.
    //
    // Two distinct weights across three faces: serif and mono are 500, sans is
    // 600. The *names and weights together* are what matter, so the pair is
    // asserted — asserting distinctness alone would have passed a fourth face at
    // an unexpected weight.
    expect(OG_FONTS.map((f) => [f.name, f.weight])).toEqual([
      ["Plex Serif", 500],
      ["Plex Sans", 600],
      ["Plex Mono", 500],
    ]);
  });

  it("is the only place a font is declared, so the count cannot drift", () => {
    // A fourth face has to be added deliberately, with its subset regenerated —
    // see the header note in `lib/og.tsx`. Asserting the length is what makes
    // adding one a test failure rather than a silent bundle-size change.
    expect(OG_FONTS).toHaveLength(3);
  });
});

describe("OG_SIZE", () => {
  it("is the aspect ratio every platform crops to", () => {
    // 1200x630 is ~1.91:1, which is what LinkedIn and Slack crop to on desktop.
    // Changing this silently re-crops every share card in the category.
    expect(OG_SIZE).toEqual({ width: 1200, height: 630 });
  });
});