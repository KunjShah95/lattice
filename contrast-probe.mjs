import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Measure the site's worst `color-contrast` ratio across every route family and
 * both themes, so `e2e/a11y-exceptions.ts` records a floor derived from a
 * measurement rather than from the first page that happened to fail.
 *
 * Run: node contrast-probe.mjs            (expects a server on $BASE)
 */
const base = process.env.BASE ?? "http://127.0.0.1:3210";

const ROUTES = [
  "/", "/all", "/roles", "/roles/serving", "/bands", "/bands/compute",
  "/fix", "/fix/llm-app-too-slow", "/compare", "/compare/vector-databases",
  "/blog", "/blog/evals-are-the-asset", "/glossary", "/glossary/paged-attention",
  "/inference-serving", "/inference-serving/vllm",
  "/inference-serving/vllm/alternatives", "/stack-builder", "/methodology",
  "/submit",
];

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

let worst = { ratio: Infinity, where: "" };
const byToken = new Map();

for (const path of ROUTES) {
  await page.goto(base + path);
  for (const scheme of ["light", "dark"]) {
    await page.evaluate((s) => {
      document.documentElement.classList.toggle("dark", s === "dark");
    }, scheme);
    // Long enough for a full repaint. axe reads *computed* colours, and a class
    // flip that has not been painted yet can produce a phantom reading — which
    // showed up first here as a 1.19:1 link that does not exist in either theme.
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.waitForTimeout(120);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    for (const v of results.violations) {
      for (const n of v.nodes) {
        const m = n.failureSummary?.match(/contrast of ([\d.]+)/);
        if (!m) continue;
        const ratio = Number(m[1]);
        // Group by the utility class that sets the colour, so the report names a
        // token rather than 500 individual nodes.
        const token =
          (n.html.match(/text-(fg-subtle|fg-muted|fg)\b/) ?? [])[1] ?? "unknown";
        byToken.set(token, Math.min(byToken.get(token) ?? Infinity, ratio));
        if (ratio < worst.ratio) {
          worst = { ratio, where: `${path} (${scheme}) ${token} :: ${n.html.slice(0, 90)}` };
        }
      }
    }
  }
}

console.log(`\nworst across the site: ${worst.ratio.toFixed(2)}:1`);
console.log(`  ${worst.where}`);
console.log("\nper token:");
for (const [token, ratio] of [...byToken].sort((a, b) => a[1] - b[1])) {
  console.log(`  ${token.padEnd(12)} ${ratio.toFixed(2)}:1`);
}

await browser.close();