import { describe, expect, it } from "vitest";
import { getCategory } from "./data";
import { HERO_WORKLOADS, heroInput, heroStacks } from "./hero-stacks";
import { decodeStackInput } from "./stack-url";
import { WORKLOADS, recommendStack } from "./stacks";

/**
 * The hero shows a stack and links to the builder. The one promise that has
 * to hold is that the builder, opened from that link, shows the same stack.
 */
describe("hero stacks", () => {
  it("offers only workloads the engine knows, each once", () => {
    const known = new Set(WORKLOADS.map((w) => w.id));
    for (const id of HERO_WORKLOADS) expect(known.has(id), id).toBe(true);
    expect(new Set(HERO_WORKLOADS).size).toBe(HERO_WORKLOADS.length);
    expect(heroStacks.map((s) => s.id)).toEqual([...HERO_WORKLOADS]);
  });

  it("leaves voice to the full builder, where its caveat fits", () => {
    expect(HERO_WORKLOADS).not.toContain("voice");
  });

  it("links to a builder case that reproduces the picks it shows", () => {
    for (const stack of heroStacks) {
      expect(stack.href.startsWith("/stack-builder?"), stack.id).toBe(true);
      const decoded = decodeStackInput(stack.href.slice(stack.href.indexOf("?")));
      expect(decoded?.workload, stack.id).toBe(stack.id);
      // What the builder does with a shared link: decode, then run the engine.
      const rebuilt = recommendStack({ ...decoded!, simplicityVsControl: 0 });
      const shown = recommendStack(heroInput(stack.id));
      expect(
        rebuilt.picks.map((p) => [p.sectionSlug, p.tool]),
        `${stack.id}: the link opens a different stack`,
      ).toEqual(shown.picks.map((p) => [p.sectionSlug, p.tool]));
      expect(Object.keys(stack.picks).sort()).toEqual(shown.picks.map((p) => p.sectionSlug).sort());
    }
  });

  it("names real tools in real stack layers", () => {
    for (const stack of heroStacks) {
      expect(stack.tools.length, stack.id).toBeGreaterThan(1);
      for (const [slug, pick] of Object.entries(stack.picks)) {
        const category = getCategory(slug);
        expect(category?.layer, `${stack.id}: ${slug} is not a stack layer`).toBeTruthy();
        expect(
          category!.tools.some((t) => t.name === pick.tool),
          `${stack.id}: ${pick.tool} is not in ${slug}`,
        ).toBe(true);
      }
    }
  });

  it("lists the picks substrate first", () => {
    for (const stack of heroStacks) {
      const layers = stack.tools.map((tool) => {
        const slug = Object.entries(stack.picks).find(([, p]) => p.tool === tool)![0];
        return getCategory(slug)!.layer!;
      });
      expect(layers, stack.id).toEqual([...layers].sort((a, b) => a - b));
    }
  });

  it("formats the cost band as a range in dollars", () => {
    for (const stack of heroStacks) expect(stack.cost, stack.id).toMatch(/^\$[\d,]+ to \$[\d,]+ a month$/);
  });
});
