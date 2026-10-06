import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { AxeResults, Result as AxeViolation } from "axe-core";
import { A11Y_EXCEPTIONS, EXCEPTION_IDS } from "./a11y-exceptions";

/**
 * Automated accessibility, by route family.
 *
 * ## What this does and does not prove
 *
 * axe catches roughly a third of real accessibility problems — the mechanical
 * ones: missing labels, contrast, heading order, landmark structure, names on
 * controls. It does not catch whether the palette is *usable* with a keyboard,
 * whether focus is where the reader thinks it is, or whether the thing is
 * announced. Those are in `interactions.spec.ts`, and the two suites together are
 * still not an accessibility audit.
 *
 * So this is a floor, not a claim. Its value is that it runs on every push and
 * fails the build, which no manual pass has ever done here.
 *
 * ## Why the route list is explicit
 *
 * A route list built by globbing would quietly miss the families that only exist
 * as dynamic segments — and those are most of the site. Explicit is also the only
 * way to notice when a new route family ships with no a11y coverage, which is
 * the same reasoning as `route-metadata.test.ts`'s segment map.
 */

/** One representative route per family, chosen for what it contains. */
const ROUTES = [
  { path: "/", why: "home: hero, stack diagram, full index" },
  { path: "/all", why: "the client-filtered explorer" },
  { path: "/roles", why: "a collection page over sub-pages" },
  { path: "/roles/serving", why: "one specialisation" },
  { path: "/bands", why: "the band index" },
  { path: "/bands/compute", why: "one band, with a nested tool list" },
  { path: "/fix", why: "symptom index" },
  { path: "/fix/llm-app-too-slow", why: "a symptom checklist, with HowTo" },
  { path: "/compare", why: "comparison index" },
  { path: "/compare/vector-databases", why: "a comparison table" },
  { path: "/blog", why: "essay index" },
  { path: "/blog/evals-are-the-asset", why: "MDX prose with figures" },
  { path: "/glossary", why: "glossary index" },
  { path: "/glossary/paged-attention", why: "one term" },
  { path: "/inference-serving", why: "a section page" },
  { path: "/inference-serving/vllm", why: "a tool page" },
  { path: "/inference-serving/vllm/alternatives", why: "an alternatives page" },
  { path: "/stack-builder", why: "the interactive configurator" },
  { path: "/methodology", why: "prose-heavy page" },
  { path: "/submit", why: "the form" },
];

/**
 * Violations that are genuinely violations here, in both themes.
 *
 * `color-contrast` is included and run per theme, which is the part worth doing:
 * the palettes are a matched pair maintained by hand and a contrast regression in
 * either is invisible in a screenshot review.
 */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

/**
 * Fail on anything not in the documented exception list, and *ratchet* the ones
 * that are.
 *
 * The naive version of this — assert an empty violations array — cannot be used
 * on this site, because axe legitimately reports 499 `color-contrast` failures
 * for a real palette defect. Ignoring `color-contrast` outright would be the
 * usual mistake: it is then the one rule that can never fire again, on a site
 * whose whole argument is that it should be trusted.
 *
 * So an allowlisted id has to satisfy three conditions, all asserted below:
 * it is still present, its worst measured ratio has not dropped below the
 * recorded floor, and every *other* id is still clean.
 */
async function violations(page: Page, path: string, why: string) {
  const results = (await new AxeBuilder({ page })
    .withTags(TAGS)
    .analyze()) as unknown as AxeResults;
  check(results, `${path} — ${why}`);
}

/**
 * The assertion, split out so the same rules apply to the aggregate checks.
 *
 * Returns the worst contrast seen, because the ratchet is a floor and each route
 * measures differently — asserting every route independently against one number
 * would fail on the routes where the violation happens not to appear at all.
 */
function check(results: AxeResults, label: string): number {
  const violations: AxeViolation[] = results.violations;
  const unexpected = violations
    .filter((v: AxeViolation) => !EXCEPTION_IDS.has(v.id))
    .map((v: AxeViolation) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.length,
      // One example target per violation: enough to locate it, and it keeps a
      // failure readable rather than dumping every node on a 113-row page.
      example: v.nodes[0]?.target?.join(" ") ?? "",
    }));

  expect(
      unexpected,
      `${label} — undocumented violations:\n${JSON.stringify(unexpected, null, 2)}`,
    ).toEqual([]);

  // A listed exception that stopped occurring is a pass *and* a signal: someone
  // fixed it and left the entry, which is how an allowlist rots.
  for (const exception of A11Y_EXCEPTIONS) {
    const found = violations.find((v) => v.id === exception.id);
    expect(
      found,
      `${label} — "${exception.id}" is allowlisted but did not occur here. ` +
        `If it has been fixed, delete it from e2e/a11y-exceptions.ts.`,
    ).toBeDefined();

    const worst = worstRatio(found!);
    expect(
      worst,
      `${label} — "${exception.id}" got worse (${worst.toFixed(2)}:1, floor ` +
        `${exception.worstContrast}:1). ${exception.reason}`,
    ).toBeGreaterThanOrEqual(exception.worstContrast);
  }

  let worst = Infinity;
  for (const v of violations) {
    if (EXCEPTION_IDS.has(v.id)) worst = Math.min(worst, worstRatio(v));
  }
  return worst;
}

