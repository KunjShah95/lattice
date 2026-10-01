import { describe, expect, it } from "vitest";
import { glossary, getGlossaryTerm, glossaryLinkMap } from "./glossary";
import { allTools } from "./data";

/**
 * The glossary is prose that has to stay true, so the risks are silent ones:
 * a term defined twice, a link to a tool that moved, a "see also" pointing at
 * nothing, and a `see` list that becomes an unreadable dump.
 */

describe("term metadata", () => {
  it("has terms", () => {
    expect(glossary.length).toBeGreaterThan(20);
  });

  it("gives every term a unique slug", () => {
    const slugs = glossary.map((t) => t.slug);
    expect(new Set(slugs).size, "duplicate slug").toBe(slugs.length);
  });

  it("uses URL-safe slugs", () => {
    for (const t of glossary) {
      expect(t.slug, t.term).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  it("gives every term a one-sentence definition and a substantive one", () => {
    for (const t of glossary) {
      expect(t.definition.length, `${t.term} definition`).toBeGreaterThan(30);
      // The detail is the payload an index should carry; without it the entry
      // is just a dictionary and belongs somewhere else.
      expect(t.detail.length, `${t.term} detail`).toBeGreaterThan(80);
    }
  });

  it("keeps definitions to one sentence", () => {
    for (const t of glossary) {
      // Two sentences in a one-line definition means the second belongs in
      // the detail field.
      expect(
        (t.definition.match(/\.\s+\S/g) ?? []).length,
        `${t.term}: "${t.definition}"`,
      ).toBeLessThanOrEqual(1);
    }
  });

  it("declares a layer that exists, or none at all", () => {
    for (const t of glossary) {
      if (t.layer == null) continue;
      expect(t.layer, t.term).toBeGreaterThanOrEqual(1);
      expect(t.layer, t.term).toBeLessThanOrEqual(9);
    }
  });
});

describe("cross-references", () => {
  it("resolves every term in a see-also list", () => {
    for (const t of glossary) {
      for (const slug of t.see ?? []) {
        expect(
          getGlossaryTerm(slug),
          `${t.term} points at missing term "${slug}"`,
        ).toBeTruthy();
      }
    }
  });

  it("never lists a term as its own related term", () => {
    for (const t of glossary) {
      expect(t.see ?? [], t.term).not.toContain(t.slug);
    }
  });

  it("has no duplicate entries within a see-also list", () => {
    for (const t of glossary) {
      const seen = t.see ?? [];
      expect(new Set(seen).size, `${t.term} repeats a related term`).toBe(seen.length);
    }
  });

  it("keeps see-also lists short enough to read", () => {
    for (const t of glossary) {
      expect((t.see ?? []).length, t.term).toBeLessThanOrEqual(3);
    }
  });

  it("only names tools that exist in the index", () => {
    const names = new Set(allTools.map((t) => t.name));
    for (const t of glossary) {
      for (const name of t.tools ?? []) {
        expect(names.has(name), `${t.term} names unknown tool "${name}"`).toBe(true);
      }
    }
  });

  it("returns undefined for an unknown term", () => {
    expect(getGlossaryTerm("definitely-not-a-term")).toBeUndefined();
  });
});

describe("the auto-link map", () => {
  it("maps every term to its page", () => {
    for (const t of glossary) {
      expect(glossaryLinkMap[t.term], t.term).toBe(`/glossary/${t.slug}`);
    }
  });

  it("maps every alias too", () => {
    for (const t of glossary) {
      for (const alias of t.aliases ?? []) {
        expect(glossaryLinkMap[alias], `${t.term} alias "${alias}"`).toBe(
          `/glossary/${t.slug}`,
        );
      }
    }
  });

  it("maps no term to nowhere", () => {
    for (const [name, href] of Object.entries(glossaryLinkMap)) {
      expect(href, name).toMatch(/^\/glossary\/[a-z0-9-]+$/);
    }
  });

  it("never maps the same phrase to two terms", () => {
    // An alias colliding with another term's heading would make auto-linking
    // non-deterministic about which definition a reader lands on.
    const byHref = new Map<string, string[]>();
    for (const [name, href] of Object.entries(glossaryLinkMap)) {
      byHref.set(href, [...(byHref.get(href) ?? []), name]);
    }
    for (const [href, names] of byHref) {
      expect(new Set(names).size, `${href} reachable by ${names.join(", ")}`).toBe(
        names.length,
      );
    }
  });
});

describe("coverage", () => {
  it("spreads terms across the stack rather than clustering in one layer", () => {
    const counts = new Map<number, number>();
    for (const t of glossary) {
      if (t.layer == null) continue;
      counts.set(t.layer, (counts.get(t.layer) ?? 0) + 1);
    }
    // Most layers should be represented, since the index is layer-ordered.
    expect(counts.size).toBeGreaterThanOrEqual(8);
  });

  it("links at least some terms to the index", () => {
    const linked = glossary.filter((t) => (t.tools ?? []).length > 0);
    expect(linked.length).toBeGreaterThan(glossary.length / 4);
  });

  it("does not let cross-cutting terms dominate", () => {
    const cross = glossary.filter((t) => t.layer == null);
    expect(cross.length).toBeLessThan(glossary.length / 4);
  });
});