import { essayBodies } from "@/content/essay-text.generated";
import { createSlugger } from "./heading-slug.mjs";

/**
 * The headings of an essay, for its table of contents.
 *
 * Read from the generated plain text (`essay-text.generated.ts`), which already
 * carries every essay's Markdown, rather than from the compiled MDX: the page needs
 * the list on the server to render a contents block with no JavaScript, and parsing
 * a string is a lot less machinery than evaluating a module to find its headings.
 *
 * The id for each comes from `heading-slug.mjs`, the same function the rehype plugin
 * uses to stamp the heading itself, walking headings in the same order. That is the
 * whole contract: a contents link and its target are spelled by one implementation.
 * Whether the two lists contain the *same headings* is not guaranteed by the type
 * system, so `e2e/interactions.spec.ts` follows every contents link in a real browser.
 *
 * `h2` only. Essays use `###` sparingly, and a contents list that nests is a list
 * nobody scans; the plugin still ids the `h3`s, so they stay linkable.
 */

export type Heading = { id: string; text: string };

/** Markdown inline syntax that is gone by the time the heading is rendered. */
function plain(md: string): string {
  return md
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // [text](url) -> text
    .replace(/[`*_]/g, "") // code ticks and emphasis markers
    .replace(/\s+#+\s*$/, "") // closing hashes: "## Title ##"
    .trim();
}

/**
 * Headings from a Markdown string, in document order.
 *
 * Fenced code is skipped: a `## comment` inside a shell snippet is not a heading,
 * and an essay that shows one must not grow a phantom contents entry.
 *
 * Both `##` and `###` are walked through the slugger even though only `##` is
 * returned, because the plugin ids both and a duplicate `###` must still bump the
 * suffix of a later `##` with the same name, or the two lists would drift.
 */
export function headingsOf(markdown: string): Heading[] {
  const slug = createSlugger();
  const out: Heading[] = [];
  let fenced = false;

  for (const line of markdown.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;

    const m = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    const text = plain(m[2]);
    const id = slug(text);
    if (m[1] === "##") out.push({ id, text });
  }
  return out;
}

/** The contents list for one essay, or an empty list for an unknown slug. */
export function essayHeadings(slug: string): Heading[] {
  const body = essayBodies[slug];
  return body ? headingsOf(body) : [];
}