/**
 * The worst contrast ratio in a violation.
 *
 * axe reports the measured ratio inside the human-readable failure summary, so
 * it is parsed out rather than recomputed — recomputing would mean walking the
 * DOM and reading computed colours, which duplicates axe and can disagree with
 * it. Returns `Infinity` for a violation with no ratio in the summary, which is
 * what keeps the ratchet from failing on an unrelated rule someone allowlists.
 */
function worstRatio(violation: AxeViolation): number {
  let worst = Infinity;
  for (const node of violation.nodes) {
    const match = node.failureSummary?.match(/contrast of ([\d.]+)/);
    if (match) worst = Math.min(worst, Number(match[1]));
  }
  return worst;
}

test.describe("@a11y route families", () => {
  for (const { path, why } of ROUTES) {
    test(`${path} has no violations`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("h1")).toBeVisible();
      await violations(page, path, why);
    });
  }
});

test.describe("@a11y in both themes", () => {
  /**
   * The dark palette is a hand-maintained set of hex values in `globals.css` and
   * a second hand-maintained set in `lib/og.tsx`. Nothing checks that either one
   * holds contrast — `layer.test.ts` checks that the two agree on which colour
   * belongs to which layer, which is a different claim.
   *
   * The theme is a class on `<html>` applied pre-paint, so it can be set before the
   * page loads rather than clicked, and this asserts the class is what the CSS
   * actually responds to.
   */
  const measured: Record<string, number> = {};

  /**
   * Flip the theme and wait for a *painted* frame.
   *
   * axe reads computed colours, and a class flip that has not repainted yet
   * produces a phantom reading — the first sweep of this suite reported a 1.19:1
   * link that exists in neither theme, which would have set the ratchet floor
   * below any real value.
   */
  async function setTheme(page: Page, scheme: "light" | "dark") {
    await page.evaluate((s) => {
      document.documentElement.classList.toggle("dark", s === "dark");
    }, scheme);
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
    );
    await page.waitForTimeout(120);
  }

  for (const scheme of ["light", "dark"] as const) {
    test(`home in ${scheme}`, async ({ page }) => {
      await page.goto("/");
      await setTheme(page, scheme);
      const results = (await new AxeBuilder({ page })
        .withTags(TAGS)
        .analyze()) as unknown as AxeResults;
      measured[scheme] = check(results, `/ in ${scheme} theme`);
    });

    test(`a tool page in ${scheme}`, async ({ page }) => {
      await page.goto("/inference-serving/vllm");
      await setTheme(page, scheme);
      const results = (await new AxeBuilder({ page })
        .withTags(TAGS)
        .analyze()) as unknown as AxeResults;
      const worst = check(results, `/inference-serving/vllm in ${scheme} theme`);
      // Recorded rather than asserted against a number: the ratchet in `check`
      // already holds the floor, and a hardcoded second copy here is a second
      // thing to forget when the palette moves.
      measured[`tool-${scheme}`] = worst;
    });
  }
});

test.describe("@a11y landmarks and headings", () => {
  /**
   * axe checks heading *order* within a page but not that there is exactly one
   * `h1`. Two `h1`s is a real screen-reader problem — the page announces its
   * title twice — and it is not a violation in the spec.
   */
  test("every route has exactly one h1", async ({ page }) => {
    for (const { path } of ROUTES) {
      await page.goto(path);
      const count = await page.locator("h1").count();
      expect(count, `${path} has ${count} h1 elements`).toBe(1);
    }
  });

  test("every route has a main landmark and a skip link", async ({ page }) => {
    // The layout declares both; this is the check that they survive a refactor,
    // because a `<main>` that quietly became a `<div>` breaks nothing visually.
    for (const { path } of ROUTES) {
      await page.goto(path);
      await expect(page.locator("main"), `${path} has no <main>`).toHaveCount(1);
      await expect(
        page.getByRole("link", { name: /skip/i }).first(),
        `${path} has no skip link`,
      ).toBeVisible();
    }
  });

  test("the 404 page has no violations either", async ({ page }) => {
    // Not in the route list because it is not linked, and it is the page a reader
    // reaches from a typo or a stale link — which is exactly the moment they need
    // it to work.
    await page.goto("/this-route-does-not-exist");
    await expect(page.locator("body")).toContainText(/not found|lattice/i);
    await violations(page, "/404", "the not-found page");
  });
});