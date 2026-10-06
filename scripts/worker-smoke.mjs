/**
 * Smoke-test the **deployed shape**, not `next start`.
 *
 * ## Why this exists as its own script
 *
 * `ci.yml` starts `next start` and requests a sample of routes. That is the
 * right check for a dynamic segment named inconsistently, and it is blind to the
 * class of bug that cost a production incident: `/mcp` returned **500 on the
 * Worker while every route returned 200 under `next start`**, because it was the
 * only route declaring `runtime = "edge"`. The route loaded fine on Node. The
 * failure was in the one runtime that actually serves traffic, and nothing in CI
 * ran that runtime.
 *
 * So this builds the Worker with the same command the deploy pipeline uses
 * (`npm run build` — not `npx opennextjs-cloudflare build`, which re-enters
 * itself without the recursion marker in `build.mjs` and produces a
 * `next-env.mjs` with duplicate exports), starts `wrangler dev` against the
 * bundle, and requests the routes that matter.
 *
 * ## What it will not catch
 *
 * Deployment-specific configuration: Cloudflare WAF rules, bot allow-lists,
 * custom domains, TLS. Those are environment, not build. This covers the code
 * path that a Node server cannot exercise.
 *
 * Run: node scripts/worker-smoke.mjs
 */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.SMOKE_PORT ?? 3199);
const BASE = `http://127.0.0.1:${PORT}`;

/**
 * Routes that must answer 200.
 *
 * The set is chosen for what each one proves rather than for coverage:
 * a prerendered page, a client-filtered page, a static JSON feed, a dynamic text
 * feed, a build-time-static JSON route, the discovery document, and a
 * submission page added last.
 */
const OK = [
  "/",
  "/submit",
  "/methodology",
  "/all",
  "/glossary",
  "/inference-serving",
  "/inference-serving/vllm",
  "/llms.txt",
  "/llms-full.txt",
  "/feed.xml",
  "/sitemap.xml",
  "/robots.txt",
  "/tools.json",
  "/verification.json",
  "/search-index.json",
  "/mcp.json",
];

/** Routes that must answer with a specific non-200 status. */
const EXPECTED = [
  // A GET on the MCP endpoint is a 405 by design: the route exists, the protocol
  // uses POST. Asserting the exact code rather than "not 200" is what
  // distinguishes "wrong runtime" from "never built".
  { path: "/mcp", status: 405 },
  // `/signal` is 405 on GET for the same reason — a beacon is a POST.
  { path: "/signal", status: 405 },
  // The band axis. Both routes are prerendered via `generateStaticParams`, so a
  // regression here is the `next build`-passes-but-500s class: a page that was
  // never generated because its params did not match the vocabulary.
  { path: "/bands", status: 200 },
  { path: "/bands/compute", status: 200 },
  { path: "/bands/nonsense", status: 404 },
  // An unknown path must 404, not 200 and not 500.
  { path: "/definitely-not-a-page", status: 404 },
];

/**
 * Beacon posts that must all answer 204, whether accepted or rejected.
 *
 * Every case returns 204 deliberately — see `app/signal/route.ts` — so the status
 * proves the route loaded and the validator ran, and cannot distinguish them. What
 * is actually being tested is that none of them 500s on the Worker, which is the
 * failure mode an unauthenticated public endpoint is most likely to have.
 */
/**
 * Beacon posts, and what each must answer.
 *
 * Accepted beacons answer 200 with the recorded edge. Rejected ones answer 204
 * and an empty body — a malformed beacon is noise, and a 4xx would show up as
 * failed requests in the very analytics this route exists to produce, so
 * rejection stays silent and inside the 2xx range.
 *
 * The status alone distinguishes the two, which is the point: this used to assert
 * that every case answered 204 and then scrape the Worker's stdout to see which
 * ones had been logged. Scraping a subprocess's buffered pipe fails intermittently
 * — and did, here, intermittently enough to look like a product bug and to cost
 * more time than the thing it was verifying.
 *
 * `expect` receives the status and the parsed body (null when there is none), so a
 * case can assert that the recorded edge carries both ends of the navigation.
 */
