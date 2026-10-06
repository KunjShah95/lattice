import { describe, expect, it } from "vitest";
import {
  decodeFacetQuery,
  decodeFacetSelection,
  encodeFacetSelection,
  isEmptySelection,
  EMPTY_SELECTION,
  FACET_KEYS,
} from "./facet-url";
import { FACET_GROUPS, activeFilterCount, type FacetSelection } from "./facets";
import { FILTER_KEYS } from "./search-filters";
import { allTools } from "./data";

/**
 * Facet selection ↔ URL.
 *
 * The round trip is the contract: a reader who filters, copies the address bar
 * and sends it to a colleague must land on the same list. Before this existed the
 * filtered view was not expressible as a URL at all, so the most linkable claim
 * the site could make — "the free, self-hosted tools an ML platform engineer
 * owns" — was the one thing a reader could not send anywhere.
 *
 * The vocabulary is shared with `/api/search`, and that is asserted here rather
 * than assumed: two surfaces that spell the same facet differently is a trap
 * that only shows up when someone tries to move a link between them.
 */

function roundTrip(query: string, selection: FacetSelection) {
  const encoded = encodeFacetSelection(query, selection);
  return {
    encoded,
    query: decodeFacetQuery(`?${encoded}`),
    selection: decodeFacetSelection(`?${encoded}`),
  };
}

describe("encodeFacetSelection", () => {
  it("produces an empty string for an untouched page", () => {
    // Not `?q=&role=`. A page that rewrote its own URL on mount would make the
    // canonical and the visible state disagree before the reader did anything.
    expect(encodeFacetSelection("", EMPTY_SELECTION)).toBe("");
    expect(encodeFacetSelection("   ", EMPTY_SELECTION)).toBe("");
  });

  it("encodes the query and the selection", () => {
    const qs = encodeFacetSelection("vector", {
      section: "retrieval-vector-stores",
      cost: new Set(["free"]),
      roles: new Set(["ML Platform"]),
    });
    const params = new URLSearchParams(qs);
    expect(params.get("q")).toBe("vector");
    expect(params.get("section")).toBe("retrieval-vector-stores");
    expect(params.getAll("cost")).toEqual(["free"]);
    expect(params.getAll("role")).toEqual(["ML Platform"]);
  });

  it("sorts within an axis, so the same selection gives the same URL", () => {
    // Otherwise `replaceState` on every keystroke shuffles parameter order and
    // the URL of an unchanged selection differs run to run.
    const a = encodeFacetSelection("", { cost: new Set(["free", "usage-based"]) });
    const b = encodeFacetSelection("", { cost: new Set(["usage-based", "free"]) });
    expect(a).toBe(b);
  });
});

describe("round trip", () => {
  const cases: Array<[string, string, FacetSelection]> = [
    ["query only", "vector", {}],
    ["section only", "", { section: "inference-serving" }],
    ["one facet", "", { kind: new Set(["runtime"]) }],
    [
      "every axis at once",
      "rag",
      {
        section: "agent-frameworks",
        roles: new Set(["Applied Engineering"]),
        deployment: new Set(["self-hosted"]),
        kind: new Set(["framework"]),
        cost: new Set(["free", "usage-based"]),
      },
    ],
  ];

  for (const [name, query, selection] of cases) {
    it(`preserves ${name}`, () => {
      const out = roundTrip(query, selection);
      expect(out.query).toBe(query);
      // Compare as plain values: a Set survives JSON but two Sets are never
      // `toEqual`, so each group is checked on its own contents.
      expect(out.selection.section ?? null).toBe(selection.section ?? null);
      for (const group of FACET_GROUPS) {
        const before = [...(selection[group.key] ?? [])].sort();
        const after = [...(out.selection[group.key] ?? [])].sort();
        expect(after, group.key).toEqual(before);
      }
    });
  }

  it("agrees with activeFilterCount about how much is selected", () => {
    // The component renders "Clear (n)" from `activeFilterCount` and the URL
    // carries the same selection, so a disagreement means the chip count and the
    // link describe different views.
    const selection: FacetSelection = {
      section: "inference-serving",
      roles: new Set(["AI Infrastructure"]),
      cost: new Set(["free", "usage-based"]),
    };
    const decoded = decodeFacetSelection(`?${encodeFacetSelection("", selection)}`);
    expect(activeFilterCount(decoded)).toBe(activeFilterCount(selection));
  });
});

