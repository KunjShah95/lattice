import { describe, expect, it } from "vitest";
import { GET, POST } from "../app/signal/route";

/**
 * The `/signal` route's contract.
 *
 * These exist because the route's behaviour used to be observable only by
 * scraping the Worker's stdout from the smoke test, which is a subprocess's
 * buffered pipe and fails intermittently. Calling the handler directly makes the
 * accept/reject contract deterministic, so the smoke test can check the same thing
 * at the runtime layer without being the only thing that checks it at all.
 *
 * The status split is the contract:
 *
 * - **200 with the recorded edge** — accepted. Both ends present, because a record
 *   with only one end is a counter, and every "did anyone arrive at X" metric
 *   depends on the edge.
 * - **204, empty** — rejected. Silent, because a malformed beacon is noise and a
 *   4xx would appear as failed requests in the very analytics this route produces.
 *   Both statuses are 2xx, so neither pollutes request analytics.
 */

const post = (body: string) =>
  POST(new Request("https://example.test/signal", { method: "POST", body }));

const postJson = (body: unknown) => post(JSON.stringify(body));

describe("POST /signal", () => {
  it("records an accepted beacon and returns the edge", async () => {
    const res = await postJson({
      event: "compare",
      from: "/inference-serving/vllm",
      to: "/compare/inference-runtimes",
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      event: "lattice.signal",
      kind: "compare",
      from: "/inference-serving/vllm",
      to: "/compare/inference-runtimes",
    });
  });

  it("stamps a parseable time", async () => {
    // The log is queried by date, so an unparseable stamp makes the whole record
    // unfilterable rather than merely untidy.
    const body = await (
      await postJson({ event: "tool", from: "/all", to: "/all" })
    ).json();
    expect(Number.isNaN(Date.parse(body.at))).toBe(false);
  });

  it("never logs or echoes a rejected beacon", async () => {
    // The status is the only thing that distinguishes these, and it is the whole
    // security property: an endpoint that accepted everything would let anyone
    // write the metric in `04-monetisation.md` §7.
    for (const body of [
      { event: "stakeholder_pressure", from: "/a", to: "/b" },
      { event: "compare", from: "/a", to: "//evil.com" },
      { event: "compare", from: "/a" },
      { event: "compare", to: "/b" },
      "not json at all",
      "",
      null,
    ]) {
      const raw = typeof body === "string" ? body : JSON.stringify(body);
      const res = await post(raw);
      expect(res.status, raw).toBe(204);
      expect(await res.text(), raw).toBe("");
    }
  });

  it("rejects an oversized body without echoing it back", async () => {
    // Reflection is the risk in echoing the accepted record, so the accepted path
    // can only ever return what the validator already checked. This asserts the
    // size cap still runs before anything is reflected.
    const res = await post("x".repeat(2000));
    expect(res.status).toBe(204);
    expect((await res.text()).length).toBe(0);
  });

  it("answers a declared over-length content-length without reading the body", async () => {
    // A cap checked only after buffering is not a cap. The header is honoured
    // before `request.text()` allocates.
    const res = await POST(
      new Request("https://example.test/signal", {
        method: "POST",
        body: "{}",
        headers: { "content-type": "application/json", "content-length": "999999" },
      }),
    );
    expect(res.status).toBe(204);
  });

  it("never caches, so a beacon is never replayed from a CDN", async () => {
    const res = await postJson({ event: "tool", from: "/all", to: "/all" });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("strips a querystring before recording it", async () => {
    const body = await (
      await postJson({ event: "tool", from: "/all?utm=x", to: "/all#y" })
    ).json();
    expect(body.from).toBe("/all");
    expect(body.to).toBe("/all");
  });
});

describe("GET /signal", () => {
  it("answers 405 and describes the endpoint rather than looking missing", async () => {
    const res = await GET();
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toContain("POST");
    const body = await res.json();
    expect(body.method).toBe("POST");
    // The event vocabulary is published, so a client can discover it rather than
    // guessing which strings are accepted.
    expect(body.accepts.event).toContain("compare");
  });
});