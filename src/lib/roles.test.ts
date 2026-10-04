import { describe, expect, it } from "vitest";
import { allTools, toolCount, toolsByRole } from "./data";
import { ROLES, ROLE_IDS, roleMeta, rolesInOrder, toolsForRole } from "./roles";
import type { Role } from "./types";

/**
 * The role axis is hand-authored, so the failure mode is not a type error — it
 * is a tag that compiles, passes review, and quietly narrows what a role page
 * contains. These tests are the guard, and the interesting ones are the
 * distribution checks at the bottom: a vocabulary can satisfy every
 * per-tool rule and still be useless if one role owns everything.
 */

describe("role vocabulary", () => {
  it("has at least one tool in every role", () => {
    for (const role of ROLE_IDS) {
      expect(toolsByRole(role).length, `role "${role}" has no tools`).toBeGreaterThan(0);
    }
  });

  it("resolves metadata for every declared role", () => {
    for (const role of ROLE_IDS) {
      const meta = roleMeta(role);
      expect(meta, `no metadata for ${role}`).toBeDefined();
      expect(meta!.id).toBe(role);
      // Copy is the product here. A role with a blank `owns` renders as an
      // empty line on /roles and says nothing.
      expect(meta!.owns.length).toBeGreaterThan(10);
      expect(meta!.question.length).toBeGreaterThan(10);
    }
  });

  it("has unique ids and distinct display names", () => {
    expect(new Set(ROLE_IDS).size).toBe(ROLE_IDS.length);
    const titles = ROLES.map((r) => r.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("orders rolesInOrder by the vocabulary, not authoring order", () => {
    const scrambled: Role[] = ["production", "platform", "data"];
    expect(rolesInOrder(scrambled)).toEqual(["platform", "data", "production"]);
  });
});

describe("per-tool roles", () => {
  it("gives every tool at least one role", () => {
    const orphans = allTools.filter((t) => t.roles.length === 0).map((t) => t.name);
    expect(orphans, "tools with no role are invisible on /roles").toEqual([]);
  });

  it("caps tools at two roles", () => {
    // Three roles means nobody is accountable for the tool. Enforced here as
    // well as in the data.ts build guard because a test names the offenders
    // and a build error only stops the build.
    const spread = allTools
      .filter((t) => t.roles.length > 2)
      .map((t) => `${t.name} (${t.roles.length})`);
    expect(spread).toEqual([]);
  });

  it("uses only declared role ids", () => {
    const valid = new Set<string>(ROLE_IDS);
    const bad = allTools
      .flatMap((t) => t.roles)
      .filter((r) => !valid.has(r));
    expect([...new Set(bad)]).toEqual([]);
  });

  it("never repeats a role on one tool", () => {
    const dupes = allTools
      .filter((t) => new Set(t.roles).size !== t.roles.length)
      .map((t) => t.name);
    expect(dupes).toEqual([]);
  });
});

describe("distribution", () => {
  it("keeps every role a meaningful share of the index", () => {
    // The failure this catches is a vocabulary where one role takes 80% of the
    // tools. It passes every per-tool rule and is useless as a filter, because
    // picking that role returns almost the whole site.
    for (const role of ROLE_IDS) {
      const share = toolsByRole(role).length / toolCount;
      expect(
        share,
        `role "${role}" holds ${(share * 100).toFixed(0)}% of the index`,
      ).toBeGreaterThan(0.05);
      expect(
        share,
        `role "${role}" holds ${(share * 100).toFixed(0)}% of the index`,
      ).toBeLessThan(0.6);
    }
  });

  it("has no role that is a strict superset of another", () => {
    // If one role contained every tool of another, the narrower one could not
    // be reached by filtering and would exist only as a URL.
    for (const a of ROLE_IDS) {
      const setA = new Set(toolsByRole(a).map((t) => t.name));
      for (const b of ROLE_IDS) {
        if (a === b) continue;
        const setB = toolsByRole(b).map((t) => t.name);
        const strictSubset =
          setB.every((n) => setA.has(n)) && setA.size > setB.length;
        expect(
          strictSubset,
          `"${b}" is a strict subset of "${a}"`,
        ).toBe(false);
      }
    }
  });

  it("actually overlaps, so the axis is not nine copies of the layer ramp", () => {
    // If roles never coincided, role would just be a relabelling of section.
    const overlapping = allTools.filter((t) => t.roles.length > 1);
    expect(overlapping.length).toBeGreaterThan(5);
  });
});

describe("toolsForRole", () => {
  it("matches toolsByRole for a real tool set", () => {
    for (const role of ROLE_IDS) {
      const viaHelper = toolsForRole(allTools, role).map((t) => t.name);
      const viaData = toolsByRole(role).map((t) => t.name);
      expect(viaHelper).toEqual(viaData);
    }
  });

  it("returns dataset order, so pages are stable between builds", () => {
    for (const role of ROLE_IDS) {
      const names = toolsByRole(role).map((t) => t.name);
      const inDataset = names.filter((n) =>
        allTools.some((t) => t.name === n),
      );
      expect(names).toEqual(inDataset);
    }
  });
});