const BEACONS = [
  {
    name: "a valid beacon",
    body: {
      event: "compare",
      from: "/inference-serving/vllm",
      to: "/compare/inference-runtimes",
    },
    expect: (status, body) =>
      status === 200 &&
      body?.event === "lattice.signal" &&
      body?.kind === "compare" &&
      // Both ends, or the log is a counter rather than an edge and every
      // "did anyone arrive at X" metric is wrong. The first version recorded only
      // the page the reader was already on.
      body?.from === "/inference-serving/vllm" &&
      body?.to === "/compare/inference-runtimes" &&
      typeof body?.at === "string",
    why: "expected a 200 echoing the recorded edge",
  },
  { name: "an event outside the vocabulary", body: { event: "nope", from: "/a", to: "/b" }, expect: 204 },
  { name: "a scheme-relative destination", body: { event: "tool", from: "/a", to: "//evil.com" }, expect: 204 },
  { name: "a beacon with no destination", body: { event: "compare", from: "/a" }, expect: 204 },
  { name: "a non-JSON body", raw: "not json at all", expect: 204 },
  { name: "an empty body", raw: "", expect: 204 },
  { name: "an oversized body", raw: "x".repeat(2000), expect: 204 },
];

/** JSON-RPC calls that must produce a result rather than a protocol error. */
const RPC = [
  {
    name: "initialize",
    body: {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-06-18", capabilities: {} },
    },
    expect: (r) => r.result?.protocolVersion === "2025-06-18",
    why: "the protocol version must be negotiated, not echoed blindly",
  },
  {
    name: "tools/list",
    body: { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
    expect: (r) => Array.isArray(r.result?.tools) && r.result.tools.length >= 10,
    why: "every tool must be discoverable",
  },
  {
    name: "tools/call search_tools",
    body: {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "search_tools", arguments: { layer: 7, limit: 3 } },
    },
    expect: (r) => Array.isArray(JSON.parse(r.result.content[0].text).results),
    why: "a faceted query must return rows",
  },
  {
    name: "tools/call layer_overlaps",
    body: {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "layer_overlaps", arguments: {} },
    },
    expect: (r) => JSON.parse(r.result.content[0].text).overlaps.length > 0,
    why: "the inverse index must be populated",
  },
  {
    name: "invalid params are a tool error, not a protocol error",
    body: {
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: { name: "search_tools", arguments: { deployment: "hosted" } },
    },
    expect: (r) => r.result?.isError === true && !r.error,
    why: "a model has to be able to read what it did wrong and retry",
  },
  {
    name: "tools/call recommend_stack",
    body: {
      jsonrpc: "2.0",
      id: 6,
      method: "tools/call",
      params: { name: "recommend_stack", arguments: { workload: "rag", queriesPerMonth: 200000 } },
    },
    expect: (r) => {
      const out = JSON.parse(r.result.content[0].text);
      // Picks with reasons, plus the honesty fields. A payload that dropped
      // `assumptions` or the cost caveat would read as a confident answer for a
      // case the caller never actually specified.
      return (
        out.picks.length > 1 &&
        out.picks.every((p) => p.why && p.watchOut && p.url.startsWith("https://")) &&
        Array.isArray(out.assumptions) &&
        /not a vendor quote/i.test(out.cost.note)
      );
    },
    why: "the Stack Builder must be reachable from an agent, with its limits stated",
  },
  {
    name: "resources/list",
    body: { jsonrpc: "2.0", id: 7, method: "resources/list", params: {} },
    expect: (r) => Array.isArray(r.result?.resources) && r.result.resources.length > 50,
    why: "the site's arguments must be readable as resources, not only assembled from tool fields",
  },
  {
    name: "resources/templates/list",
    body: { jsonrpc: "2.0", id: 8, method: "resources/templates/list", params: {} },
    expect: (r) => r.result?.resourceTemplates?.length === 4,
    why: "a client must be able to discover the four shapes without paging the whole list",
  },
  {
    name: "resources/read an essay",
    body: {
      jsonrpc: "2.0",
      id: 9,
      method: "resources/read",
      params: { uri: "text://lattice/essay/evals-are-the-asset" },
    },
    expect: (r) => r.result?.contents?.[0]?.text?.length > 1500,
    why: "the essay must come back as prose, not a stub or a metadata record",
  },
  {
    name: "resources/read a missing uri names the valid shapes",
    body: {
      jsonrpc: "2.0",
      id: 10,
      method: "resources/read",
      params: { uri: "text://lattice/essay/nope" },
    },
    expect: (r) => r.result?.isError === true && /resources\/list/.test(r.result.contents[0].text),
    why: "a guess has to be correctable, or the client gives up on the surface",
  },
];

