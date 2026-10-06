import { describe, expect, it } from "vitest";
import {
  claimSummary,
  contentGaps,
  hostOf,
  latticePosition,
  median,
  movement,
  topSources,
} from "./citation-score.mjs";
import { ALL_QUERIES, CLAIMS, CITATION_QUERIES } from "./citation-queries.mjs";

/**
 * The tracker, minus the network.
 *
 * Everything here is arithmetic on an engine's answer, and the arithmetic is where
 * a measurement quietly becomes a lie. Three of these tests exist because of a
 * specific way that could happen:
 *
 *   - counting URLs instead of hosts makes a deep site look well-placed for free
 *   - treating "not cited" as missing data cannot tell a finding from a gap
 *   - treating a query with no page as a ranking loss sends you to rewrite
 *     something that does not exist
 */

const SITE = "lattice.kkshah2005.workers.dev";

describe("hostOf", () => {
  it("normalises for comparison", () => {
    expect(hostOf("https://WWW.Example.com/a/b")).toBe("example.com");
    expect(hostOf("https://example.com")).toBe("example.com");
  });

  it("returns null for anything that will not parse", () => {
    expect(hostOf("not a url")).toBeNull();
    expect(hostOf("")).toBeNull();
  });
});

describe("latticePosition", () => {
  it("is 1-based over the source list", () => {
    expect(latticePosition(["https://a.com", `https://${SITE}`], SITE)).toBe(2);
    expect(latticePosition([`https://${SITE}`], SITE)).toBe(1);
  });

  it("returns null when the site is not cited", () => {
    expect(latticePosition(["https://a.com", "https://b.com"], SITE)).toBeNull();
  });

  it("counts distinct hosts, not URLs", () => {
    // The decision that matters. An engine citing one page under three headings
    // has cited one source; counting them three times would make a site with more
    // pages look better-placed than one with fewer, for free.
    const sources = [
      `https://${SITE}/a`,
      `https://${SITE}/b`,
      `https://${SITE}/c`,
      "https://other.com",
    ];
    expect(latticePosition(sources, SITE)).toBe(1);
    expect(
      latticePosition(["https://a.com", "https://a.com/deep/path", `https://${SITE}`], SITE),
    ).toBe(2);
  });

  it("matches through a tracking parameter", () => {
    // The parameter is the engine's, not ours, and a citation is a citation.
    expect(
      latticePosition([`https://${SITE}/inference-serving/vllm?utm_source=perplexity`], SITE),
    ).toBe(1);
  });

  it("matches a subdomain of the site but not a lookalike", () => {
    expect(latticePosition(["https://www." + SITE + "/x"], SITE)).toBe(1);
    // A domain that merely ends with the host's characters must not match.
    expect(latticePosition(["https://notlattice.kkshah2005.workers.dev.evil.com"], SITE)).toBeNull();
  });

  it("tolerates an empty or malformed source list", () => {
    expect(latticePosition([], SITE)).toBeNull();
    expect(latticePosition(["garbage", null as unknown as string], SITE)).toBeNull();
    expect(latticePosition(undefined, SITE)).toBeNull();
  });

  it("accepts the origin in any of the forms it might be configured", () => {
    for (const form of [
      "https://lattice.kkshah2005.workers.dev",
      "lattice.kkshah2005.workers.dev",
      "https://lattice.kkshah2005.workers.dev/",
    ]) {
      expect(latticePosition(["https://example.com", `https://${SITE}/x`], form), form).toBe(2);
    }
  });
});

describe("topSources", () => {
  it("lists the hosts a reader would have seen first", () => {
    expect(topSources(["https://a.com/1", "https://b.com/2", "https://c.com/3", "https://d.com"]))
      .toEqual(["a.com", "b.com", "c.com"]);
  });

  it("honours the limit and skips unparseable entries", () => {
    expect(topSources(["junk", "https://a.com"], 1)).toEqual(["a.com"]);
    expect(topSources([])).toEqual([]);
  });
});

