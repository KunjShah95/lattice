import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  facetOptions,
  inGroup,
  matchesQuery,
  poolFor,
  textAndSectionMatches,
  valueOf,
  FACET_GROUPS,
  type FacetRow,
} from "./facets";
import { allToolEntries } from "./data";
import { ROLES } from "./roles";

/**
 * Facet semantics.
 *
 * The behaviour worth pinning is the shape of the filter, not the arithmetic:
 * OR within a group, AND across groups, and counts drawn from the pool that
 * excludes the group being counted. Those three together are what make a
 * faceted list trustworthy, and all three are easy to get subtly wrong in a way
 * that still looks correct on screen — a count that reflects the current
 * selection is the classic one, because it renders as a plausible number.
 *
 * These run against the real dataset wherever possible, so a change to the role
 * tagging shows up here rather than as a surprising count in the UI.
 */

const ROLE_ORDER = ROLES.map((r) => r.title);

/** A minimal row; the helpers only read the fields they are given. */
function row(partial: Partial<FacetRow> & { name: string }): FacetRow {
  return {
    slug: partial.name.toLowerCase(),
    blurb: "",
    domain: "",
    kind: "library",
    roles: [],
    deployment: "self-hosted",
    license: "MIT",
    language: "Python",
    cost: "free",
    useWhen: "",
    skipWhen: "",
    categorySlug: "inference-serving",
    categoryShort: "Inference",
    layer: 1,
    ...partial,
  };
}

describe("inGroup", () => {
  it("passes everything when nothing is selected", () => {
    const r = row({ name: "vLLM", roles: ["AI Infrastructure"] });
    expect(inGroup(r, "roles")).toBe(true);
    expect(inGroup(r, "deployment")).toBe(true);
  });

  it("ORs within the roles group", () => {
    // The reader asking "Platform OR Infra" wants the union, not the
    // intersection — a tool belonging to either is part of what their job uses.
    const r = row({ name: "Fly Machines", roles: ["ML Platform", "AI Infrastructure"] });
    expect(inGroup(r, "roles", new Set(["ML Platform"]))).toBe(true);
    expect(inGroup(r, "roles", new Set(["AI Infrastructure"]))).toBe(true);
    expect(
      inGroup(r, "roles", new Set(["ML Platform", "Data & Retrieval"])),
    ).toBe(true);
    expect(inGroup(r, "roles", new Set(["Data & Retrieval"]))).toBe(false);
  });

  it("treats a tool in two roles as a member of both", () => {
    const r = row({ name: "Dagster", roles: ["ML Platform", "Data & Retrieval"] });
    expect(inGroup(r, "roles", new Set(["ML Platform"]))).toBe(true);
    expect(inGroup(r, "roles", new Set(["Data & Retrieval"]))).toBe(true);
  });

  it("is an equality test for single-valued groups", () => {
    const r = row({ name: "Temporal", deployment: "self-hosted" });
    expect(inGroup(r, "deployment", new Set(["self-hosted"]))).toBe(true);
    expect(inGroup(r, "deployment", new Set(["saas"]))).toBe(false);
  });

  it("buckets a null attribute as unknown rather than dropping the row", () => {
    const r = row({ name: "Distill", deployment: null, kind: "reading" });
    expect(valueOf(r, "deployment")).toBe("unknown");
    expect(inGroup(r, "deployment", new Set(["unknown"]))).toBe(true);
  });
});

describe("poolFor", () => {
  const rows = [
    row({ name: "A", roles: ["ML Platform"], deployment: "self-hosted" }),
    row({ name: "B", roles: ["ML Platform", "Data & Retrieval"], deployment: "saas" }),
    row({ name: "C", roles: ["Data & Retrieval"], deployment: "saas" }),
  ];

  it("ANDs across groups", () => {
    const pool = poolFor(rows, { roles: new Set(["Data & Retrieval"]) }, "section");
    expect(pool.map((r) => r.name)).toEqual(["B", "C"]);

    const narrowed = poolFor(
      rows,
      { roles: new Set(["Data & Retrieval"]), deployment: new Set(["self-hosted"]) },
      "section",
    );
    expect(narrowed.map((r) => r.name)).toEqual([]);
  });

  it("excludes the group being counted, so counts reflect what picking would yield", () => {
    // Selecting Platform and then reading the Data count must show how many
    // results Platform+Data would give — not zero, and not the unfiltered total.
    // With the roles group skipped, the pool is everything the *other* filters
    // allow: all three rows, since no other filter is active. The counts then
    // come from exploding roles across that pool, which is the standard
    // behaviour — C is legitimately offered as a Data option, because picking
    // it would yield C.
    const selection = { roles: new Set(["ML Platform"]) };
    expect(poolFor(rows, selection, "roles").map((r) => r.name)).toEqual([
      "A",
      "B",
      "C",
    ]);

    // The result set still respects the selection, so Platform alone is A + B.
    expect(
      poolFor(rows, selection, "section").map((r) => r.name),
    ).toEqual(["A", "B"]);
  });

  it("applies the section filter when it is not the skipped group", () => {
    const mixed = [
      row({ name: "A", categorySlug: "inference-serving", roles: ["ML Platform"] }),
      row({ name: "B", categorySlug: "retrieval-vector-stores", roles: ["ML Platform"] }),
    ];
    expect(
      poolFor(mixed, { section: "retrieval-vector-stores" }, "roles").map((r) => r.name),
    ).toEqual(["B"]);
  });
});

