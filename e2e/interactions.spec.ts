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

  test("arriving from a workload page by link opens the builder on that case", async ({ page }) => {
    // The App Router updates `window.location` after the new page first renders, so
    // an initialiser that reads it can see the *previous* URL on an in-app
    // navigation. A direct load (every other test here) never exercises that.
    // `agent`, not `rag`: the builder's blank default is already `rag`, so a RAG
    // case would pass even if the URL were ignored entirely.
    await page.goto("/stack/agent");
    // By href, not by name: the header's own "Stack Builder" link also matches any
    // name pattern, and it carries no case.
    await page.locator('main a[href^="/stack-builder?"]').first().click();
    await expect(page).toHaveURL(/\/stack-builder\?.*workload=agent/);
    await expect(page.getByRole("button", { name: /AI agent/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("says nothing about changes until the reader has answered something", async ({ page }) => {
    // A diff against a case the reader never chose would be a made-up claim.
    await page.goto("/stack-builder?workload=rag&q=500000&docs=10000000");
    await expect(page.getByText("Your last answer changed")).toHaveCount(0);
  });

  test("names the pick a constraint moved, and clears when the case is replaced", async ({ page }) => {
    await page.goto("/stack-builder?workload=rag&q=500000&docs=10000000&filtering=heavy");
    await page.getByRole("button", { name: "Open source", exact: false }).first().click();
    const note = page.getByText("Your last answer changed");
    await expect(note).toBeVisible();
    // Either something moved (and is named with an arrow) or the note says so
    // plainly. Both are honest; an empty note is the failure.
    const block = note.locator("xpath=..");
    await expect(block).toContainText(/→|now |no longer fits|No pick changed/);

    await page.getByRole("button", { name: "Clear", exact: true }).first().click();
    await expect(page.getByText("Your last answer changed")).toHaveCount(0);
  });

  test("shows which layers the stack fills, with the pick behind each", async ({ page }) => {
    await page.goto("/stack-builder?workload=chatbot&q=200000");
    const strip = page.getByRole("list", { name: /Stack layers, substrate first/i });
    await expect(strip).toBeVisible();
    // Nine cells, always: an empty layer is drawn, not omitted.
    await expect(strip.getByRole("listitem")).toHaveCount(9);
    await expect(page.getByText(/layers filled\. A dashed layer/i)).toBeVisible();
  });

  test("rolling cost reads as the plain figure to assistive tech", async ({ page }) => {
    await page.goto("/stack-builder?workload=rag&q=500000&docs=10000000");
    const figures = page.getByRole("img").filter({ hasNot: page.locator("svg") });
    // The visual digit columns are aria-hidden; the wrapper carries the number.
    const labels = await page
      .locator('[role="img"][aria-label]')
      .evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
    expect(labels.some((l) => /^\d{1,3}(,\d{3})*$/.test(l)), `no numeric label in ${labels}`).toBe(true);
    expect(figures).toBeTruthy();
  });

  test("downloads the decision report as a Markdown file named for the workload", async ({ page }) => {
    await page.goto("/stack-builder?workload=rag&q=500000&docs=10000000");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download .md" }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("stack-rag.md");
  });
});

test.describe("@e2e Compare Builder", () => {
  const CROSS = "/compare/build?tools=routing-gateways/litellm,evaluation-observability/langfuse";

  test("opens empty with starting points rather than a blank box", async ({ page }) => {
    await page.goto("/compare/build");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: /Two vector stores/i })).toBeVisible();
    await expect(page.getByRole("table")).toHaveCount(0);
  });

  test("a starting point fills the table and writes the URL", async ({ page }) => {
    await page.goto("/compare/build");
    await page.getByRole("button", { name: /Two vector stores/i }).click();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page).toHaveURL(/tools=retrieval-vector-stores\/qdrant,retrieval-vector-stores\/pgvector/);
  });

  test("restores a shared link to the same table", async ({ page }) => {
    await page.goto(CROSS);
    const table = page.getByRole("table");
    await expect(table).toBeVisible();
    await expect(table.getByRole("columnheader")).toHaveCount(3); // attribute + two tools
  });

  test("says plainly that tools across layers are not substitutes", async ({ page }) => {
    await page.goto(CROSS);
    // Scoped to the result: the page intro also says it, and strict mode rightly
    // refuses a locator that matches two things.
    await expect(page.locator("section[aria-live]").getByText(/not substitutes/i)).toBeVisible();
  });

  test("declares no winner, anywhere on the page", async ({ page }) => {
    await page.goto(CROSS);
    await expect(page.getByText(/No winner is declared/i).first()).toBeVisible();
    const text = (await page.locator("main").innerText()).toLowerCase();
    for (const banned of ["best choice", "our pick", "we recommend", "winner:"]) {
      expect(text, banned).not.toContain(banned);
    }
  });

  test("adds a tool by search and caps the selection at three", async ({ page }) => {
    await page.goto("/compare/build?tools=inference-serving/vllm,inference-serving/sglang");
    const input = page.getByRole("textbox", { name: /Search tools to add/i });
    await input.fill("qdrant");
    await page.getByRole("list", { name: "Matching tools" }).getByRole("button").first().click();
    await expect(page.getByRole("table").getByRole("columnheader")).toHaveCount(4);
    // Full: the picker disables itself rather than silently ignoring a fourth.
    await expect(input).toBeDisabled();
  });

  test("removing a tool updates the table and the URL", async ({ page }) => {
    await page.goto(CROSS);
    await page.getByRole("button", { name: /Remove Langfuse/i }).click();
    await expect(page.getByRole("table").getByRole("columnheader")).toHaveCount(2);
    await expect(page).not.toHaveURL(/langfuse/);
  });

  test("marks differing rows in words, not only by position", async ({ page }) => {
    await page.goto(CROSS);
    // Two tools in different layers differ on the Layer row at minimum.
    await expect(page.getByRole("rowheader", { name: /Layer.*differs/i })).toBeVisible();
  });

  test("a hand-edited link degrades to what still resolves", async ({ page }) => {
    const res = await page.goto("/compare/build?tools=nope/nothing,inference-serving/vllm,also/gone");
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("table").getByRole("columnheader")).toHaveCount(2);
  });

  test("copies the comparison as Markdown with no verdict", async ({ page }) => {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(CROSS);
    await page.getByRole("button", { name: /Copy as Markdown/i }).click();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toMatch(/^# LiteLLM vs Langfuse/);
    expect(clip).toContain("| --- |");
    expect(clip).toMatch(/No winner is declared/);
  });

  test("a tool page links in with that tool already chosen", async ({ page }) => {
    await page.goto("/inference-serving/vllm");
    await page.getByRole("link", { name: "Compare with another tool" }).click();
    await expect(page).toHaveURL(/\/compare\/build\?tools=inference-serving\/vllm/);
    await expect(page.getByRole("table")).toBeVisible();
  });
});