describe("decodeFacetSelection", () => {
  it("ORs a repeated key rather than letting the last one win", () => {
    const selection = decodeFacetSelection("?role=ML%20Platform&role=Data%20%26%20Retrieval");
    expect([...(selection.roles ?? [])].sort()).toEqual([
      "Data & Retrieval",
      "ML Platform",
    ]);
  });

  it("ignores blank values, so a hand-edited URL degrades to no constraint", () => {
    const selection = decodeFacetSelection("?cost=&kind=%20&q=");
    expect(isEmptySelection(selection)).toBe(true);
  });

  it("ignores an unknown group rather than dropping the ones it knows", () => {
    const selection = decodeFacetSelection("?nonsense=1&cost=free");
    expect([...(selection.cost ?? [])]).toEqual(["free"]);
  });

  it("reads only the query value, not a facet-looking substring of it", () => {
    // `q` is user text. Treating a `&` inside it as a separator would let a
    // pasted query silently become a filter.
    expect(decodeFacetQuery("?q=vector%20database")).toBe("vector database");
    expect(decodeFacetSelection("?q=cost%3Dfree").cost).toBeUndefined();
  });

  it("does not treat a filter-looking value in q as a selection", () => {
    const out = roundTrip("cost=free", {});
    expect(out.selection.section ?? null).toBeNull();
    expect(out.query).toBe("cost=free");
  });

  it("returns an inert selection for an empty query string", () => {
    expect(decodeFacetSelection("")).toEqual({ section: null });
    expect(decodeFacetSelection("?")).toEqual({ section: null });
    expect(isEmptySelection(decodeFacetSelection(""))).toBe(true);
  });
});

describe("shared vocabulary with /api/search", () => {
  it("uses one key per facet group, and none of them is `section` twice", () => {
    const keys = Object.values(FACET_KEYS);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).not.toContain("section");
  });

  it("spells every shared axis the way /api/search does", () => {
    // `/api/search` has no `roles` — it is `role`, because that is the singular
    // the MCP server's enum already uses. Two surfaces spelling the same facet
    // differently is the kind of mismatch that only surfaces when someone tries
    // to move a link from one to the other.
    const searchKeys = new Set<string>(FILTER_KEYS);
    for (const key of Object.values(FACET_KEYS)) {
      expect(searchKeys.has(key), `"${key}" is not an /api/search parameter`).toBe(true);
    }
    expect(FACET_KEYS.roles).toBe("role");
  });

  it("only encodes values the dataset can actually produce", () => {
    // A link carrying `?cost=fre` renders an unfiltered list with a lit-looking
    // URL, so the encoder is only ever fed real values — asserted against the
    // dataset rather than a hand-copied list.
    // Widened to `string` deliberately: `FacetSelection` holds display strings, so
    // the point is that every value the dataset produces lands in that type
    // without a cast — which a narrower `Set<Deployment>` would not prove.
    const costs = new Set<string>(allTools.map((t) => t.cost));
    const kinds = new Set<string>(allTools.map((t) => t.kind));
    const deployments = new Set<string>(
      allTools.flatMap((t) => (t.deployment ? [t.deployment] : [])),
    );
    const qs = encodeFacetSelection("", {
      cost: new Set(costs),
      kind: new Set(kinds),
      deployment: new Set(deployments),
    });
    const params = new URLSearchParams(qs);
    expect(params.getAll("cost").every((v) => costs.has(v))).toBe(true);
    expect(params.getAll("kind").every((v) => kinds.has(v))).toBe(true);
    expect(params.getAll("deployment").every((v) => deployments.has(v))).toBe(true);
  });
});

describe("isEmptySelection", () => {
  it("distinguishes no filter from a filter on nothing", () => {
    expect(isEmptySelection(EMPTY_SELECTION)).toBe(true);
    expect(isEmptySelection({ section: null, cost: new Set() })).toBe(true);
    expect(isEmptySelection({ cost: new Set(["free"]) })).toBe(false);
    expect(isEmptySelection({ section: "inference-serving" })).toBe(false);
  });
});