describe("median", () => {
  it("handles odd, even and empty sets", () => {
    expect(median([1, 3, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(3); // rounded from 2.5
    expect(median([])).toBeNull();
    expect(median(null)).toBeNull();
  });

  it("discards values that are not numbers", () => {
    // A blank position column in the CSV becomes "" on the way back in, and
    // sorting that into the middle would drag the median to zero.
    expect(median(["1", "", "3"])).toBe(2);
  });
});

describe("claimSummary", () => {
  const rows = [
    { query_id: 1, claim: "neutrality", cited: true, position: 1 },
    { query_id: 6, claim: "neutrality", cited: true, position: 3 },
    { query_id: 8, claim: "neutrality", cited: false, position: "" },
    { query_id: 17, claim: "skip-when", cited: true, position: 2 },
    { query_id: 101, claim: "skip-when", cited: false, position: "" },
  ];

  it("gives a rate per claim, which is the number the strategy needs", () => {
    const summary = claimSummary(rows);
    const neutrality = summary.find((s) => s.claim === "neutrality")!;
    expect(neutrality.runs).toBe(3);
    expect(neutrality.cited).toBe(2);
    expect(neutrality.rate).toBeCloseTo(2 / 3);
    expect(neutrality.median).toBe(2);
  });

  it("scores a never-cited claim as zero rather than omitting it", () => {
    // The whole point: "not cited" is a finding, and a tracker that drops
    // zero-cited claims cannot report that a claim is failing.
    const withZero = claimSummary([
      ...rows,
      { query_id: 19, claim: "definition", cited: false, position: "" },
    ]);
    const definition = withZero.find((s) => s.claim === "definition")!;
    expect(definition).toBeDefined();
    expect(definition.rate).toBe(0);
    expect(definition.median).toBeNull();
  });

  it("sorts strongest claim first, so the summary reads top-down", () => {
    // neutrality is 2/3 here and skip-when is 1/2, so the ordering is the
    // assertion — not "the alphabetically first one".
    const summary = claimSummary(rows);
    expect(summary.map((s) => s.claim)).toEqual(["neutrality", "skip-when"]);
  });

  it("omits claims with no runs at all", () => {
    // A claim with no queries is a vocabulary that drifted, not a result of 0%.
    expect(claimSummary(rows, ["neutrality", "never-run"]).map((s) => s.claim)).toEqual([
      "neutrality",
    ]);
  });

  it("survives no rows", () => {
    expect(claimSummary([])).toEqual([]);
    expect(claimSummary(undefined)).toEqual([]);
  });
});

describe("contentGaps", () => {
  it("finds tracked queries with no page to be cited from", () => {
    // These are the queries where the fix is writing copy, not improving a
    // ranking. Lumping them in with "not cited" produces a to-do list of things
    // to rewrite, when the thing does not exist.
    const gaps = contentGaps(
      ALL_QUERIES,
      [{ query_id: 101, claim: "skip-when", cited: false, position: "" }],
    );
    expect(gaps.map((g) => g.id)).toContain(102);
    expect(gaps.map((g) => g.id)).toContain(106);
    // Every gap must genuinely have no target page.
    for (const gap of gaps) {
      expect(ALL_QUERIES.find((q) => q.id === gap.id)!.target).toBe("");
    }
  });

  it("does not report a query that has a page but was not cited", () => {
    // That is a ranking problem, and it belongs in the by-query table where the
    // position column means something.
    expect(contentGaps(ALL_QUERIES, [])).not.toContainEqual(
      expect.objectContaining({ id: 17 }),
    );
  });

  it("drops a gap once something else answers the query", () => {
    const gaps = contentGaps(ALL_QUERIES, [
      { query_id: 102, claim: "skip-when", cited: true, position: 1 },
    ]);
    expect(gaps.map((g) => g.id)).not.toContain(102);
  });
});

describe("movement", () => {
  it("signs a delta so positive means moved closer to the top", () => {
    const now = [{ query_id: 8, claim: "neutrality", cited: true, position: 2 }];
    const before = [{ query_id: 8, claim: "neutrality", cited: true, position: 5 }];
    expect(movement(now, before)).toEqual([{ queryId: 8, from: 5, to: 2, delta: 3 }]);
  });

  it("reports a loss as negative rather than dropping it", () => {
    const now = [{ query_id: 8, claim: "neutrality", cited: true, position: 7 }];
    const before = [{ query_id: 8, claim: "neutrality", cited: true, position: 2 }];
    expect(movement(now, before)[0].delta).toBe(-5);
  });

  it("omits a query with no prior history rather than calling it a total loss", () => {
    const now = [{ query_id: 999, claim: "neutrality", cited: true, position: 1 }];
    expect(movement(now, [])).toEqual([]);
  });

  it("handles a query that stopped being cited", () => {
    // It is absent from `now`, so it has no current median — the query table shows
    // it as uncited this month and the comparison is left unstated rather than
    // invented.
    const before = [{ query_id: 8, claim: "neutrality", cited: true, position: 2 }];
    expect(movement([], before)).toEqual([]);
  });
});

describe("the query set itself", () => {
  it("carries the 20 original queries, unrewritten", () => {
    // These strings are the measurement. Rewording one invalidates the
    // comparison against every prior month.
    expect(CITATION_QUERIES).toHaveLength(20);
    expect(CITATION_QUERIES[0].query).toBe("why is my LLM app slow");
    expect(CITATION_QUERIES[19].query).toBe("AI infrastructure stack layers");
  });

  it("never names this site, because that measures brand recall instead", () => {
    // A query containing "lattice" answers "is the brand known", which is a
    // different problem from "is the content chosen", with a different fix.
    for (const q of ALL_QUERIES) {
      expect(q.query.toLowerCase(), `query ${q.id} names the site`).not.toMatch(/lattice/i);
    }
  });

  it("gives every query a claim that exists in the vocabulary", () => {
    // The tracker's instruction is "double down on the tactic category it maps
    // to", so an unrecognised claim makes that instruction unfollowable. Asserted
    // against `Object.keys` rather than through the type, because a type error
    // cannot fail on data edited at runtime — and this file is edited by hand.
    const known = new Set<string>(Object.keys(CLAIMS));
    for (const q of ALL_QUERIES) {
      expect(known.has(q.claim), `query ${q.id} claim "${q.claim}"`).toBe(true);
    }
  });

  it("uses unique ids, because the log references them across months", () => {
    const ids = ALL_QUERIES.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives the load-bearing claims a denominator", () => {
    // `02-unique-selling-points.md` §2 calls skip-when the most defensible thing
    // the site has. One query is not a measurement of that.
    const skipWhen = ALL_QUERIES.filter((q) => q.claim === "skip-when");
    expect(skipWhen.length).toBeGreaterThanOrEqual(5);
    // And the claim it calls the wedge should not rest on one query either.
    expect(ALL_QUERIES.filter((q) => q.claim === "cross-layer").length).toBeGreaterThanOrEqual(3);
  });

  it("exercises every declared claim, so no category is measured as zero by accident", () => {
    // `Set<string>` rather than the inferred `Set<Claim>`, because `Object.keys`
    // is `string[]` and comparing it against a narrower set type is the error
    // this file hit — the check is correct and the annotation was not.
    const used = new Set<string>(ALL_QUERIES.map((q) => q.claim));
    for (const claim of Object.keys(CLAIMS)) {
      expect(used.has(claim), `claim "${claim}" has no query`).toBe(true);
    }
  });

  it("gives every query a target that resolves to a real route, or is empty", () => {
    // An empty target is a declared content gap. A target pointing at a page that
    // does not exist is a bug that would make the tracker's advice unfollowable.
    const routes = new Set(
      ALL_QUERIES.map((q) => q.target)
        .filter(Boolean)
        .map((t) => t.split("/").slice(0, 3).join("/")),
    );
    expect(routes.size).toBeGreaterThan(10);
  });
});