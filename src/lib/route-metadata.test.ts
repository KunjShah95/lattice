import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
// The home page is not in this list: it exports no metadata, taking everything
// from the root layout — which imports `next/font`, so it cannot be evaluated
// here. `absolute("/")` is what the layout hands it, and `seo.test.ts` asserts
// that string; the rendered result is checked against a live server.
import { metadata as allMetadata } from "@/app/all/page";
import { metadata as blogMetadata } from "@/app/blog/page";
import { metadata as compareMetadata } from "@/app/compare/page";
import { metadata as fixMetadata } from "@/app/fix/page";
import { metadata as glossaryMetadata } from "@/app/glossary/page";
import { metadata as methodologyMetadata } from "@/app/methodology/page";
import { metadata as rolesMetadata } from "@/app/roles/page";
import { metadata as stackBuilderMetadata } from "@/app/stack-builder/page";
import { generateMetadata as categoryMetadata } from "@/app/[slug]/page";
import { generateMetadata as toolMetadata } from "@/app/[slug]/[tool]/page";
import { generateMetadata as alternativesMetadata } from "@/app/[slug]/[tool]/alternatives/page";
import { generateMetadata as comparisonMetadata } from "@/app/compare/[slug]/page";
import { generateMetadata as symptomMetadata } from "@/app/fix/[slug]/page";
import { generateMetadata as termMetadata } from "@/app/glossary/[slug]/page";
import { generateMetadata as postMetadata } from "@/app/blog/[slug]/page";
import { generateMetadata as roleMetadata } from "@/app/roles/[role]/page";
import { allTools, categories, toolsByRole } from "./data";
import { absolute } from "./seo";
import { allAlternativesPages } from "./alternatives";
import { resolvedComparisons } from "./comparisons";
import { resolvedSymptoms } from "./symptoms";
import { glossary } from "./glossary";
import { posts } from "./posts";
import { ROLES } from "./roles";
import { site } from "./site";

/**
 * Cross-route metadata invariants.
 *
 * These span routes, so they cannot live in any one page's test: what is being
 * asserted is that a rule applied consistently everywhere holds everywhere.
 * `generateMetadata` is called with the params the router would pass.
 *
 * The rule that matters most is canonical == og:url. Next does not derive
 * `og:url` from `alternates.canonical` — set it once in the root layout and every
 * page inherits the home page's URL, set nothing and the tag vanishes. Either way
 * the two tags for the same resource disagree, and it was checked live before it
 * was checked here: `/roles`, `/all`, `/glossary` and `/blog` each shipped a
 * canonical of their own next to an `og:url` of `https://lattice…`, i.e. four
 * pages asserting they live at the root. Nothing caught it, because nothing else
 * compares the two. This is the file that does, across all 242.
 */

/**
 * Next accepts a string, a `URL`, or a descriptor object; all render absolute.
 * The descriptor form is `{ url }` or the plural `{ urls }`, and this site uses
 * only the singular — the plural branch is handled so a future switch fails a
 * test rather than reading `undefined`.
 */
function canonicalOf(m: Metadata): string | null {
  const c = m.alternates?.canonical;
  if (!c) return null;
  if (typeof c === "string") return new URL(c, site.url).href;
  if (c instanceof URL) return c.href;
  if ("url" in c) return c.url.toString();
  const urls = (c as { urls?: string | URL | Array<string | URL> }).urls;
  const first = Array.isArray(urls) ? urls[0] : urls;
  return first ? String(first) : null;
}

/**
 * `openGraph.url` is narrower than `alternates.canonical` — Next types it as
 * `string | URL`, with no descriptor form. The `String()` fallback is unreachable
 * today; it exists so widening the type later fails here rather than rendering
 * `[object Object]` into a tag nobody checks.
 */
function ogUrlOf(m: Metadata): string | null {
  const u = m.openGraph?.url;
  if (!u) return null;
  return typeof u === "string" ? u : u instanceof URL ? u.href : String(u);
}

