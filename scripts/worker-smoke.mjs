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
 * Beacon posts that must all answer 204, whether accepted or rejected.
 *
 * Every case returns 204 deliberately — see `app/signal/route.ts` — so the status
 * alone proves the route loaded and the validator ran, and cannot tell an accepted
 * beacon from a rejected one. `logged` is what closes that: a unique token is
 * embedded in the payload and the Worker log is grepped for it afterwards, so the
 * test asserts not just "did not 500" but "this one was counted, that one was
 * discarded".
 *
 * That distinction is the whole security property of the route. An endpoint that
 * logged everything would pass every one of these checks and hand anyone on the
 * internet a write API for the metrics in `04-monetisation.md` §7.
 */
const BEACONS = [
  {
    name: "a valid beacon",
    body: { event: "compare", to: "/compare/vector-databases" },
    expect: 204,
    // Grepped for in the Worker log. A real path, because a fabricated one would
    // make the assertion depend on the validator accepting paths that nothing else
    // in the site produces.
    logged: "/compare/vector-databases",
  },
  { name: "an event outside the vocabulary", body: { event: "nope", to: "/smokenope" }, expect: 204, silent: "smokenope" },
  { name: "a scheme-relative destination", body: { event: "tool", to: "//smokeevil.com" }, expect: 204, silent: "smokeevil" },
  { name: "a non-JSON body", raw: "not json at all", expect: 204, silent: "not json at all" },
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
    expect: (r) => Array.isArray(r.result?.tools) && r.result.tools.length >= 9,
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
      try {
        const res = await fetch(`${BASE}/signal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: beacon.raw ?? JSON.stringify(beacon.body),
        });
        record(
          res.status === beacon.expect,
          `signal ${beacon.name}`,
          res.status === beacon.expect ? "" : `expected ${beacon.expect}, got ${res.status}`,
        );
      } catch (error) {
        record(false, `signal ${beacon.name}`, `threw: ${error.message}`);
      }
    }

    // Whether each beacon was *counted*, as opposed to answered. `wrangler dev`
    // prints Worker `console.log` to stdout, which `log` has been accumulating
    // since spawn, so this reads the real emission rather than inferring it.
    //
    // A short settle, because a rejected beacon is rejected without logging and a
    // logged one is written as the response is flushed — reading `log` on the same
    // tick as the fetch can win the race in either direction.
    await sleep(1000);
    for (const beacon of BEACONS) {
      const needle = beacon.logged ?? beacon.silent;
      if (!needle) continue;
      const present = log.includes(needle);
      if (beacon.logged) {
        record(
          present,
          `signal ${beacon.name} is logged`,
          present ? "" : "no Worker log line contained it — accepted but never recorded",
        );
      } else {
        record(
          !present,
          `signal ${beacon.name} is not logged`,
          present ? "a rejected beacon reached the log — the validator was bypassed" : "",
        );
      }
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