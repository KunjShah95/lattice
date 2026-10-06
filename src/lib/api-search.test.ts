import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/search/route";
import { site } from "@/lib/site";

/**
 * `/api/search` is the crawler-facing query surface: plain HTTPS for agents
 * without an MCP client. The contract pinned here is small — a 400 with
 * usage when `q` is absent, absolute canonical URLs on every hit, and a
 * bounded page — because the ranking itself already has a suite in
 * `search.test.ts` and re-asserting it here would couple the two.
 */
function get(url: string): Response {
  return GET(new Request(url)) as unknown as Response;
}

describe("/api/search", () => {
  it("returns ranked hits with absolute URLs", async () => {
    const res = await get("http://localhost/api/search?q=vector+database");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      query: string;
      count: number;
      results: Array<{ kind: string; name: string; url: string }>;
    };
    expect(body.query).toBe("vector database");
    expect(body.count).toBe(body.results.length);
    expect(body.count).toBeGreaterThan(0);
    for (const r of body.results) {
      expect(r.url.startsWith(site.url), `${r.name} has no absolute url`).toBe(true);
    }
  });

  it("rejects a missing query with usage, not an empty result set", async () => {
    const res = await get("http://localhost/api/search");
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; usage: string };
    expect(body.error).toContain('"q"');
    expect(body.usage).toContain("/api/search?q=");
  });

  it("clamps limit to a bounded page", async () => {
    const huge = (await (
      await get("http://localhost/api/search?q=a&limit=1000")
    ).json()) as { results: unknown[] };
    expect(huge.results.length).toBeLessThanOrEqual(50);

    const nan = (await (
      await get("http://localhost/api/search?q=a&limit=nonsense")
    ).json()) as { results: unknown[] };
    expect(nan.results.length).toBeLessThanOrEqual(10);
  });

  it("is callable cross-origin, like the other machine endpoints", async () => {
    const res = await get("http://localhost/api/search?q=vector");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

/**
 * Facets.
 *
 * The parity claim with the MCP `search_tools` tool is the thing worth pinning:
 * an agent with an MCP client could ask "free, self-hosted, layer 3" and an
 * agent without one could not, because this route read one query parameter.
 * These tests assert the query surface accepts the same vocabulary, so the two
 * surfaces cannot drift apart silently.
 */
type Hit = { kind: string; name: string; url: string };

async function body(url: string) {
  const res = await get(url);
  return {
    status: res.status,
    body: (await res.json()) as {
      query?: string;
      count?: number;
      filters?: Record<string, string[]>;
      unrecognisedFilterValues?: Record<string, string[]>;
      acceptedFilterValues?: Record<string, string[]>;
      results: Hit[];
    },
  };
}

describe("/api/search facets", () => {
  it("filters on a single axis", async () => {
    const { body: b } = await body("http://localhost/api/search?q=a&cost=free");
    expect(b.count).toBeGreaterThan(0);
    expect(b.filters).toEqual({ cost: ["free"] });
    expect(b.results.length).toBe(b.count);
  });

  it("ORs a repeated key rather than letting the last one win", async () => {
    // Facet-only browses rather than `q=a`, which matches almost nothing and
    // would make the counts a comparison of noise.
    const { body: b } = await body(
      "http://localhost/api/search?cost=free&cost=usage-based&limit=50",
    );
    expect(b.filters!.cost).toEqual(["free", "usage-based"]);
    const single = await body("http://localhost/api/search?cost=free&limit=50");
    expect(b.count).toBeGreaterThan(single.body.count!);
  });

  it("ANDs across axes", async () => {
    // Two axes that genuinely intersect. Every runtime in the index is both free
    // and self-hosted, so `kind=runtime&cost=free` returns exactly `kind=runtime`
    // — a test asserting "fewer" would fail, and one asserting "equal" would pass
    // without proving the AND happens at all. Platforms split across both
    // deployment models, so the intersection is a strict subset.
    const both = await body(
      "http://localhost/api/search?kind=platform&deployment=saas&limit=50",
    );
    const justKind = await body("http://localhost/api/search?kind=platform&limit=50");
    const justDeployment = await body(
      "http://localhost/api/search?deployment=saas&limit=50",
    );
    const selfHosted = await body(
      "http://localhost/api/search?kind=platform&deployment=self-hosted&limit=50",
    );
    expect(both.body.count).toBeGreaterThan(0);
    expect(selfHosted.body.count).toBeGreaterThan(0);
    // A strict subset of each filter taken alone, which is what distinguishes
    // AND from OR. Asserted on both rather than one, because an OR would return
    // *more* than the single filter and a pass on only one axis would miss it.
    expect(both.body.count!).toBeLessThan(justKind.body.count!);
    expect(both.body.count!).toBeLessThan(justDeployment.body.count!);
    expect(selfHosted.body.count!).toBeLessThan(justDeployment.body.count!);
  });

  it("filters by role id, the vocabulary the MCP tool uses", async () => {
    const { body: b } = await body("http://localhost/api/search?q=a&role=serving");
    expect(b.count).toBeGreaterThan(0);
    expect(b.filters!.role).toEqual(["serving"]);
  });

  it("filters by layer", async () => {
    // Browsed rather than queried. `layer` is the one axis that reaches
    // non-tool entries too, because every entry carries a layer — an essay
    // tagged layer 1 is genuinely about that layer. So this asserts the tools
    // land in the right section rather than that every hit does, which is the
    // stronger and more honest claim.
    const { body: b } = await body("http://localhost/api/search?layer=1&limit=50");
    expect(b.count).toBeGreaterThan(0);
    const tools = b.results.filter((r) => r.kind === "tool");
    expect(tools.length).toBeGreaterThan(0);
    for (const r of tools) {
      expect(r.url, r.name).toContain("/inference-serving/");
    }
  });

  it("allows a browse with no query at all, which is the point of facets", async () => {
    const { status, body: b } = await body("http://localhost/api/search?role=serving");
    expect(status).toBe(200);
    expect(b.query).toBe("");
    expect(b.count).toBeGreaterThan(0);
    expect(b.results.every((r) => r.kind === "tool")).toBe(true);
  });

  it("still requires a query when nothing is filtered", async () => {
    const { status } = await body("http://localhost/api/search");
    expect(status).toBe(400);
  });

  it("publishes the accepted values so a caller can correct itself", async () => {
    const { status, body: b } = await body("http://localhost/api/search");
    expect(status).toBe(400);
    expect(b.acceptedFilterValues!.cost).toContain("free");
    expect(b.acceptedFilterValues!.layer).toContain("1");
    expect(b.acceptedFilterValues!.role).toHaveLength(5);
  });

  it("names an unrecognised value rather than silently returning nothing", async () => {
    // `?cost=fre` is a typo. Returning zero results reads as "nothing matches";
    // naming it says the value does not exist, which is a different and fixable
    // problem for the caller.
    const { status, body: b } = await body(
      "http://localhost/api/search?q=a&cost=fre",
    );
    expect(status).toBe(200);
    expect(b.unrecognisedFilterValues).toEqual({ cost: ["fre"] });
    expect(b.count).toBe(0);
  });

  it("omits the filter keys entirely on an unfiltered response", async () => {
    // So a response is byte-identical to what the route returned before facets
    // existed, and an existing client sees no new keys it has to ignore.
    const { body: b } = await body("http://localhost/api/search?q=vector");
    expect(b.filters).toBeUndefined();
    expect(b.acceptedFilterValues).toBeUndefined();
    expect(b.unrecognisedFilterValues).toBeUndefined();
  });

  it("keeps `limit` meaning the best N that match every filter", async () => {
    // Filtering before ranking, not after. If it filtered after, `limit=3` would
    // return however many of the top 3 survived rather than the best 3 that did.
    const { body: b } = await body(
      "http://localhost/api/search?q=a&cost=free&limit=3",
    );
    expect(b.results).toHaveLength(3);
  });

  it("returns absolute URLs on every filtered hit", async () => {
    const { body: b } = await body("http://localhost/api/search?role=data");
    expect(b.count).toBeGreaterThan(0);
    for (const r of b.results) {
      expect(r.url.startsWith(site.url), `${r.name} has no absolute url`).toBe(true);
    }
  });

  it("keeps glossary terms reachable, and out of tool-only filters", async () => {
    const terms = await body("http://localhost/api/search?q=paged%20attention");
    expect(terms.body.results.some((r) => r.kind === "glossary")).toBe(true);

    // A tool-only axis excludes a definition: "free tools that also define
    // paged attention" is not what `cost=free` asked for.
    const filtered = await body(
      "http://localhost/api/search?q=paged%20attention&cost=free",
    );
    expect(filtered.body.results.some((r) => r.kind === "glossary")).toBe(false);
  });
});
