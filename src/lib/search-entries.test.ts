import { describe, expect, it } from "vitest";
import { buildSearchEntries } from "./search-entries";
import { buildIndex, searchTools } from "./search";

/**
 * The search corpus is no longer inlined into every page's RSC payload. It is
 * built here, served from /search-index.json, and fetched by the palette the
 * first time it opens.
 *
 * That moved the data across a serialisation boundary it used to sit inside,
 * so these tests guard the two things that boundary can break: that the
 * builder still covers every kind of thing the palette can return, and that
 * its output survives a JSON round trip and still ranks. A field that fails to
 * serialise, or an entry kind that quietly stops being emitted, would both
 * present as "search is just not finding that today".
 */
describe("buildSearchEntries", () => {
  const entries = buildSearchEntries();

  it("is not empty and has no duplicate hrefs", () => {
    expect(entries.length).toBeGreaterThan(0);
    const hrefs = entries.map((e) => e.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("covers tools, essays and comparisons", () => {
    // Excluding essays was a real regression once: a query for "evals"
    // returned only tools and hid the best answer on the site.
    const kinds = new Set(entries.map((e) => e.kind));
    expect(kinds).toEqual(new Set(["tool", "essay", "comparison"]));
  });

  it("gives every entry the fields the palette renders", () => {
    for (const e of entries) {
      expect(e.name, `name for ${e.href}`).toBeTruthy();
      expect(e.blurb, `blurb for ${e.href}`).toBeTruthy();
      expect(e.categoryTitle, `categoryTitle for ${e.href}`).toBeTruthy();
      expect(e.href, `href for ${e.name}`).toMatch(/^\//);
      expect(e.categoryLayer === null || typeof e.categoryLayer === "number")
        .toBe(true);
    }
  });

  it("gives tools an external site, and only tools", () => {
    for (const e of entries) {
      if (e.kind === "tool") expect(e.external, `external for ${e.name}`).toMatch(/^https?:\/\//);
      else expect(e.external, `external on ${e.kind} ${e.name}`).toBeUndefined();
    }
  });

  it("survives a JSON round trip and still ranks", () => {
    // This is the path the browser actually takes: the route JSON-serialises
    // the builder's output, and the palette parses it back before indexing.
    const roundTripped = JSON.parse(JSON.stringify(entries)) as typeof entries;
    const index = buildIndex(roundTripped);

    const hits = searchTools(index, "vllm");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.name.toLowerCase().includes("vllm"))).toBe(true);

    // An essay must still be reachable by its own title, not just tools.
    const essay = entries.find((e) => e.kind === "essay");
    expect(essay).toBeDefined();
    const firstWord = essay!.name.split(/\s+/)[0];
    const essayHits = searchTools(index, firstWord);
    expect(essayHits.some((h) => h.href === essay!.href)).toBe(true);
  });

  it("browses the whole corpus on an empty query", () => {
    // The palette opens with a blank box, so this is the first thing a reader
    // sees. It must list the corpus, not an empty state.
    const all = searchTools(buildIndex(entries), "");
    expect(all.length).toBe(entries.length);
  });
});