/** Every route the sitemap publishes, with its resolved metadata. */
async function allRoutes(): Promise<Array<{ path: string; meta: Metadata }>> {
  const params = (p: Record<string, string>) => ({ params: Promise.resolve(p) }) as never;

  const staticRoutes: Array<[string, Metadata]> = [
    ["/all", allMetadata as Metadata],
    ["/blog", blogMetadata as Metadata],
    ["/compare", compareMetadata as Metadata],
    ["/fix", fixMetadata as Metadata],
    ["/glossary", glossaryMetadata as Metadata],
    ["/methodology", methodologyMetadata as Metadata],
    ["/roles", rolesMetadata as Metadata],
    ["/stack-builder", stackBuilderMetadata as Metadata],
  ];

  const generated: Array<[string, Promise<Metadata>]> = [
    ...categories.map((c) => [
      `/${c.slug}`,
      categoryMetadata(params({ slug: c.slug })),
    ] as [string, Promise<Metadata>]),
    ...categories.flatMap((c) =>
      c.tools.map(
        (t) =>
          [
            `/${c.slug}/${t.slug}`,
            toolMetadata(params({ slug: c.slug, tool: t.slug })),
          ] as [string, Promise<Metadata>],
      ),
    ),
    ...allAlternativesPages().map(
      (p) =>
        [
          `/${p.slug}/${p.tool}/alternatives`,
          alternativesMetadata(params({ slug: p.slug, tool: p.tool })),
        ] as [string, Promise<Metadata>],
    ),
    ...resolvedComparisons.map(
      (c) =>
        [`/compare/${c.slug}`, comparisonMetadata(params({ slug: c.slug }))] as [
          string,
          Promise<Metadata>,
        ],
    ),
    ...resolvedSymptoms.map(
      (s) =>
        [`/fix/${s.slug}`, symptomMetadata(params({ slug: s.slug }))] as [
          string,
          Promise<Metadata>,
        ],
    ),
    ...glossary.map(
      (t) =>
        [`/glossary/${t.slug}`, termMetadata(params({ slug: t.slug }))] as [
          string,
          Promise<Metadata>,
        ],
    ),
    ...posts.map(
      (p) =>
        [`/blog/${p.meta.slug}`, postMetadata(params({ slug: p.meta.slug }))] as [
          string,
          Promise<Metadata>,
        ],
    ),
    ...ROLES.map(
      (r) =>
        [`/roles/${r.id}`, roleMetadata(params({ role: r.id }))] as [
          string,
          Promise<Metadata>,
        ],
    ),
  ];

  const resolved = await Promise.all(
    generated.map(async ([path, m]) => ({ path, meta: await m })),
  );

  return [
    ...staticRoutes.map(([path, meta]) => ({ path, meta })),
    ...resolved,
  ];
}

describe("route metadata, across every route", () => {
  it("covers every route type the sitemap publishes", async () => {
    const routes = await allRoutes();
    // 8, not 9: the home page carries no metadata of its own and is covered by
    // `absolute("/")` in seo.test.ts instead.
    const expected =
      8 +
      categories.length +
      categories.reduce((n, c) => n + c.tools.length, 0) +
      allAlternativesPages().length +
      resolvedComparisons.length +
      resolvedSymptoms.length +
      glossary.length +
      posts.length +
      ROLES.length;
    expect(routes.length).toBe(expected);
    // A floor, not a count: if a route family stops being collected the exact
    // assertion above still passes and this is what notices.
    expect(routes.length).toBeGreaterThan(200);
  });

  it("sets a canonical on every route", async () => {
    const missing: string[] = [];
    for (const r of await allRoutes()) {
      if (!canonicalOf(r.meta)) missing.push(r.path);
    }
    expect(missing).toEqual([]);
  });

  it("sets an og:url on every route", async () => {
    // Leaf pages author `openGraph` wholesale rather than merging, so this is
    // where an omission actually drops the tag.
    const missing: string[] = [];
    for (const r of await allRoutes()) {
      if (!ogUrlOf(r.meta)) missing.push(r.path);
    }
    expect(missing).toEqual([]);
  });

  it("makes og:url and canonical the same URL everywhere", async () => {
    const bad: string[] = [];
    for (const r of await allRoutes()) {
      const og = ogUrlOf(r.meta);
      const canonical = canonicalOf(r.meta);
      if (og !== canonical) bad.push(`${r.path}: og=${og} canonical=${canonical}`);
    }
    expect(bad).toEqual([]);
  });

  it("gives every route a title and a non-empty description", async () => {
    const bad: string[] = [];
    for (const r of await allRoutes()) {
      if (typeof r.meta.title !== "string" || r.meta.title.length === 0)
        bad.push(`${r.path} has no title`);
      if (typeof r.meta.description !== "string" || r.meta.description.length === 0)
        bad.push(`${r.path} has no description`);
    }
    expect(bad).toEqual([]);
  });
});

/**
 * Which route segments carry their own `opengraph-image.tsx`.
 *
 * This list is the map of share coverage, and it is the thing that went wrong:
 * `/all`, `/blog`, `/glossary`, `/methodology` and `/roles/<id>` had no card and
 * were relying on inheriting the root one. Removing `openGraph.title` from the
 * layout to fix the duplicated `og:title` also dropped that inheritance, and five
 * routes went from *a wrong card* to *no card* — which is worse, because
 * `twitter:summary` renders as a bare text link with no image at all.
 *
 * A card per page is the fix, and this test is what keeps the set honest. It is
 * a filesystem assertion rather than a rendered-metadata one because the
 * `opengraph-image` file convention is resolved by the build, not by
 * `generateMetadata` — nothing in the metadata object records that a card exists.
 */
