/**
 * Build entry point that works for both `next build` and the OpenNext bundle.
 *
 * ## Why this exists
 *
 * Cloudflare's build pipeline runs `npm run build`, then `npx wrangler deploy`.
 * `wrangler deploy` uploads `.open-next/worker.js`, which only the OpenNext
 * build produces. So `build` has to produce it.
 *
 * Making `build` = `opennextjs-cloudflare build` looks like the fix, but
 * OpenNext defaults its internal build command to `npm run build` — so it calls
 * itself. Two things then go wrong, and both are quiet:
 *
 *   1. **Recursion.** The inner `opennextjs-cloudflare build` re-enters this
 *      script with the marker still set, runs `next build`, and the outer copy
 *      then bundles output that another process is still writing.
 *   2. **`--skipNextBuild` is not a substitute.** Passing it avoids the
 *      recursion, but OpenNext relies on setting `NEXT_PRIVATE_STANDALONE`
 *      and `NEXT_PRIVATE_OUTPUT_TRACE_ROOT` while it runs `next build`. Skipped,
 *      there is no `.next/standalone`, and the build dies with
 *      `ENOENT ... .next/standalone/.next/server/pages-manifest.json`.
 *
 * `buildCommand` would express this directly, but it exists only on the AWS
 * config type — `defineCloudflareConfig` rejects it, and its absence is a
 * TypeScript error rather than a runtime warning.
 *
 * So the recursion is broken with an environment marker instead. OpenNext
 * spawns its child with `env: process.env`, so the marker is inherited by
 * exactly the process that needs it and by nothing else.
 */

import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

const isWindows = process.platform === "win32";
const npm = isWindows ? "npm.cmd" : "npm";

/** Set in the child OpenNext spawns; absent in the process the user invoked. */
const CHILD = "LATTICE_NEXT_BUILD_CHILD";

const run = (command, args) => {
  const result = spawnSync(command, args, { stdio: "inherit", shell: isWindows });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

// OpenNext's child. Run the Next build and stop — bundling is the outer
// process's job, and doing it here too would write .open-next twice.
if (process.env[CHILD]) {
  run(npm, ["run", "next:build"]);
  process.exit(0);
}

// Top level, i.e. the deploy build. Refuse to bundle a Worker whose every
// canonical, sitemap entry and og:url points at a placeholder domain.
// NEXT_PUBLIC_* values are inlined at build time, so an unset SITE_URL in the
// Cloudflare build environment silently ships `https://lattice.invalid` — which
// is exactly what happened on the first deploy. Env is loaded the same way
// Next loads it, so `.env.local` counts locally.
loadEnvConfig(process.cwd(), false);
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
if (
  !/^https:\/\//.test(siteUrl) ||
  /\.(example|invalid|test|localhost)\b|\bexample\.(com|org|net)\b|your-domain/i.test(siteUrl)
) {
  console.error(
    [
      "",
      `NEXT_PUBLIC_SITE_URL is ${siteUrl ? `"${siteUrl}"` : "unset"}.`,
      "",
      "Set it to the https:// origin the site is served from — in .env.local",
      "locally, or as a build variable in the Cloudflare dashboard",
      "(Workers & Pages → lattice → Settings → Build → Variables).",
      "Without it every canonical and sitemap URL points at a dead domain.",
    ].join("\n"),
  );
  process.exit(1);
}

// Clear stale output first: OpenNext reads whatever is already in
// .open-next, and a leftover worker.js from an interrupted build can otherwise
// survive a build that failed before reaching the bundler.
rmSync(".open-next", { recursive: true, force: true });

const result = spawnSync(
  "npx",
  ["opennextjs-cloudflare", "build"],
  {
    stdio: "inherit",
    shell: isWindows,
    env: { ...process.env, [CHILD]: "1" },
  },
);

if (result.status !== 0) {
  console.error(
    [
      "",
      "OpenNext build failed.",
      "",
      "If the error above is a bare `status: 1` with no diagnostic, the Next",
      "build it spawned is failing. Run `npm run next:build` on its own to see",
      "the real error — that is the step OpenNext cannot report back.",
    ].join("\n"),
  );
  process.exit(result.status ?? 1);
}

if (!existsSync(".open-next/worker.js")) {
  console.error(
    "OpenNext reported success but .open-next/worker.js is missing. " +
      "`npx wrangler deploy` will fail with 'Could not find compiled Open Next config'.",
  );
  process.exit(1);
}