/**
 * Facet queries against `/api/search`, which must answer 200 with a non-empty
 * result set on the Worker.
 *
 * Each `expect` checks something the status alone cannot: that the *filters* took
 * effect rather than being ignored. An endpoint that answered 200 and returned
 * the unfiltered corpus would pass a status-only check, and a caller reading it
 * would conclude the filter matched everything.
 */
const FACET_SEARCHES = [
  {
    name: "a single cost facet",
    path: "/api/search?cost=free&limit=50",
    expect: (j) => j.count > 0 && j.filters.cost[0] === "free",
  },
  {
    name: "two axes ANDed",
    path: "/api/search?kind=platform&deployment=saas&limit=50",
    expect: (j) => j.count > 0 && j.filters.kind[0] === "platform" && j.filters.deployment[0] === "saas",
  },
  {
    name: "a browse with no query",
    path: "/api/search?role=serving&limit=50",
    expect: (j) => j.query === "" && j.count > 0 && j.results.every((r) => r.kind === "tool"),
  },
  {
    name: "a repeated key ORs",
    path: "/api/search?cost=free&cost=usage-based&limit=50",
    expect: (j) => j.filters.cost.length === 2,
  },
  {
    name: "an unrecognised value is named",
    path: "/api/search?q=a&cost=fre",
    // This case returns an *empty* result set by design, alongside the vocabulary
    // that explains why. `mayBeEmpty` opts it out of the shared count check.
    mayBeEmpty: true,
    expect: (j) => j.unrecognisedFilterValues?.cost?.[0] === "fre",
  },
  {
    name: "the accepted vocabulary is published",
    path: "/api/search?cost=free",
    expect: (j) => Array.isArray(j.acceptedFilterValues?.cost) && j.acceptedFilterValues.cost.includes("free"),
  },
];

const failures = [];
const record = (ok, label, detail) => {
  console.log(`${ok ? "  ok " : "FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(label);
};

/** True when the bundled Worker exists and looks current. */
function bundleLooksValid() {
  const worker = join(root, ".open-next", "worker.js");
  if (!existsSync(worker)) {
    console.error(
      "No .open-next/worker.js. Run `npm run build` first — this script tests the\n" +
        "bundle the deploy pipeline uploads, not a Next server.",
    );
    process.exit(1);
  }

  // The recursion bug worth naming: `npx opennextjs-cloudflare build` without the
  // marker re-enters itself and appends a second copy of next-env.mjs, which the
  // Worker then refuses to load with `The symbol "test" has already been declared`.
  const nextEnv = join(root, ".open-next", "cloudflare", "next-env.mjs");
  if (existsSync(nextEnv)) {
    const copies = readFileSync(nextEnv, "utf8").split("export const test").length - 1;
    if (copies > 1) {
      console.error(
        `.open-next/cloudflare/next-env.mjs declares \`test\` ${copies} times.\n` +
          "The bundle was built with `npx opennextjs-cloudflare build`, which re-enters\n" +
          "itself and duplicates the file. Run `npm run build`, which sets the marker\n" +
          "scripts/build.mjs relies on, and delete .open-next first.",
      );
      process.exit(1);
    }
  }
}

