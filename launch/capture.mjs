/**
 * Captures the footage for the launch video: real pages of the redesigned
 * site at 2x, from a running production server.
 *
 *   npm run build && npx next start -p 3999
 *   node launch/capture.mjs            # writes launch/assets/*.png
 */
import { chromium } from "@playwright/test";

const BASE = process.env.LAUNCH_BASE ?? "http://127.0.0.1:3999";
const OUT = new URL("./assets/", import.meta.url).pathname;
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);

async function page(theme = "light") {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: theme,
    reducedMotion: "reduce", // entrances finished, so every capture is a final frame
  });
  return ctx.newPage();
}

async function shot(p, name, { clip, fullPage } = {}) {
  // The Product Hunt badge is a third-party image; where it cannot load (an
  // offline capture box) it renders as broken alt text, so keep it out of frame.
  await p.addStyleTag({ content: '[aria-label="Featured on Product Hunt"]{visibility:hidden}' });
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}${name}.png`, clip, fullPage });
  console.log("captured", name);
}

// 1. Landing hero, light and dark.
for (const theme of ["light", "dark"]) {
  const p = await page(theme);
  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await shot(p, `home-hero-${theme}`);
}

// 2. The directory: a tall strip to pan across.
{
  const p = await page();
  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const box = await p.locator("#all").boundingBox();
  await shot(p, "directory", { fullPage: true, clip: { x: 0, y: box.y, width: 1440, height: 2600 } });
}

// 3. Stack Builder: the form with its submit bar, then the built stack.
{
  const p = await page();
  await p.goto(`${BASE}/stack-builder`, { waitUntil: "networkidle" });
  await p.getByRole("button", { name: /RAG application/i }).click();
  const bar = await p.getByRole("button", { name: "Build my stack" }).boundingBox();
  await p.mouse.wheel(0, Math.max(0, bar.y - 640));
  await shot(p, "builder-form");
  await p.getByRole("button", { name: "Build my stack" }).click();
  await p.waitForTimeout(600);
  await shot(p, "builder-result");
}

// 4. A tool page, light and dark, for the use/skip close-up and the wipe.
for (const theme of ["light", "dark"]) {
  const p = await page(theme);
  await p.goto(`${BASE}/retrieval-vector-stores/pgvector`, { waitUntil: "networkidle" });
  await shot(p, `tool-${theme}`);
}

// 5. The offer: pricing tiers.
{
  const p = await page();
  await p.goto(`${BASE}/review`, { waitUntil: "networkidle" });
  await p.locator("#pricing").evaluate((el) => el.scrollIntoView({ block: "start" }));
  await p.mouse.wheel(0, 40);
  await shot(p, "pricing");
}

await browser.close();