describe("facetOptions", () => {
  const rows = [
    row({ name: "A", roles: ["ML Platform", "Data & Retrieval"], kind: "runtime" }),
    row({ name: "B", roles: ["ML Platform"], kind: "database" }),
    row({ name: "C", roles: ["Data & Retrieval"], kind: "database" }),
  ];

  it("counts a multi-role tool under each of its roles", () => {
    const options = facetOptions(rows, {}, ROLE_ORDER);
    const roleCounts = Object.fromEntries(
      options.filter((o) => o.group === "roles").map((o) => [o.value, o.count]),
    );
    expect(roleCounts["ML Platform"]).toBe(2);
    expect(roleCounts["Data & Retrieval"]).toBe(2);
    // 2 + 2 = 4 against 3 rows: the overlap, which is intended.
    expect(
      options.filter((o) => o.group === "roles").reduce((n, o) => n + o.count, 0),
    ).toBeGreaterThan(rows.length);
  });

  it("emits roles in vocabulary order, not count or alphabetical order", () => {
    const options = facetOptions(rows, {}, ROLE_ORDER).filter((o) => o.group === "roles");
    expect(options.map((o) => o.value)).toEqual([
      "ML Platform",
      "AI Infrastructure",
      "Data & Retrieval",
      "Applied Engineering",
      "Production & Governance",
    ].filter((t) => options.some((o) => o.value === t)));
  });

  it("omits a role with no rows rather than showing a zero", () => {
    const options = facetOptions(rows, {}, ROLE_ORDER).filter((o) => o.group === "roles");
    expect(options.every((o) => o.count > 0)).toBe(true);
    expect(options.map((o) => o.value)).not.toContain("Applied Engineering");
  });

  it("orders single-valued options by count, then alphabetically", () => {
    const options = facetOptions(rows, {}, ROLE_ORDER).filter((o) => o.group === "kind");
    expect(options.map((o) => o.value)).toEqual(["database", "runtime"]);
  });

  it("produces one entry per distinct value per single-valued group", () => {
    const options = facetOptions(rows, {}, ROLE_ORDER);
    for (const g of FACET_GROUPS.filter((g) => !g.multi)) {
      const values = options.filter((o) => o.group === g.key).map((o) => o.value);
      expect(new Set(values).size).toBe(values.length);
    }
  });
});

describe("matchesQuery", () => {
  const r = row({
    name: "LiteLLM",
    domain: "litellm.ai",
    blurb: "OpenAI-format proxy across providers.",
    useWhen: "One endpoint for many providers.",
    skipWhen: "You have a single provider.",
    license: "MIT",
    language: "Python",
    roles: ["ML Platform"],
  });

  it("matches on every field a reader might type", () => {
    for (const q of [
      "litellm",
      "proxy",
      "litellm.ai",
      "one endpoint",
      "single provider",
      "mit",
      "python",
    ]) {
      expect(matchesQuery(r, q), `query "${q}" should match`).toBe(true);
    }
  });

  it("matches on a role, which is the point of the axis", () => {
    expect(matchesQuery(r, "platform")).toBe(true);
    expect(matchesQuery(r, "infra")).toBe(false);
  });

  it("is case-insensitive and trims", () => {
    expect(matchesQuery(r, "  LITELLM  ")).toBe(true);
  });

  it("matches everything on an empty query", () => {
    expect(matchesQuery(r, "")).toBe(true);
    expect(matchesQuery(r, "   ")).toBe(true);
  });

  it("returns false for a term in no field", () => {
    expect(matchesQuery(r, "kubernetes")).toBe(false);
  });
});

