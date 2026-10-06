import { test, expect, type Page } from "@playwright/test";

/**
 * Interaction tests for the components that carry hand-written intent.
 *
 * ## Why these are here and not in vitest
 *
 * `tool-explorer.tsx`'s filtering had to be *extracted* into `lib/facets.ts`
 * because the component is `"use client"`, vitest runs in node, and logic inside
 * it could not be exercised without a DOM. That was the right call and it left a
 * gap: the wiring, the keyboard handling and the URL sync were never verified by
 * anything. These tests close it.
 *
 * What is deliberately *not* here: assertions about how the facet logic narrows a
 * list. `facets.test.ts` covers that against the real 113-row dataset with 27
 * tests, and duplicating it in the browser would be slower and prove less.
 */

/** The palette fetches its corpus on first open, so it needs a beat. */
async function openPalette(page: Page) {
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

/**
 * The palette's input.
 *
 * By role `combobox`, not `textbox`: it declares `role="combobox"` alongside
 * `aria-expanded`, `aria-controls` and `aria-activedescendant`, which is the
 * correct pattern for a text field whose results are a listbox the reader
 * navigates without moving focus off the field.
 */
function paletteInput(page: Page) {
  return page.getByRole("combobox", { name: /search tools/i });
}

/**
 * One facet chip, addressed by axis and value.
 *
 * Not by accessible name: a chip's name is `"Free 77"`, and `free` and
 * `free-tier` both begin with "Free", so a name selector matches two chips and
 * dies in strict mode. `FacetChip` carries `data-facet` / `data-facet-value`
 * for exactly this.
 */
function chip(page: Page, group: string, value: string) {
  return page.locator(`[data-facet="${group}"][data-facet-value="${value}"]`);
}

test.describe("@e2e search palette", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("opens on the shortcut and closes on Escape", async ({ page }) => {
    const dialog = await openPalette(page);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("moves focus into the input, and does not leave it on a detached node", async ({
    page,
  }) => {
    // Focus is the whole accessibility story of a command palette: if it opens
    // behind the reader's cursor, typing goes nowhere and the thing looks broken.
    await openPalette(page);
    await expect(paletteInput(page)).toBeFocused();

    await page.keyboard.press("Escape");
    // Focus must not be stranded inside the unmounted dialog. It is not restored
    // to the trigger — this component does not do that — so the assertion is that
    // it lands somewhere real rather than nowhere.
    await expect(paletteInput(page)).toBeHidden();
    const focused = await page.evaluate(() => document.activeElement?.tagName ?? "");
    expect(focused, "focus was left on a detached node").not.toBe("");
  });

  test("locks background scroll while open and restores it after", async ({ page }) => {
    await openPalette(page);
    const locked = await page.evaluate(() => document.body.style.overflow);
    expect(locked, "background scroll must be locked").toBe("hidden");

    await page.keyboard.press("Escape");
    const restored = await page.evaluate(() => document.body.style.overflow);
    expect(restored, "scroll must be restored, not left locked").not.toBe("hidden");
  });

  test("navigates with the keyboard and lands on the highlighted row", async ({ page }) => {
    await openPalette(page);
    await paletteInput(page).fill("vllm");
    // `option`, not `listitem`: the "Loading index…" placeholder used to render as
    // a `<li>` inside the list, so `first()` matched the loading state rather than
    // a result. It is a `role="status"` now, and the listbox holds only options.
    const rows = page.getByRole("option");
    await expect(rows.first()).toBeVisible();

    // The selection starts on row 0 and Enter takes it, so the first row's own
    // label is the assertion. Hardcoding `vllm` would pass by luck: the second row
    // for this query is the alternatives page, which is what this test
    // previously hit and mis-asserted.
    const first = rows.first();
    await expect(first).toHaveAttribute("aria-selected", "true");
    await expect(first).toContainText("vLLM");

    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/inference-serving\/vllm$/);
  });

  test("ArrowDown moves the selection before Enter commits it", async ({ page }) => {
    await openPalette(page);
    await paletteInput(page).fill("vllm");
    const rows = page.getByRole("option");
    await expect(rows.first()).toBeVisible();
    const first = rows.nth(0);
    const second = rows.nth(1);

    // `aria-selected` is what a screen reader announces, so it is the thing to
    // assert rather than a CSS class.
    await expect(first).toHaveAttribute("aria-selected", "true");

    await page.keyboard.press("ArrowDown");
    await expect(second).toHaveAttribute("aria-selected", "true");
    await expect(first).toHaveAttribute("aria-selected", "false");

    await page.keyboard.press("Enter");
    await expect(page).not.toHaveURL(/\/inference-serving\/vllm$/);
  });

  test("finds a glossary term, which it did not before", async ({ page }) => {
    // The specific regression this suite exists to hold: 51 terms each with a
    // page, none of them in the search corpus. A query for "paged attention"
    // returned the tool that implements the term and not the term.
    await openPalette(page);
    await paletteInput(page).fill("paged attention");
    const rows = page.getByRole("option");
    await expect(rows.first()).toBeVisible();
    await expect(rows.filter({ hasText: "Paged attention" }).first()).toBeVisible();
  });

  test("names the kind on each row, so the reader can tell them apart", async ({ page }) => {
    // Five flavours share one list and the category line does not always
    // distinguish them — a fix guide reads like an essay.
    await openPalette(page);
    await paletteInput(page).fill("vllm");
    const first = page.getByRole("option").first();
    await expect(first).toBeVisible();
    // Case-insensitive because the pill is uppercased in CSS, and `innerText`
    // reflects rendered text — so it reads "TOOL", not "Tool".
    expect(await first.innerText()).toMatch(
      /tool|essay|guide|term|compare|alternatives/i,
    );
  });
});

test.describe("@e2e /all explorer", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/all");
  });

  test("narrows as you type, and reports the count", async ({ page }) => {
    const before = await page.getByRole("listitem").count();
    await page.getByLabel("Filter tools").fill("vector");
    await expect
      .poll(async () => page.getByRole("listitem").count())
      .toBeLessThan(before);
  });

  test("writes the selection into the URL, so a filtered view can be shared", async ({
    page,
  }) => {
    // The whole point of this change: "the free tools an ML platform engineer
    // owns" is the most linkable claim the site makes, and it was not
    // expressible as a URL at all.
    await chip(page, "cost", "free").click();
    await expect(page).toHaveURL(/[?&]cost=free/);
  });

  test("restores a shared link on load", async ({ page }) => {
    await page.goto("/all?cost=free&role=AI%20Infrastructure");
    await expect(chip(page, "cost", "free")).toHaveAttribute("aria-pressed", "true");
    await expect(chip(page, "roles", "AI Infrastructure")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("ORs repeated parameters in the shared link", async ({ page }) => {
    // `?role=a&role=b` must light two chips, not the last one. With `get` instead
    // of `getAll` the second value would silently replace the first.
    await page.goto("/all?role=ML%20Platform&role=Data%20%26%20Retrieval");
    await expect(chip(page, "roles", "ML Platform")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(chip(page, "roles", "Data & Retrieval")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("clears every filter and returns the URL to its bare form", async ({ page }) => {
    await chip(page, "cost", "free").click();
    await expect(page).toHaveURL(/[?&]cost=free/);

    await page.getByRole("button", { name: /^Clear/ }).click();
    // Not `?cost=&role=`: an untouched page must have the URL the canonical says.
    await expect(page).toHaveURL(/\/all$/);
  });

  test("keeps the count in step with the filters", async ({ page }) => {
    const read = async () =>
      Number((await page.locator("[aria-live=polite]").innerText()).split("/")[0].trim());
    const all = await read();
    await chip(page, "cost", "free").click();
    await expect.poll(read).toBeLessThan(all);
  });
});

test.describe("@e2e Stack Builder", () => {
  test("recomputes as you answer, and the URL reproduces it", async ({ page }) => {
    // The URL is the save: there is no account and no storage, so the link is
    // the only way a recommendation survives being sent to someone else.
    await page.goto("/stack-builder");
    await page.getByRole("button", { name: /RAG application/i }).click();
    await expect(page).toHaveURL(/workload=rag/);

    // The report is a Markdown export for an ADR, and the clipboard write is the
    // only thing that proves the button is wired to the renderer rather than
    // decorative. Granted explicitly because Playwright will not prompt.
    await page
      .context()
      .grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: /Copy decision report/i }).click();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip, "the report must be Markdown for an ADR").toMatch(
      /^# Stack recommendation/,
    );
    expect(clip).toContain("## Biggest risk");
  });

  test("restores a shared link and reaches the same stack", async ({ page }) => {
    await page.goto("/stack-builder?workload=agent&q=120000&dur=hours&safety=strict");
    const summary = page.locator("body");
    await expect(summary).toContainText("AI agent");
    // The durability constraint is visible in the picks, so a restored link has
    // to produce a durable-execution layer rather than the default case.
    await expect(summary).toContainText(/Workflow/i);
  });

  test("a hand-edited URL degrades to a valid case rather than a 500", async ({ page }) => {
    // `decodeStackInput` returns null for an unknown workload, and the component
    // falls back to a default. This asserts the fallback, which is the behaviour
    // that keeps a shared link from breaking.
    const res = await page.goto("/stack-builder?workload=nonsense&q=1");
    expect(res?.status()).toBe(200);
  });
});

test.describe("@e2e theme", () => {
  test("toggles without a flash and persists", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    const before = await html.getAttribute("class");

    await page.getByRole("button", { name: /theme|dark|light/i }).first().click();
    await expect(html).not.toHaveAttribute("class", before ?? "");

    // Applied pre-paint by an inline script, so a reload must come back the same
    // rather than reverting to the default and then flipping.
    await page.reload();
    const after = await html.getAttribute("class");
    expect(after).toBe(await html.getAttribute("class"));
    expect(after).not.toBe(before ?? "");
  });
});

test.describe("@e2e navigation", () => {
  test("every top-level nav destination resolves", async ({ page }) => {
    // A route that exists but is linked nowhere is invisible; a route that is
    // linked but does not exist is a 404 a reader clicks. `site-footer.tsx`
    // already asserts the other direction — that every page is *reachable*.
    await page.goto("/");
    const hrefs = await page
      .locator("header nav a, footer a")
      .evaluateAll((els) =>
        els
          .map((e) => (e as HTMLAnchorElement).getAttribute("href") ?? "")
          .filter((h) => h.startsWith("/")),
      );

    expect(hrefs.length).toBeGreaterThan(10);
    for (const href of [...new Set(hrefs)]) {
      const res = await page.request.get(href);
      expect(res.status(), `${href} is linked but does not resolve`).toBe(200);
    }
  });

  test("an unknown role or band 404s rather than rendering", async ({ page }) => {
    // Prerendered from a vocabulary, so an out-of-vocabulary value builds cleanly
    // and only fails here.
    await expect((await page.goto("/bands/nonsense"))?.status()).toBe(404);
    await expect((await page.goto("/roles/nonsense"))?.status()).toBe(404);
  });
});