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
 *
 * Raised by 1 KB (2 KB on `/all`) for the UI detailing pass: the search
 * palette's skeleton rows, its designed empty and failure states and keyboard
 * legend, and the mobile drawer's morphing control and numbered rows all live
 * in the layout's client components, so they land on every route (+0.9 KB
 * gzip). `/all` additionally gained an empty state that lists each live
 * constraint as its own removable chip (+0.9 KB). Everything else in that pass
 * — crop marks, drawn underlines, entrances, skeleton sheen, header elevation
 * — is CSS and costs no JS at all.
 *
 * Raised by 0.5 KB on four routes after that: `/[slug]` and `/[slug]/[tool]`
 * for the layer-coloured spotlight on tool rows (`spot-light.tsx`, +0.1 KB),
 * `/stack/[workload]` for the copy-report buttons, the one client island on an
 * otherwise static page (+0.2 KB), and `/stack-builder` for the report's
 * absolute entry links and reproduce-this-case URL (+0.1 KB).
 *
 * Raised by 0.5 KB on `/all` for `DecisionValve variant="inline"`: each explorer
 * row now prints the skip-when line beside use-when (+0.2 KB, the markup for the
 * second line and its mark). That line is the claim no competitor makes
 * (`strategy/02` §2), so it is not the kind of cost to trade away. The rest of the
 * freshness work (`FreshnessMeter`, `/verification`) is server-rendered and adds
 * no client JS; `/verification` is budgeted at the shared floor to prove it — and
 * the budget did prove it: an early `ToolChip` imported the preview client
 * component, which put its chunk on `/verification` too (+0.7 KB) until the two
 * were split into separate modules.
 *
 * Raised by 1 KB on `/[slug]/[tool]` for `PreviewLink` (the hover card on the
 * sibling and alternative chips, +0.5 KB) and the badge disclosure's `CopyButton`
 * (+0.2 KB). Both are the only client islands on an otherwise static page.
 *
 * Raised by 1.5 KB on `/stack-builder` for the answer-to-pick diff (a second
 * engine run per click plus the note it renders), the layer strip, the rolling
 * cost digits and the confidence meter (+1.1 KB measured). All four are
 * interactive and live in the one page that exists to be interactive; the
 * rolling digits are CSS transforms, so no animation library came with them.
 *
 * Raised by 1 KB on `/blog/[slug]` for `ReadingRail` (+0.7 KB measured): the active
 * section highlight and the progress line need scroll position, which is the one
 * thing here that cannot be CSS. The contents block itself (`EssayContents`) is a
 * server-rendered `<details>` and costs nothing, and the heading ids are stamped at
 * compile time by a rehype plugin, so the anchors need no client code either.
 *
 * `/compare/build` (a new interactive route) is budgeted at 163 KB; it measured
 * 157.7 KB, which is the shared floor plus the picker and the table.
 */
const BUDGETS = {
  "/": 161_000,
  "/stack-builder": 168_000,
  "/all": 162_500,
  "/glossary": 160_000,
  "/methodology": 158_000,
  "/verification": 158_000,
  "/submit": 158_000,
  "/blog": 158_000,
  "/compare": 158_000,
  "/compare/build": 163_000, // measured 157.7 KB; headroom left for the picker to grow
  "/fix": 158_000,
  "/roles": 158_000,
  "/bands": 158_000,
  "/[slug]": 158_500,
  "/[slug]/[tool]": 159_500,
  "/[slug]/[tool]/alternatives": 158_000,
  "/roles/[role]": 158_000,
  "/bands/[band]": 158_000,
  "/stack/[workload]": 158_500,
  "/blog/[slug]": 159_000,
  "/compare/[slug]": 158_000,
  "/fix/[slug]": 158_000,
  "/glossary/[slug]": 158_000,
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