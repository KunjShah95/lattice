import { describe, expect, it } from "vitest";
import { buildSearchEntries } from "./search-entries";
import {
  activeFilterCount,
  applyFilters,
  FILTER_KEYS,
  filterVocabulary,
  hasAnyFilter,
  matchesFilters,
  parseFilterParam,
  parseFilters,
  type EntryFilters,
} from "./search-filters";
import type { SearchEntry } from "./search";
import { ROLE_IDS } from "./roles";
import { categories } from "./data";

/**
 * Facet filtering on the query surface.
 *
 * Two things are worth testing here that are not worth testing in
 * `facets.test.ts`. First, the *shape* is different: `facets.ts` takes a
 * selection object from a React component, this takes a query string, so the
 * parsing is part of the contract and a repeated key has to mean OR rather than
 * last-one-wins. Second, the corpus is mixed — tools and non-tools in one
 * index — and the interesting cases are the ones where a tool-only axis meets
 * an entry that has no `facets` at all. Getting those wrong returns a plausible
 * list containing essays that were never filtered, which is worse than an
 * error.
 */

const entries = buildSearchEntries();

/** Index shape for the filter helpers, which only read `.entry`. */
const indexed = entries.map((entry) => ({ entry }));

function toolEntries(): SearchEntry[] {
  return entries.filter((e) => e.kind === "tool");
}

const set = (...values: string[]) => new Set(values);

describe("parseFilterParam", () => {
  const parse = (q: string) => parseFilterParam(new URLSearchParams(q), "cost");

  it("reads a single value", () => {
    expect(parse("cost=free")).toEqual(set("free"));
  });

  it("ORs a repeated key rather than letting the last one win", () => {
    // `getAll`, not `get`. With `get`, `?cost=free&cost=usage-based` would
    // silently become one value and the other would vanish — which looks like
    // the filter working and returns the wrong set.
    expect(parse("cost=free&cost=usage-based")).toEqual(set("free", "usage-based"));
  });

  it("treats an empty or blank value as no constraint", () => {
    // A hand-edited URL. Returning an empty set would filter everything out and
    // read as "no matches" rather than "you left the box blank".
    expect(parse("cost=")).toBeUndefined();
    expect(parse("cost=%20%20")).toBeUndefined();
  });

  it("lowercases and trims, so the URL need not be careful", () => {
    expect(parse("cost=Free")).toEqual(set("free"));
    expect(parse("cost=%20FREE%20")).toEqual(set("free"));
  });
});

describe("parseFilters", () => {
  it("reads every axis at once and leaves the rest unconstrained", () => {
    const f = parseFilters(
      new URLSearchParams("layer=3&role=data&role=applied&cost=free"),
    );
    expect(f.layer).toEqual(set("3"));
    expect(f.role).toEqual(set("data", "applied"));
    expect(f.cost).toEqual(set("free"));
    expect(f.kind).toBeUndefined();
    expect(f.deployment).toBeUndefined();
    expect(f.section).toBeUndefined();
  });

  it("is inert on a bare query string", () => {
    expect(hasAnyFilter(parseFilters(new URLSearchParams("q=vllm")))).toBe(false);
  });
});

describe("hasAnyFilter / activeFilterCount", () => {
  it("distinguishes an unconstrained selection from a present-but-empty one", () => {
    expect(hasAnyFilter({})).toBe(false);
    expect(hasAnyFilter({ cost: new Set() })).toBe(false);
    expect(hasAnyFilter({ cost: set("free") })).toBe(true);
  });

  it("counts values, not axes, so a two-value role filter reads as two", () => {
    expect(activeFilterCount({ role: set("data", "applied"), cost: set("free") })).toBe(3);
  });
});

describe("matchesFilters — tools", () => {
  const pgvector = entries.find((e) => e.name === "pgvector")!;

  it("passes everything when nothing is constrained", () => {
    expect(matchesFilters(pgvector, {})).toBe(true);
  });

  it("matches a single axis", () => {
    expect(matchesFilters(pgvector, { kind: set("database") })).toBe(true);
    expect(matchesFilters(pgvector, { kind: set("runtime") })).toBe(false);
  });

  it("ORs values within one axis", () => {
    expect(matchesFilters(pgvector, { cost: set("free", "usage-based") })).toBe(true);
  });

  it("ANDs across axes", () => {
    expect(
      matchesFilters(pgvector, { kind: set("database"), cost: set("free") }),
    ).toBe(true);
    expect(
      matchesFilters(pgvector, { kind: set("database"), cost: set("subscription") }),
    ).toBe(false);
  });

  it("matches a multi-valued role on either value", () => {
    // A tool tagged for two roles belongs under both, so selecting either must
    // return it — the same rule `facets.ts` applies in the client explorer.
    const multi = toolEntries().find((e) => (e.facets?.roles.length ?? 0) > 1)!;
    const [first, second] = multi.facets!.roles;
    expect(matchesFilters(multi, { role: set(first) })).toBe(true);
    expect(matchesFilters(multi, { role: set(second) })).toBe(true);
    expect(matchesFilters(multi, { role: set("not-a-role") })).toBe(false);
  });

  it("matches on layer for a tool", () => {
    expect(matchesFilters(pgvector, { layer: set("3") })).toBe(true);
    expect(matchesFilters(pgvector, { layer: set("1") })).toBe(false);
  });

  it("excludes an off-stack tool when a layer is asked for", () => {
    // Reading material has `layer: null`. `String(null)` is the string "null",
    // which is in no vocabulary, so it cannot accidentally satisfy `layer=1..9`.
    const reading = entries.find(
      (e) => e.kind === "tool" && e.categoryLayer === null,
    )!;
    expect(reading).toBeDefined();
    expect(matchesFilters(reading, { layer: set("1") })).toBe(false);
    expect(matchesFilters(reading, { layer: set("null") })).toBe(true);
  });

  it("does not match a null deployment against a named one", () => {
    // `deployment: null` means "does not apply" (reading material), which is not
    // the same as "self-hosted". Treating null as a matchable value would let
    // `?deployment=saas` return books.
    const reading = entries.find(
      (e) => e.kind === "tool" && e.facets?.deployment === null,
    )!;
    expect(reading).toBeDefined();
    expect(matchesFilters(reading, { deployment: set("saas") })).toBe(false);
  });
});

