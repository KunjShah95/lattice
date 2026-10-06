/**
 * A stubbed GitHub, for the triage harness.
 *
 * Installed with `node --import`, which runs before the target's own module
 * graph — necessary because the target calls `fetch` at top level and ESM
 * imports are hoisted, so a test cannot replace the global in time.
 *
 * It is a real file rather than a string built at runtime for one reason: an
 * issue body is markdown full of backticks, and generating a module source that
 * embeds one inside a template literal produces a syntax error pointing at an
 * unrelated line. Fixtures arrive through a JSON file instead, so nothing has to
 * be escaped into source.
 *
 * Configuration comes from the environment:
 *   TRIAGE_STUB_LOG       where to write the call log (JSON)
 *   TRIAGE_STUB_FIXTURES  { body, repo } as JSON
 */
import { readFileSync, writeFileSync } from "node:fs";

const LOG = process.env.TRIAGE_STUB_LOG;
const FIXTURES = process.env.TRIAGE_STUB_FIXTURES;
const { body: BODY, repo: REPO } = JSON.parse(readFileSync(FIXTURES, "utf8"));

/** Every request the target made, including POST bodies. */
const calls = [];

/**
 * Written on exit rather than after each call: the target makes several requests
 * and a partial log from a crashed run is more useful than none.
 */
process.on("exit", () => writeFileSync(LOG, JSON.stringify(calls, null, 2)));

const json = (value, status = 200) =>
  new Response(JSON.stringify(value), { status });

globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  const method = init.method ?? "GET";

  let payload = null;
  try {
    payload = init.body ? JSON.parse(init.body) : null;
  } catch {
    // A non-JSON body would be a bug in the target; recorded as null so the
    // assertion that reads it fails with something legible.
  }
  calls.push({ url: u, method, payload });

  if (method === "POST" && u.endsWith("/comments")) return json({ id: 1 }, 201);

  if (method === "POST" && u.endsWith("/pulls")) {
    return json({ html_url: "https://github.com/o/r/pull/7" }, 201);
  }

  // The issue read, matched on the path shape rather than a hardcoded number —
  // the number comes from the environment, and pinning it here would make the
  // stub quietly wrong the first time the harness passes `issueNumber`.
  if (method === "GET" && /\/issues\/\d+$/.test(u)) {
    return json({
      number: Number(u.split("/").pop()),
      body: BODY,
      title: "Add Example Guard",
    });
  }

  if (method === "GET" && u.includes("/repos/example/guard")) {
    if (!REPO) return new Response("Not Found", { status: 404 });
    return json(REPO);
  }

  return new Response(`not stubbed: ${u}`, { status: 404 });
};