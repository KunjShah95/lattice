import { defineConfig, devices } from "@playwright/test";

/**
 * Browser tests: accessibility and interaction.
 *
 * ## Why these exist alongside 1026 unit tests
 *
 * Everything in `src/lib` is covered, and none of it touches the DOM. The
 * components carry hand-written accessibility intent — a palette that traps
 * scroll, restores focus and handles arrow keys; a drawer; a sticky filter bar —
 * and none of it is verified by anything. `tool-explorer.tsx` is `"use client"`
 * and its facet logic had to be *extracted* into `lib/facets.ts` precisely
 * because there was no way to test it in place. This suite is the other half of
 * that answer: test the component, not just the function.
 *
 * ## Why a production build, not `next dev`
 *
 * Two reasons, and the second is the important one. First, dev pays a Turbopack
 * compile on every route. Second, `next dev` renders a development-only error
 * overlay and React's development build, both of which add elements and warnings
 * that axe reports and that no reader will ever see — a suite that passes in dev
 * and fails in production is worse than no suite, because it trains you to
 * ignore it.
 *
 * The build is reused via `.next`, and the tests run against `next start`. Note
 * the caveat in `scripts/build.mjs`: `next start` and `next dev` cannot share a
 * `.next` directory, so stop the dev server first.
 */
const PORT = Number(process.env.E2E_PORT ?? 3210);
const BASE = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // The Worker smoke test is a separate, slower suite that boots workerd; these
  // are fast enough to run on every push.
  timeout: 30_000,
  expect: { timeout: 5_000 },
  // One worker: the corpus is ~113 rows and the assertions are read-only, so
  // parallelism buys little and a shared server keeps the log readable.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],

  use: {
    baseURL: BASE,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  /**
   * Two projects, because the two halves of this suite are different claims.
   *
   * `a11y` walks the route families and asserts axe finds nothing. `e2e` drives
   * the interactions. Running both under one tag would mean an accessibility
   * failure is reported against whichever test happened to visit the page, which
   * is worse than reporting it against the page.
   */
  projects: [
    {
      name: "a11y",
      grep: /@a11y/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "e2e",
      grep: /@e2e/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /**
   * Builds the site and serves it, rather than assuming a server is already up.
   *
   * `npm run next:build` is required, not `npm run build`: these run on Node and
   * the Worker bundle is a separate concern covered by `scripts/worker-smoke.mjs`.
   * Reusing an existing `.next` means a second run is seconds rather than minutes.
   */
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `${BASE}/robots.txt`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});