import { describe, expect, it } from "vitest";
import { allTools, getAlternatives, getSiblingTools } from "./data";
import {
  absolute,
  collectionPageNodes,
  describeKind,
  listNames,
  lowerFirst,
  openness,
  toolDefinition,
  toolMetaDescription,
  toolQuestions,
} from "./seo";
import { site } from "./site";

/**
 * The answer copy is generated for every tool, so a grammar slip is a slip on
 * 112 pages at once. These check the sentences, not just the shapes.
 */
describe("absolute", () => {
  /**
   * `og:url` is not derived by Next from `alternates.canonical` — set it once in
   * the root layout and every page inherits the home page's URL, and set nothing
   * and the tag disappears. Either way the two tags for the same resource
   * disagree. So it is computed by hand per page, which makes this function the
   * only thing standing between the site and 250 wrong `og:url` tags, and these
   * are the cases that actually broke.
   */
  it("gives the origin for the root, with no trailing slash", () => {
    // A trailing slash here would make the home page's og:url differ from its
    // canonical by one character — the kind of mismatch that is invisible until
    // it is the reason a scrap treats the two as separate pages.
    expect(absolute()).toBe(site.url);
    expect(absolute("/")).toBe(site.url);
    expect(absolute("/")?.endsWith("/")).toBe(false);
  });

  it("joins a path to the origin exactly once", () => {
    expect(absolute("/roles")).toBe(`${site.url}/roles`);
    expect(absolute("/roles/data")).toBe(`${site.url}/roles/data`);
    expect(absolute("/retrieval-vector-stores/pinecone")).toBe(
      `${site.url}/retrieval-vector-stores/pinecone`,
    );
  });

  it("always produces an absolute https URL", () => {
    // This is the regression test for the empty-origin bug, and it lives here
    // rather than in `brand.test.ts` on purpose: CI excludes `brand.test.ts` from
    // its main test step, so a guard proven there would not run on the one
    // configuration that broke. Locally `.env.local` supplies a real domain and
    // this passes; in CI the env var is defined but empty, so it passes only
    // because `site.ts` treats empty as unset and falls back to an https
    // placeholder. Revert that guard from `||` to `??` and this fails on every
    // push while passing on every machine — which is exactly what it did.
    //
    // The origin being a placeholder is a separate invariant, asserted once in
    // `brand.test.ts`.
    for (const p of ["/", "/roles", "/roles/data", "/glossary"]) {
      expect(absolute(p), p).toMatch(/^https:\/\/[^/]+/);
    }
  });

  it("is the same string a canonical would be, so the two cannot drift", () => {
    // What every page actually passes: `alternates.canonical` is a path, and
    // Next resolves it against metadataBase. `absolute()` has to agree.
    //
    // This resolves against `site.url`, which is safe now that `site.ts` treats an
    // empty `NEXT_PUBLIC_SITE_URL` as unset rather than as a domain: there is
    // always an origin to resolve against. It used to throw
    // `TypeError: Invalid URL` in CI, where the env var is defined but empty.
    const path = "/roles/data";
    const fromCanonical = new URL(path, site.url).href;
    expect(absolute(path)).toBe(fromCanonical);
  });
});

describe("answer copy", () => {
  it("classifies licences", () => {
    expect(openness("Apache-2.0")).toBe("open-source");
    expect(openness("BSL-1.1")).toBe("source-available");
    expect(openness("proprietary")).toBe("proprietary");
    expect(openness(null)).toBe("unknown");
  });

  it("joins names as prose", () => {
    expect(listNames(["A"])).toBe("A");
    expect(listNames(["A", "B"])).toBe("A and B");
    expect(listNames(["A", "B", "C"])).toBe("A, B and C");
  });

  it("lower-cases sentence case but not names or acronyms", () => {
    expect(lowerFirst("General GPU serving")).toBe("general GPU serving");
    expect(lowerFirst("A team that ships")).toBe("a team that ships");
    expect(lowerFirst("GPU-first")).toBe("GPU-first");
    expect(lowerFirst("KV cache")).toBe("KV cache");
    expect(lowerFirst("PyTorch-native training")).toBe("PyTorch-native training");
    expect(lowerFirst("TypeScript")).toBe("TypeScript");
    expect(lowerFirst("LoRA adapters")).toBe("LoRA adapters");
    expect(lowerFirst("Python-native")).toBe("Python-native");
    expect(lowerFirst("Model Context Protocol")).toBe("Model Context Protocol");
    expect(lowerFirst("Paged attention")).toBe("paged attention");
  });

  it("describes kinds with an article", () => {
    expect(describeKind({ kind: "runtime", deployment: "self-hosted" })).toBe(
      "a self-hosted runtime",
    );
    expect(describeKind({ kind: "platform", deployment: "saas" })).toBe("a SaaS platform");
    expect(describeKind({ kind: "reading", deployment: null })).toBe("a reading resource");
  });

  it.each(allTools.map((t) => [t.name, t] as const))(
    "%s: every answer names its subject and ends as a sentence",
    (_, entry) => {
      const { category } = entry;
      const qas = toolQuestions(
        entry,
        category,
        getAlternatives(category.slug, entry.slug).map((a) => a.tool.name),
        getSiblingTools(category.slug, entry.slug).map((s) => s.name),
      );

      expect(toolDefinition(entry, category).startsWith(`${entry.name} is a`)).toBe(true);
      expect(qas[0].question).toBe(`What is ${entry.name}?`);
      for (const qa of qas) {
        expect(qa.answer.trim()).not.toBe("");
        expect(qa.answer).not.toMatch(/\.\./);
        expect(qa.answer).not.toMatch(/undefined|null/);
      }
    },
  );
});

