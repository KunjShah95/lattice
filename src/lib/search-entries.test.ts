import { describe, expect, it } from "vitest";
import { categories } from "./data";
import { glossary } from "./glossary";
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

  it("covers every kind the palette can return", () => {
    // Excluding essays was a real regression once: a query for "evals"
    // returned only tools and hid the best answer on the site. Glossary was the
    // same mistake later — 51 terms, each with a page, none findable by name.
    //
    // Asserted as an exact set rather than a superset, because a new kind that
    // ships without a branch in the palette's pill renderer is exactly the kind
    // of addition this is here to catch.
    const kinds = new Set(entries.map((e) => e.kind));
    expect(kinds).toEqual(new Set(["tool", "essay", "comparison", "glossary"]));
  });

  it("indexes every glossary term, reachable by its own name", () => {
    const terms = entries.filter((e) => e.kind === "glossary");
    expect(terms).toHaveLength(glossary.length);

    const index = buildIndex(entries);
    for (const term of glossary) {
      const hits = searchTools(index, term.term);
      expect(
        hits.some((h) => h.href === `/glossary/${term.slug}`),
        `"${term.term}" does not find its own page`,
      ).toBe(true);
    }
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

  it("carries filter facets on tools and only tools", () => {
    // Absence on non-tools is what lets `search-filters.ts` exclude an essay from
    // `?cost=free` rather than let it through unfiltered. If a non-tool ever grew
    // a `facets` object, that logic would start reading fields it does not have.
    for (const e of entries) {
      if (e.kind === "tool") {
        expect(e.facets, `facets for ${e.name}`).toBeDefined();
        expect(e.facets!.roles.length, `roles for ${e.name}`).toBeGreaterThan(0);
        // The facet's section must be the tool's real home section, or
        // `?section=retrieval-vector-stores` would not find it. Asserted against
        // the dataset rather than against the href, which would pass for a
        // projection that disagreed with the URL.
        const home = e.href.split("/")[1];
        expect(e.facets!.section, `section for ${e.name}`).toBe(home);
        expect(categories.some((c) => c.slug === e.facets!.section)).toBe(true);
      } else {
        expect(e.facets, `facets on ${e.kind} ${e.name}`).toBeUndefined();
      }
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

  it("finds a tool by a layer it only reaches as a second home", () => {
    // "Guardrails" is a section name, not a tool name or a role. A reader
    // typing it is asking about a layer, and the tools that reach that layer
    // from another one are part of the answer.
    const index = buildIndex(entries);
    const hits = searchTools(index, "guardrails");
    expect(hits.length).toBeGreaterThan(0);
    // Portkey is indexed under Routing & Gateways; its guardrails are a second
    // home, so it should be findable by the layer's name.
    expect(hits.some((h) => h.name === "Portkey")).toBe(true);
  });

  it("gives second-home titles, not slugs, so they read in the palette", () => {
    // The palette renders these next to the tool. A slug reads as a filename,
    // so assert against the real vocabulary rather than by shape — section
    // titles legitimately contain hyphens ("Fine-tuning & Training").
    const titles = new Set(categories.map((c) => c.title));
    const slugs = new Set(categories.map((c) => c.slug));
    for (const e of entries) {
      if (e.kind !== "tool") continue;
      expect(e.alsoIn, `alsoIn on ${e.name}`).toBeDefined();
      for (const title of e.alsoIn ?? []) {
        expect(titles.has(title), `${e.name}: "${title}" is not a section title`).toBe(
          true,
        );
        expect(slugs.has(title), `${e.name}: "${title}" is a slug`).toBe(false);
      }
    }
  });

  it("browses the whole corpus on an empty query", () => {
    // The palette opens with a blank box, so this is the first thing a reader
    // sees. It must list the corpus, not an empty state.
    const all = searchTools(buildIndex(entries), "");
    expect(all.length).toBe(entries.length);
  });
});