test.describe("@e2e essay contents and reading rail", () => {
  const ESSAY = "/blog/choosing-a-model";

  /** Every essay slug, read from the sitemap so a new essay is covered without an edit here. */
  async function essaySlugs(page: Page) {
    const xml = await (await page.request.get("/sitemap.xml")).text();
    return [...xml.matchAll(/\/blog\/([a-z0-9-]+)</g)].map((m) => m[1]);
  }

  test("every contents link in every essay lands on a real heading", async ({ page }) => {
    // The contents list and the heading ids are produced by two different code paths
    // (a string parse, and a compile-time rehype plugin) that share one slug
    // function. Sharing the function does not prove they agree on which headings
    // exist, and a link to nowhere looks fine in review. This follows every link.
    const slugs = await essaySlugs(page);
    expect(slugs.length).toBeGreaterThan(5);

    const broken: string[] = [];
    for (const slug of slugs) {
      await page.goto(`/blog/${slug}`);
      const hrefs = await page
        .locator('article details nav a[href^="#"], aside nav a[href^="#"]')
        .evaluateAll((els) => [...new Set(els.map((e) => (e as HTMLAnchorElement).getAttribute("href")!))]);
      for (const href of hrefs) {
        const hit = await page.evaluate((id) => document.getElementById(id) !== null, href.slice(1));
        if (!hit) broken.push(`${slug}${href}`);
      }
    }
    expect(broken).toEqual([]);
  });

  test("headings carry ids in the prerendered HTML, with JavaScript off", async ({ browser }) => {
    // The ids are stamped at compile time, so a shared `#section` link works for a
    // crawler and for a reader whose script is blocked.
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(ESSAY);
    await expect(page.locator("#where-to-start")).toHaveCount(1);
    await expect(page.locator(".prose-lattice h2[id]").first()).toBeAttached();
    await ctx.close();
  });

  test("shows the side rail on a wide screen and the disclosure on a narrow one, never both", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(ESSAY);
    await expect(page.getByRole("navigation", { name: "On this page" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "In this essay" })).toBeHidden();

    await page.setViewportSize({ width: 390, height: 800 });
    await expect(page.getByRole("navigation", { name: "On this page" })).toBeHidden();
    // Closed disclosure: the summary is what is visible.
    await expect(page.getByText(/In this essay · \d+ sections/)).toBeVisible();
  });

  test("the narrow disclosure opens to the same list of sections", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto(ESSAY);
    await page.getByText(/In this essay · \d+ sections/).click();
    const links = page.getByRole("navigation", { name: "In this essay" }).getByRole("link");
    await expect(links.first()).toBeVisible();
    expect(await links.count()).toBeGreaterThanOrEqual(3);
  });

  test("highlights the section you are reading, and the progress line fills as you scroll", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(ESSAY);
    const rail = page.getByRole("navigation", { name: "On this page" });
    // Before the first heading nothing is current: the intro is not a section.
    await expect(rail.locator('[aria-current="location"]')).toHaveCount(0);

    const target = rail.getByRole("link").nth(2);
    const id = (await target.getAttribute("href"))!.slice(1);
    // Instant, not smooth: `html` has `scroll-behavior: smooth`, and asserting while
    // an animation is mid-flight tests the animation rather than the rail.
    await page.evaluate((i) => document.getElementById(i)!.scrollIntoView({ behavior: "instant" }), id);
    await expect(rail.locator('[aria-current="location"]')).toHaveCount(1);
    await expect(target).toHaveAttribute("aria-current", "location");

    const fill = rail.locator("span.origin-top");
    const scale = await fill.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).d);
    expect(scale, "progress should have advanced past zero").toBeGreaterThan(0);
  });

  test("a contents link scrolls the heading below the sticky header, not under it", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(ESSAY);
    const link = page.getByRole("navigation", { name: "On this page" }).getByRole("link").nth(3);
    const id = (await link.getAttribute("href"))!.slice(1);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    // Polled, because the jump is smooth. 56px is the 3.5rem header; `html`'s
    // `scroll-padding-top` puts it at 96px, which is what keeps it clear.
    await expect
      .poll(async () => page.evaluate((i) => Math.round(document.getElementById(i)!.getBoundingClientRect().top), id))
      .toBeGreaterThanOrEqual(56);
    // And clicking a section must light *that* section, not the one before it.
    await expect(link).toHaveAttribute("aria-current", "location");
  });

  test("the rail does not narrow the essay", async ({ page }) => {
    // It hangs off the article rather than reflowing it. The line length is what
    // makes an essay readable, and a rail that cost some of it would not be worth it.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(ESSAY);
    const width = await page.locator("article").evaluate((el) => el.getBoundingClientRect().width);
    expect(width).toBeGreaterThan(660);
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
test.describe("@e2e tool hover preview", () => {
  // vLLM has siblings, so its page renders `PreviewToolChip`s.
  const PAGE = "/inference-serving/vllm";

  /** The first sibling chip: the link inside the "Also in" list. */
  function firstChip(page: Page) {
    return page
      .locator("section", { has: page.getByRole("heading", { name: /^Also in/i }) })
      .getByRole("link")
      .first();
  }

  test("is hidden at rest, and described by the link for assistive tech", async ({ page }) => {
    await page.goto(PAGE);
    const link = firstChip(page);
    const describedBy = await link.getAttribute("aria-describedby");
    expect(describedBy, "the chip must point at its card").toBeTruthy();

    const card = page.locator(`[id="${describedBy}"]`);
    await expect(card).toHaveAttribute("role", "tooltip");
    // Hidden from sight but still in the DOM: that is what makes it a description.
    await expect(card).toBeHidden();
    await expect(card).toContainText(/use when/i);
    await expect(card).toContainText(/skip when/i);
  });

  test("opens on hover and carries the use/skip pair", async ({ page }) => {
    await page.goto(PAGE);
    const link = firstChip(page);
    const card = page.locator(`[id="${await link.getAttribute("aria-describedby")}"]`);

    await link.hover();
    await expect(card).toBeVisible();
    await expect(card).toContainText(/skip when/i);
  });

  test("stays open while the pointer moves from the link onto the card", async ({ page }) => {
    // WCAG 1.4.13 "hoverable": a card that closes on the way to it cannot be read.
    await page.goto(PAGE);
    const link = firstChip(page);
    const card = page.locator(`[id="${await link.getAttribute("aria-describedby")}"]`);

    await link.hover();
    await expect(card).toBeVisible();
    const box = (await card.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
    await page.waitForTimeout(400); // longer than the close delay
    await expect(card).toBeVisible();
  });

  test("Escape dismisses it without moving focus", async ({ page }) => {
    // WCAG 1.4.13 "dismissible".
    await page.goto(PAGE);
    const link = firstChip(page);
    const card = page.locator(`[id="${await link.getAttribute("aria-describedby")}"]`);

    await page.keyboard.press("Tab"); // enter the page
    await link.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab"); // back onto the chip by keyboard => :focus-visible
    await expect(link).toBeFocused();
    await expect(card).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(card).toBeHidden();
    await expect(link).toBeFocused();
  });

  test("never overflows the viewport, even from the right edge", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto(PAGE);
    const chips = page
      .locator("section", { has: page.getByRole("heading", { name: /^Also in/i }) })
      .getByRole("link");
    const n = await chips.count();
    for (let i = 0; i < n; i += 1) {
      const link = chips.nth(i);
      const card = page.locator(`[id="${await link.getAttribute("aria-describedby")}"]`);
      await link.scrollIntoViewIfNeeded();
      await link.hover();
      await expect(card).toBeVisible();
      const box = (await card.boundingBox())!;
      expect(box.x, `chip ${i} left edge`).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, `chip ${i} right edge`).toBeLessThanOrEqual(390);
      await page.mouse.move(0, 0);
    }
  });
});

test.describe("@e2e verified badge", () => {
  test("serves a self-contained SVG for an entry", async ({ page }) => {
    const res = await page.request.get("/inference-serving/vllm/badge.svg");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/svg+xml");
    expect(res.headers()["set-cookie"], "a badge must not set a cookie").toBeUndefined();
    expect(await res.text()).toMatch(/verified \d{4}-\d{2}/);
  });

  test("an unknown entry is a 404, not a blank badge", async ({ page }) => {
    const res = await page.request.get("/inference-serving/nonsense/badge.svg");
    expect(res.status()).toBe(404);
  });

  test("the tool page offers the Markdown, and it points at the canonical page", async ({ page }) => {
    await page.goto("/inference-serving/vllm");
    await page.getByText("Badge this entry").click();
    const code = page.locator("details code");
    await expect(code).toContainText("/inference-serving/vllm/badge.svg");
    expect(await code.textContent()).not.toContain("?");
  });
});