/** The blurb is the one field long enough to push a description over budget. */
const MAX_DESC = 160;

describe("toolMetaDescription", () => {
  /**
   * The regression this exists to prevent. An audit of the live site found 130 of
   * 193 tool pages describing themselves past 160 characters, because the blurb
   * ran long and pushed the closing "when to use it, when to skip it" clause off
   * the end. That clause is the entire reason this index exists rather than
   * being another directory, and it was being truncated on two-thirds of the
   * index. Nothing failed: the pages rendered, the metadata was non-empty, and
   * every existing test passed.
   */
  it.each(allTools.map((t) => [t.name, t] as const))(
    "%s: fits the truncation window",
    (_, entry) => {
      const desc = toolMetaDescription(entry, entry.category);
      expect(desc.length, `${entry.name} is ${desc.length} chars`).toBeLessThanOrEqual(MAX_DESC);
    },
  );

  it.each(allTools.map((t) => [t.name, t] as const))(
    "%s: keeps the use/skip hook inside the visible description",
    (_, entry) => {
      // The specific failure: the hook exists in the string but renders past the
      // cut. Asserting on the whole string would pass on the old version too.
      const desc = toolMetaDescription(entry, entry.category);
      const hook = desc.slice(0, MAX_DESC);
      expect(hook, entry.name).toMatch(/when to use it, when to skip it/);
    },
  );

  it.each(allTools.map((t) => [t.name, t] as const))(
    "%s: names the tool and the section",
    (_, entry) => {
      const desc = toolMetaDescription(entry, entry.category);
      expect(desc).toContain(entry.name);
      expect(desc).toContain(entry.category.title.toLowerCase());
      expect(desc).not.toMatch(/undefined|null|\.\./);
    },
  );

  it("drops the blurb, which is already in three other places", () => {
    // Stated as an invariant rather than left implicit: someone will eventually
    // ask to put the blurb back for keyword coverage, and the answer is that it
    // is already the JSON-LD description, the visible lead paragraph and the
    // `/all` ItemList entry.
    const entry = allTools[0];
    expect(toolMetaDescription(entry, entry.category)).not.toContain(entry.blurb);
    expect(toolDefinition(entry, entry.category)).toContain(entry.blurb);
  });
});

describe("collectionPageNodes", () => {
  const pageUrl = `${site.url}/example`;
  const base = { pageUrl, name: "Example", description: "An example index." };

  it("declares a CollectionPage, an ItemList and a breadcrumb", () => {
    const doc = collectionPageNodes({
      ...base,
      listId: "items",
      crumbs: [{ name: "Example", path: "/example" }],
      items: [{ name: "A", url: `${site.url}/example/a` }],
    }) as { "@graph": Array<Record<string, unknown>> };

    expect(doc["@graph"].map((n) => n["@type"])).toEqual([
      "CollectionPage",
      "ItemList",
      "BreadcrumbList",
    ]);
  });

  it("points the page's mainEntity at the list it declares", () => {
    // Without this the CollectionPage is a page about some tools; with it, the
    // two nodes are related and a consumer can resolve the list from the page.
    const doc = collectionPageNodes({
      ...base,
      listId: "items",
      crumbs: [{ name: "Example", path: "/example" }],
      items: [{ name: "A", url: `${site.url}/example/a` }],
    }) as { "@graph": Array<Record<string, unknown>> };

    const page = doc["@graph"][0];
    const list = doc["@graph"][1];
    expect(list["@id"]).toBe(`${pageUrl}#items`);
    expect(page.mainEntity).toEqual({ "@id": `${pageUrl}#items` });
  });

  it("numbers entries from one and gives every one a URL", () => {
    const items = [
      { name: "A", url: `${site.url}/a` },
      { name: "B", url: `${site.url}/b` },
    ];
    const doc = collectionPageNodes({
      ...base,
      crumbs: [{ name: "Example", path: "/example" }],
      items,
    }) as { "@graph": Array<Record<string, unknown>> };

    const list = doc["@graph"][1] as {
      numberOfItems: number;
      itemListElement: Array<Record<string, unknown>>;
    };
    expect(list.numberOfItems).toBe(items.length);
    expect(list.itemListElement.map((i) => i.position)).toEqual([1, 2]);
    expect(list.itemListElement.every((i) => typeof i.url === "string")).toBe(true);
  });

  it("omits the list entirely when the page has nothing to list", () => {
    // `/methodology` is about the index and links to no collection of its own.
    // Declaring a mainEntity that does not exist is a small false claim, and the
    // absence has to be a clean two-node graph rather than a null in @graph.
    const doc = collectionPageNodes({
      ...base,
      crumbs: [{ name: "Example", path: "/example" }],
    }) as { "@graph": Array<Record<string, unknown>> };

    expect(doc["@graph"].map((n) => n["@type"])).toEqual([
      "CollectionPage",
      "BreadcrumbList",
    ]);
    expect(doc["@graph"][0].mainEntity).toBeUndefined();
  });

  it("serialises without a null in the graph", () => {
    // `JSON.stringify` writes a null happily and every consumer then chokes, so
    // the filter in `graph()` is the thing being pinned.
    const json = JSON.stringify(
      collectionPageNodes({ ...base, crumbs: [{ name: "Example", path: "/example" }] }),
    );
    expect(json).not.toContain("null");
  });
});