async function waitForServer(timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/robots.txt`, { signal: AbortSignal.timeout(5000) });
      if (res.status) return true;
    } catch {
      // Not listening yet.
    }
    await sleep(1500);
  }
  return false;
}

const code = async (path) => {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
  return res.status;
};

const main = async () => {
  bundleLooksValid();

  console.log(`\nWorker smoke test on ${BASE}\n`);

  const wrangler = spawn(
    "npx",
    ["wrangler", "dev", "--port", String(PORT), "--local"],
    { cwd: root, stdio: ["ignore", "pipe", "pipe"], shell: process.platform === "win32" },
  );

  let log = "";
  wrangler.stdout?.on("data", (d) => (log += d.toString()));
  wrangler.stderr?.on("data", (d) => (log += d.toString()));

  const shutdown = () => {
    try {
      wrangler.kill();
    } catch {
      // Already gone.
    }
  };
  // If this script is interrupted, the Worker would otherwise outlive it and hold
  // `.open-next` open — which then makes the next `rmdir` fail with EBUSY.
  process.on("exit", shutdown);
  process.on("SIGINT", () => {
    shutdown();
    process.exit(130);
  });

  try {
    if (!(await waitForServer())) {
      console.error("wrangler dev never started listening.\n");
      console.error(log.split("\n").slice(-25).join("\n"));
      record(false, "wrangler dev starts", "never listened on the port");
      return finish();
    }

    for (const path of OK) {
      let status = 0;
      try {
        status = await code(path);
      } catch (error) {
        record(false, path, `threw: ${error.message}`);
        continue;
      }
      record(status === 200, path, status === 200 ? "" : `got ${status}`);
    }

    for (const { path, status: want } of EXPECTED) {
      const got = await code(path).catch(() => 0);
      record(got === want, path, got === want ? "" : `expected ${want}, got ${got}`);
    }

    for (const call of RPC) {
      let body;
      let json;
      try {
        const res = await fetch(`${BASE}/mcp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(call.body),
        });
        json = await res.json();
      } catch (error) {
        record(false, `mcp ${call.name}`, `threw: ${error.message}`);
        continue;
      }
      body = JSON.stringify(json).slice(0, 120);
      let ok = false;
      try {
        ok = call.expect(json);
      } catch {
        ok = false;
      }
      record(ok, `mcp ${call.name}`, ok ? "" : `${call.why} — got ${body}`);
    }

    for (const beacon of BEACONS) {
      let ok = false;
      let why = beacon.why ?? "";
      try {
        const res = await fetch(`${BASE}/signal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: beacon.raw ?? JSON.stringify(beacon.body),
        });
        const expect =
          typeof beacon.expect === "function"
            ? beacon.expect
            : (status) => status === beacon.expect;
        // A rejected beacon has no body; do not throw trying to read one.
        const text = await res.text();
        let body = null;
        try {
          body = text ? JSON.parse(text) : null;
        } catch {
          body = null;
        }
        ok = expect(res.status, body);
        if (!ok && !why) why = `expected ${beacon.expect}, got ${res.status}`;
      } catch (error) {
        ok = false;
        why = `threw: ${error.message}`;
      }
      record(ok, `signal ${beacon.name}`, ok ? "" : `${why}`);
    }

    /**
     * The facet surface, on the Worker.
     *
     * `/api/search` is the plain-HTTPS path into the index and its facets are the
     * only way a caller without an MCP client can filter. Asserted here rather
     * than in a unit test because the thing that can go wrong is the *bundling* —
     * a `.mjs` import the Worker resolves differently from Node, or a filter that
     * returns nothing on the runtime that actually serves traffic.
     */
    for (const facet of FACET_SEARCHES) {
      let ok = false;
      let detail = "";
      try {
        const res = await fetch(`${BASE}${facet.path}`);
        const json = await res.json();
        // Most facets must return results; `mayBeEmpty` — used by the unrecognised-value
        // case — returns 200 with an empty result set and the published vocabulary.
        ok = res.status === 200 && facet.expect(json) && (facet.mayBeEmpty || json.count > 0);
        if (!ok) detail = `count=${json.count} ${JSON.stringify(json).slice(0, 100)}`;
      } catch (error) {
        detail = `threw: ${error.message}`;
      }
      record(ok, `api/search ${facet.name}`, detail);
    }

    /**
     * The rate limiter, on the Worker.
     *
     * Only that it refuses and stays a 2xx-shaped answer: `/signal` rejects
     * silently by design, so a flood is indistinguishable from accepted beacons
     * from the outside — which is exactly why the limit has to be asserted by
     * exhausting it rather than by reading a status code. The budget is 120 per
     * minute, so this makes 130 requests; cheap against a local workerd and it is
     * the only check that the limiter is actually wired into the bundle rather
     * than merely imported.
     */
    {
      let refused = 0;
      let accepted = 0;
      const body = JSON.stringify({
        event: "tool",
        from: "/inference-serving/vllm",
        to: "/compare/inference-runtimes",
      });
      for (let i = 0; i < 130; i++) {
        const res = await fetch(`${BASE}/signal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        // Accepted beacons answer 200 with the recorded edge; a rate-limited one
        // answers 204 and is discarded.
        if (res.status === 200) accepted++;
        else if (res.status === 204) refused++;
      }
      record(
        refused > 0 && accepted > 0,
        "signal rate limiter refuses a flood",
        `accepted=${accepted} refused=${refused} (both must be non-zero: the limit has to bind without breaking normal beacons)`,
      );
    }
  } finally {
    shutdown();
    // `wrangler dev` holds `.open-next` open for a moment after the signal.
    await sleep(1500);
  }

  finish();
};

function finish() {
  console.log(
    failures.length === 0
      ? "\nWorker smoke test passed.\n"
      : `\n${failures.length} check(s) failed:\n${failures.map((f) => `  - ${f}`).join("\n")}\n`,
  );
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});