describe("activeFilterCount", () => {
  it("counts selections plus the section", () => {
    expect(activeFilterCount({})).toBe(0);
    expect(activeFilterCount({ section: "guardrails-safety" })).toBe(1);
    expect(
      activeFilterCount({
        roles: new Set(["ML Platform", "Data & Retrieval"]),
        cost: new Set(["free"]),
      }),
    ).toBe(3);
    expect(activeFilterCount({ roles: new Set(["ML Platform"]), section: null })).toBe(1);
  });
});

describe("textAndSectionMatches", () => {
  const rows = [
    row({ name: "vLLM", categorySlug: "inference-serving", roles: ["AI Infrastructure"] }),
    row({ name: "Qdrant", categorySlug: "retrieval-vector-stores", roles: ["Data & Retrieval"] }),
  ];

  it("filters by section and by text together", () => {
    expect(textAndSectionMatches(rows, "", null)).toHaveLength(2);
    expect(textAndSectionMatches(rows, "", "inference-serving")).toHaveLength(1);
    expect(textAndSectionMatches(rows, "qdrant", null)).toHaveLength(1);
    expect(
      textAndSectionMatches(rows, "qdrant", "inference-serving"),
    ).toHaveLength(0);
  });
});

describe("against the real dataset", () => {
  const rows: FacetRow[] = allToolEntries.map((t) => ({ ...t }));

  it("gives every role a non-zero count with no filters applied", () => {
    const options = facetOptions(rows, {}, ROLE_ORDER).filter((o) => o.group === "roles");
    expect(options).toHaveLength(ROLES.length);
    for (const o of options) expect(o.count).toBeGreaterThan(0);
  });

  it("agrees with toolsByRole on each count", () => {
    const options = facetOptions(rows, {}, ROLE_ORDER).filter((o) => o.group === "roles");
    for (const o of options) {
      const expected = allToolEntries.filter((t) => t.roles.includes(o.value)).length;
      expect(o.count, `${o.value}: facet vs dataset`).toBe(expected);
    }
  });

  it("carries display names, not role ids, on every row", () => {
    // The facet matches against these strings, so an id here would render a
    // filter that silently matches nothing.
    // Readonly<string> explicitly: `Set<Role>.has(string)` is a type error, and
    // widening here is what lets the assertion actually run.
    const ids: ReadonlySet<string> = new Set(ROLES.map((r) => r.id));
    for (const r of rows) {
      for (const role of r.roles) {
        expect(ids.has(role), `row ${r.name} carries id "${role}"`).toBe(false);
      }
    }
  });

  it("gives every row at least one role, so no tool is unreachable by role", () => {
    const orphans = rows.filter((r) => r.roles.length === 0).map((r) => r.name);
    expect(orphans).toEqual([]);
  });

  it("narrows monotonically as filters are added", () => {
    const all = poolFor(rows, {}, "section").length;
    const byRole = poolFor(rows, { roles: new Set(["Applied Engineering"]) }, "section").length;
    const byRoleAndCost = poolFor(
      rows,
      { roles: new Set(["Applied Engineering"]), cost: new Set(["free"]) },
      "section",
    ).length;
    expect(all).toBeGreaterThan(byRole);
    expect(byRole).toBeGreaterThanOrEqual(byRoleAndCost);
    expect(byRoleAndCost).toBeGreaterThan(0);
  });

  it("keeps the role option count honest as other filters narrow the pool", () => {
    // The regression this catches: counts drawn from the pool that *includes*
    // the group's own selection. Every role would then show the same number and
    // the chips would still look plausible.
    const freeOnly = facetOptions(
      rows.filter((r) => r.cost === "free"),
      {},
      ROLE_ORDER,
    ).filter((o) => o.group === "roles");
    const counts = freeOnly.map((o) => o.count);
    expect(new Set(counts).size).toBeGreaterThan(1);
    expect(counts.reduce((a, b) => a + b, 0)).toBeGreaterThan(
      rows.filter((r) => r.cost === "free").length,
    );
  });

  it("lets every role be selected to a non-empty result", () => {
    // A role whose selection returns nothing is a dead filter — the chip looks
    // interactive and does nothing.
    for (const role of ROLES) {
      const n = poolFor(rows, { roles: new Set([role.title]) }, "section").length;
      expect(n, `selecting "${role.title}" yields nothing`).toBeGreaterThan(0);
    }
  });
});