describe("matchesFilters — non-tool entries", () => {
  const essay = entries.find((e) => e.kind === "essay")!;
  const term = entries.find((e) => e.kind === "glossary")!;

  it("passes an unconstrained selection", () => {
    expect(matchesFilters(essay, {})).toBe(true);
    expect(matchesFilters(term, {})).toBe(true);
  });

  it("is filtered by layer, which every entry has", () => {
    expect(matchesFilters(term, { layer: set("1") })).toBe(true);
    expect(matchesFilters(term, { layer: set("7") })).toBe(false);
  });

  it("is excluded by a tool-only axis rather than passing unfiltered", () => {
    // The important case. "Free tools that explain evals" is not what
    // `?cost=free` asked for, so the essay must drop out.
    expect(matchesFilters(essay, { cost: set("free") })).toBe(false);
    expect(matchesFilters(essay, { kind: set("database") })).toBe(false);
    expect(matchesFilters(essay, { role: set("data") })).toBe(false);
    expect(matchesFilters(essay, { deployment: set("saas") })).toBe(false);
  });
});

describe("applyFilters over the real corpus", () => {
  const pool = indexed;

  it("is a no-op with no filters, and returns everything", () => {
    expect(applyFilters(pool, {}).length).toBe(pool.length);
  });

  it("narrows to a subset that genuinely satisfies every axis", () => {
    const rows = applyFilters(pool, { cost: set("free"), kind: set("runtime") });
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.entry.facets!.cost).toBe("free");
      expect(row.entry.facets!.kind).toBe("runtime");
    }
  });

  it("returns nothing for an impossible combination, without throwing", () => {
    // Reading material is free, so `cost=free` alone does match some of it —
    // the combination has to be genuinely contradictory. `reading` entries have
    // `deployment: null`, which no axis ever publishes as a value, so pairing
    // `kind=reading` with a named deployment cannot match anything.
    expect(
      applyFilters(pool, { kind: set("reading"), deployment: set("saas") }).length,
    ).toBe(0);
    expect(
      applyFilters(pool, { cost: set("free"), kind: set("reading") }).length,
    ).toBeGreaterThan(0);
  });

  it("counts the same tools a direct dataset filter would", () => {
    // The filter reads a projection off the search entry rather than the tool
    // itself, so this is the test that the projection is faithful.
    const rows = applyFilters(pool, { role: set("serving") });
    const direct = toolEntries().filter((e) => e.facets!.roles.includes("serving"));
    expect(rows.length).toBe(direct.length);
    expect(rows.length).toBeGreaterThan(0);
  });

  it("keeps every role id legal, so `?role=` cannot be answered with a typo", () => {
    const vocab = filterVocabulary(entries);
    for (const id of ROLE_IDS) expect(vocab.role).toContain(id);
    expect(vocab.role.length).toBe(ROLE_IDS.length);
  });

  it("keys the vocabulary by filter name, not by field name", () => {
    // The caller passes `?role=`, so `acceptedFilterValues` has to say `role`.
    // Publishing `roles` here — the field name on the entry — is a mismatch
    // that costs a caller a round trip to discover.
    const vocab = filterVocabulary(entries);
    for (const key of FILTER_KEYS) {
      expect(vocab[key], key).toBeDefined();
    }
    expect((vocab as Record<string, unknown>).roles).toBeUndefined();
  });
});

describe("filterVocabulary", () => {
  const vocab = filterVocabulary(entries);

  it("agrees with the dataset on the layer axis", () => {
    const layers = categories
      .map((c) => c.layer)
      .filter((l): l is number => l != null)
      .sort((a, b) => a - b);
    expect(vocab.layer).toEqual(layers.map(String));
  });

  it("agrees with the dataset on the section axis", () => {
    const slugs = categories.map((c) => c.slug).sort();
    // Only in-stack sections are reachable as tool filters, and every category
    // ships tools, so the two sets are the same size.
    expect(vocab.section.length).toBe(slugs.length);
    for (const slug of slugs) expect(vocab.section).toContain(slug);
  });

  it("never offers a null as a legal deployment value", () => {
    expect(vocab.deployment).not.toContain("null");
    expect(vocab.deployment).not.toContain("");
  });

  it("sorts layers numerically rather than lexicographically", () => {
    // "10" would sort before "2" as a string. There are nine layers so this is
    // currently invisible, which is exactly why it needs a test.
    expect(vocab.layer).toEqual([...vocab.layer].sort((a, b) => Number(a) - Number(b)));
  });

  it("is derived from the corpus, so it cannot drift from it", () => {
    const kinds = new Set(toolEntries().map((e) => e.facets!.kind));
    expect(new Set(vocab.kind)).toEqual(kinds);
  });
});

describe("filters as a type-level contract", () => {
  it("accepts an explicitly empty selection without constraining anything", () => {
    const f: EntryFilters = { cost: undefined, role: new Set() };
    expect(hasAnyFilter(f)).toBe(false);
  });
});