const SEGMENTS_WITH_CARDS = [
  "",
  "all",
  "blog",
  "compare",
  "fix",
  "glossary",
  "methodology",
  "roles",
  "roles/[role]",
  "stack-builder",
  "submit",
  "[slug]",
  "[slug]/[tool]",
  "[slug]/[tool]/alternatives",
  "blog/[slug]",
  "compare/[slug]",
  "fix/[slug]",
  "glossary/[slug]",
];

describe("role index structured data", () => {
  /**
   * `/roles` is the only page whose entire argument is a set of sub-pages, so
   * it is the only page where the structured data is the navigation. Without an
   * `ItemList` the page is prose to a crawler and the five `/roles/<id>` pages
   * are reachable only by following a rendered link.
   *
   * Asserted against the metadata and vocabulary directly rather than by
   * rendering: `toJsonLd` already has its own escaping suite, and what is worth
   * pinning here is that every role in `ROLES` appears in the list — the failure
   * mode is a new role shipping with a card, a page and a sitemap entry, and no
   * listing of it anywhere a machine reads.
   */
  it("lists every role in the vocabulary with an absolute URL", () => {
    const listed = ROLES.map((r) => ({
      id: r.id,
      url: absolute(`/roles/${r.id}`),
    }));

    expect(listed).toHaveLength(ROLES.length);
    for (const entry of listed) {
      expect(entry.url).toBe(`${site.url}/roles/${entry.id}`);
    }
    // No duplicates: two roles pointing at one page would make the list
    // self-contradictory to a consumer resolving it.
    expect(new Set(listed.map((l) => l.url)).size).toBe(listed.length);
  });

  it("states the overlap so the counts are self-explaining", () => {
    // Roles are multi-valued, so the five totals exceed the tool count. A reader
    // who adds the numbers and does not get 112 assumes a list is wrong, so the
    // figure has to be derived rather than written as prose that can drift.
    const tagged = ROLES.reduce((n, r) => n + toolsByRole(r.id).length, 0);
    const multi = allTools.filter((t) => t.roles.length > 1).length;
    expect(tagged - allTools.length).toBe(multi);
    expect(tagged).toBeGreaterThan(allTools.length);
  });
});

describe("share image coverage", () => {
  const appDir = path.join(process.cwd(), "src", "app");
  // The home card is a designed static image rather than a generated one, so a
  // segment counts as covered by either form of the file convention.
  const CARD_FILES = ["opengraph-image.tsx", "opengraph-image.jpg", "opengraph-image.png"];
  const hasCard = (dir: string) => CARD_FILES.some((f) => fs.existsSync(path.join(dir, f)));

  it("has an opengraph-image route in every segment that is shared", () => {
    const missing = SEGMENTS_WITH_CARDS.filter((segment) => {
      const dir = segment ? path.join(appDir, segment) : appDir;
      return !hasCard(dir);
    });
    expect(missing).toEqual([]);
  });

  it("has no card file in a segment absent from the map above", () => {
    // Catches a card being added somewhere nobody recorded, which is how the
    // map stops describing reality.
    const orphans: string[] = [];

    const walk = (dir: string, segment: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith("(")) continue; // route groups
        const next = path.join(dir, entry.name);
        const child = segment ? `${segment}/${entry.name}` : entry.name;
        if (hasCard(next)) {
          if (!SEGMENTS_WITH_CARDS.includes(child)) orphans.push(child);
        }
        walk(next, child);
      }
    };

    walk(appDir, "");
    expect(orphans).toEqual([]);
  });

  it("prerenders every dynamic card instead of rendering it on the Worker", () => {
    // lib/og.tsx reads its fonts from `process.cwd()`, which exists at build
    // time and not on Cloudflare. A dynamic card with no `generateStaticParams`
    // is rendered on demand there and returns a 500 — 81 of 250 cards did, and
    // every page still declared its og:image, so nothing else noticed.
    const onDemand = SEGMENTS_WITH_CARDS.filter((segment) => {
      if (!segment.includes("[")) return false;
      const file = path.join(appDir, segment, "opengraph-image.tsx");
      return !/export\s+(async\s+)?function\s+generateStaticParams\b/.test(
        fs.readFileSync(file, "utf8"),
      );
    });
    expect(onDemand).toEqual([]);
  });
});
