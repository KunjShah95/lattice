/**
 * Client bundle budget.
 *
 * ## Why this exists
 *
 * Commit `a446032` cut main-thread work the interactions Cloudflare flagged, by
 * hand, across the palette and the explorer. That work is worth keeping only if
 * something notices when it comes back — and nothing did. `next build` prints
 * route sizes and nothing asserts on them, so a component that re-inlines the
 * whole dataset into the RSC payload, or a dependency that arrives with a large
 * transitive tree, ships as a build that "passed".
 *
 * The failure this repo actually had is the clearest argument for it: the search
 * corpus used to be inlined into every route's payload — ~42 KB of JSON in the
 * HTML of a page whose own markup was 16 KB — and it took reading the code to
 * find, not a build to fail.
 *
 * ## What it measures
 *
 * The gzipped size of the JS chunks a route loads, read out of the build output
 * rather than from a browser.
 *
 * Two sources, because Next 16 with Turbopack does not produce one usable
 * per-route manifest: `build-manifest.json` carries `rootMainFiles` (the shared
 * runtime every route loads) and `pages` holds only `/_app`. The App Router's
 * per-route chunks live in `server/app/<path>/page_client-reference-manifest.js`,
 * which maps each client module to the chunks it lives in. So the shared baseline
 * comes from the first and the per-route addition from the second.
 *
 * Measuring from the build rather than from a browser is what makes this usable
 * as a gate: no server, no Lighthouse run, and the same answer on every machine.
 * The trade is that it counts what a route *references*, which is close to but
 * not identical with what it downloads — a chunk shared with another route is
 * counted in full for both. That biases the number upward, which is the safe
 * direction for a ceiling.
 *
 * The budget is per-route, not a total, because a total can be met by making one
 * route worse as long as another gets better.
 *
 * ## The framework floor, and why every ceiling here is above 150 KB
 *
 * **127 KB of every figure below is React 19 and the Next App Router runtime.**
 * That number is the `shared` column and no change in this repository moves it —
 * the only ways to move it are a different framework or a different rendering
 * strategy. So the ceilings are set against the *total*, which means the useful
 * signal is the `route` column: 25 KB on a page, 28 KB on the homepage, 33 KB on
 * the Stack Builder. That is the part this codebase actually owns, and it is the
 * part a regression would land in.
 *
 * ## The numbers
 *
 * Set from the current build, rounded up by under 3%, so the gate fails on a
 * *regression* and not on the measurement. Lower them by hand once a real
 * improvement lands — a budget that is only ever loosened by a comment is not a
 * budget.
 */

import { readFileSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * route path -> gzipped first-load JS ceiling, in bytes.
 *
 * The *total* for that route, framework runtime included, so a regression in the
 * shared layout fails every entry rather than one.
 *
 * The list is the static routes plus the dynamic *segment templates*. Concrete
 * prerendered paths like `/inference-serving/vllm` share one build artefact with
 * every other tool page, so budgeting them separately would be sixteen copies of
 * one number — and the thing worth watching is the template's shared chunk.
 */
const BUDGETS = {
  "/": 160_000,
  "/stack-builder": 165_000,
  "/all": 160_000,
  "/glossary": 160_000,
  "/methodology": 157_000,
  "/submit": 157_000,
  "/blog": 157_000,
  "/compare": 157_000,
  "/fix": 157_000,
  "/roles": 157_000,
  "/bands": 157_000,
  "/[slug]": 157_000,
  "/[slug]/[tool]": 157_000,
  "/[slug]/[tool]/alternatives": 157_000,
  "/roles/[role]": 157_000,
  "/bands/[band]": 157_000,
  "/stack/[workload]": 157_000,
  "/blog/[slug]": 157_000,
  "/compare/[slug]": 157_000,
  "/fix/[slug]": 157_000,
  "/glossary/[slug]": 157_000,
};

const NEXT = join(root, ".next");

if (!existsSync(join(NEXT, "build-manifest.json"))) {
  console.error(
    "No .next/build-manifest.json. Run `npm run next:build` first — the budget is\n" +
      "measured from the build output, not from a dev server.",
  );
  process.exit(1);
}

/**
 * Gzipped bytes of a file under `.next`, or 0 when it is not there.
 *
 * `real gzip` rather than a lookup table of expected sizes: the point is to
 * measure what would actually be served, and a hardcoded number in the budget
 * file would be a claim about the build rather than a measurement of it.
 */
function gzipped(relPath) {
  const full = join(NEXT, relPath);
  if (!existsSync(full)) return 0;
  return gzipSync(readFileSync(full), { level: 9 }).length;
}

const manifest = JSON.parse(readFileSync(join(NEXT, "build-manifest.json"), "utf8"));

/** Framework chunks, loaded by every route. */
const SHARED = manifest.rootMainFiles ?? [];

/**
 * Every client chunk a route loads: the shared runtime plus its own, deduped.
 *
 * Deduplication is not tidiness. The route's reference manifest *also* lists the
 * shared chunks its client components import, so adding the two lists counts
 * React and the App Router runtime twice — which is how a first draft reported
 * every route at ~152 KB when the real figure is nearer 60.
 */
function routeChunks(route) {
  const file = join(
    NEXT,
    "server",
    "app",
    route.replace(/^\//, ""),
    "page_client-reference-manifest.js",
  );
  if (!existsSync(file)) return null;
  const source = readFileSync(file, "utf8");
  const chunks = new Set(SHARED);
  for (const group of source.matchAll(/"chunks":\[([^\]]*)\]/g)) {
    for (const one of group[1].matchAll(/"([^"]+)"/g)) {
      // Paths are `/_next/static/chunks/x.js`; the files live under `.next/`.
      if (one[1].endsWith(".js")) chunks.add(one[1].replace(/^\/_next\//, ""));
    }
  }
  return [...chunks];
}

const rows = [];
const failures = [];

for (const [route, ceiling] of Object.entries(BUDGETS)) {
  const chunks = routeChunks(route);
  if (!chunks) {
    // A route in the budget that no longer exists is itself worth knowing: the
    // budget would otherwise keep "guarding" a page that was renamed or deleted.
    failures.push(`${route} — in the budget, but no build output for it`);
    continue;
  }

  const total = chunks.map(gzipped).reduce((a, b) => a + b, 0);
  const sharedOnly = SHARED.map(gzipped).reduce((a, b) => a + b, 0);
  const ok = total <= ceiling;
  rows.push({
    route,
    shared: sharedOnly,
    // Named `own` rather than `route`, because the row already uses `route` for
    // the path — and a duplicate key silently made the path a number.
    own: total - sharedOnly,
    total,
    ceiling,
    verdict: ok ? "ok" : "OVER",
  });
  if (!ok) {
    failures.push(
      `${route} — ${format(total)} over a ${format(ceiling)} budget (+${format(total - ceiling)})`,
    );
  }
}

function format(n) {
  return `${(n / 1024).toFixed(1)} KB`;
}

const width = Math.max(...rows.map((r) => r.route.length), 12);
console.log(`\nClient bundle budget — gzip, first load\n`);
console.log(
  `${"route".padEnd(width)}  ${"shared".padStart(9)}  ${"route".padStart(9)}  ${"total".padStart(9)}  ${"budget".padStart(9)}`,
);
console.log("-".repeat(width + 44));
for (const r of rows.sort((a, b) => b.total / b.ceiling - a.total / a.ceiling)) {
  const line = `${r.route.padEnd(width)}  ${format(r.shared).padStart(9)}  ${format(r.own).padStart(9)}  ${format(r.total).padStart(9)}  ${format(r.ceiling).padStart(9)}`;
  console.log(r.verdict === "ok" ? line : `${line}   OVER`);
}
console.log("");

if (failures.length) {
  console.error(
    [
      `${failures.length} route(s) outside the client bundle budget:`,
      "",
      ...failures.map((f) => `  - ${f}`),
      "",
      "Either the change is justified — then raise the ceiling in",
      "scripts/check-bundle-budget.mjs with a note saying why — or it is not, and",
      "the fix is to move work out of the client bundle rather than to accept it.",
    ].join("\n"),
  );
  process.exit(1);
}

console.log("All routes within budget.\n");