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
