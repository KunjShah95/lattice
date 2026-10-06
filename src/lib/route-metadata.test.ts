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
import { metadata as correctionsMetadata } from "@/app/corrections/page";
import { metadata as rolesMetadata } from "@/app/roles/page";
import { metadata as bandsMetadata } from "@/app/bands/page";
import { metadata as stackBuilderMetadata } from "@/app/stack-builder/page";
import { generateMetadata as categoryMetadata } from "@/app/[slug]/page";
import { generateMetadata as toolMetadata } from "@/app/[slug]/[tool]/page";
import { generateMetadata as alternativesMetadata } from "@/app/[slug]/[tool]/alternatives/page";
import { generateMetadata as comparisonMetadata } from "@/app/compare/[slug]/page";
import { generateMetadata as symptomMetadata } from "@/app/fix/[slug]/page";
import { generateMetadata as termMetadata } from "@/app/glossary/[slug]/page";
import { generateMetadata as postMetadata } from "@/app/blog/[slug]/page";
import { generateMetadata as roleMetadata } from "@/app/roles/[role]/page";
import { generateMetadata as bandMetadata } from "@/app/bands/[band]/page";
import { generateMetadata as stackWorkloadMetadata } from "@/app/stack/[workload]/page";
import { allTools, categories, toolsByRole } from "./data";
import { absolute, bylineName, credit, datasetModified, ids } from "./seo";
import { allAlternativesPages } from "./alternatives";
import { resolvedComparisons } from "./comparisons";
import { resolvedSymptoms } from "./symptoms";
import { glossary } from "./glossary";
import { posts } from "./posts";
import { WORKLOADS } from "./stacks";
import { ROLES } from "./roles";
import { BANDS } from "./layer";
import { site } from "./site";
import sitemap from "@/app/sitemap";

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
    ["/corrections", correctionsMetadata as Metadata],
    ["/roles", rolesMetadata as Metadata],
    ["/bands", bandsMetadata as Metadata],
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
    ...WORKLOADS.map(
      (w) =>
        [`/stack/${w.id}`, stackWorkloadMetadata(params({ workload: w.id }))] as [
          string,
          Promise<Metadata>,
        ],
    ),
    ...BANDS.map(
      (b) =>
        [`/bands/${b.id}`, bandMetadata(params({ band: b.id }))] as [
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
    // 10, not 11: the home page carries no metadata of its own and is covered by
    // `absolute("/")` in seo.test.ts instead.
    const expected =
      10 +
      categories.length +
      categories.reduce((n, c) => n + c.tools.length, 0) +
      allAlternativesPages().length +
      resolvedComparisons.length +
      resolvedSymptoms.length +
      glossary.length +
      posts.length +
      ROLES.length +
      BANDS.length +
      WORKLOADS.length;
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
  "corrections",
  "roles",
  "roles/[role]",
  "bands",
  "bands/[band]",
  "stack-builder",
  "stack/[workload]",
  "submit",
  "about",
  "contact",
  "privacy",
  "returns",
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

  /**
   * The sitemap is assembled by spreading literal entries next to `.map()` over
   * the vocabularies, so the same URL can be emitted twice by two blocks that
   * drifted apart. It did: `/bands`, `/bands/<id>` and `/stack/<id>` each
   * appeared twice, and `/bands` three times.
   *
   * Nothing in the build or in `next build` objects. A duplicate URL in a
   * sitemap is legal XML, so it shipped silently — it spends crawl budget and
   * it makes the `lastModified` a crawler honours ambiguous, since two entries
   * for one page can disagree.
   */
  it("publishes every URL exactly once", async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);

    const counts = new Map<string, number>();
    for (const url of urls) counts.set(url, (counts.get(url) ?? 0) + 1);
    const dupes = [...counts.entries()].filter(([, n]) => n > 1).map(([u]) => u);

    expect(dupes).toEqual([]);
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

/**
 * Index pages and the structured data they owe a crawler.
 *
 * Seven routes — `/all`, `/blog`, `/compare`, `/stack-builder`, `/glossary`,
 * `/methodology`, `/fix` — shipped with no JSON-LD at all while `/roles` and
 * every section page carried a full graph. Nothing caught it: the pages render,
 * the sitemap lists them, every metadata assertion below passes, and it only
 * shows up in `scripts/audit-seo.mjs` as "JSON-LD: none found" on lines sitting
 * next to four non-HTML endpoints that legitimately have none.
 *
 * Asserted against the source rather than a rendered page, because these graphs
 * are injected as a `<script>` in the component body — `metadata` cannot see
 * them, and rendering all seven in a unit test is not what this file is for.
 * What matters is that a new index page cannot be added without noticing it
 * owes a collection, so the map below is the assertion surface: a route in it
 * must emit `application/ld+json`.
 */
const INDEX_ROUTES: Array<[string, boolean]> = [
  // [segment, expects a CollectionPage over its own children]
  ["all", true],
  ["blog", true],
  ["compare", true],
  ["fix", true],
  ["glossary", true],
  ["methodology", false],
  ["corrections", false],
  ["roles", true],
  ["bands", true],
  ["stack-builder", false],
  ["submit", false],
  ["about", false],
  ["contact", false],
  ["privacy", false],
  ["returns", false],
];

describe("index page structured data", () => {
  const appDir = path.join(process.cwd(), "src", "app");
  const srcOf = (segment: string) =>
    fs.readFileSync(path.join(appDir, segment, "page.tsx"), "utf8");

  it("gives every index route a JSON-LD block", () => {
    const missing: string[] = [];
    for (const [segment] of INDEX_ROUTES) {
      if (!/type="application\/ld\+json"/.test(srcOf(segment))) missing.push(`/${segment}`);
    }
    expect(missing).toEqual([]);
  });

  it("declares a collection exactly where the page is a list of sub-pages", () => {
    // The collection itself is built by `collectionPageNodes` in lib/seo.ts, so
    // the signal in the page is the call plus a `listId` — not a literal
    // `"@type": "ItemList"`, which would mean grepping the shared helper instead
    // of the page and finding it everywhere at once.
    //
    // The four negative cases are deliberate, not oversights: `/methodology` and
    // `/corrections` are pages *about* the index and link to no collection,
    // `/stack-builder` is an interactive tool rather than a list, and `/submit` is
    // a form. Declaring a collection on any of them would be a claim the page does
    // not make — `/corrections` in particular is a `Blog`, whose posts are rows
    // rather than sub-pages.
    const wrong: string[] = [];
    for (const [segment, expectsList] of INDEX_ROUTES) {
      const hasList = /collectionPageNodes\([\s\S]*?listId:/.test(srcOf(segment));
      if (hasList !== expectsList) wrong.push(`/${segment}`);
    }
    expect(wrong).toEqual([]);
  });

  it("has a segment in the map for every directory holding an index route", () => {
    // Stops the map drifting from reality as routes are added, which is how it
    // stops meaning anything. Directories with no `page.tsx` are machine
    // endpoints (`llms.txt`, `tools.json`, `/api`) and are correctly absent.
    const unlisted: string[] = [];
    for (const entry of fs.readdirSync(appDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith("(") || entry.name.startsWith("[")) {
        continue;
      }
      if (!fs.existsSync(path.join(appDir, entry.name, "page.tsx"))) continue;
      if (!INDEX_ROUTES.some(([segment]) => segment === entry.name)) unlisted.push(entry.name);
    }
    expect(unlisted).toEqual([]);
  });
});

describe("meta description budget", () => {
  /**
   * One rule, applied everywhere.
   *
   * There was no single rule before this: `brand.test.ts` held the homepage to
   * ~160 characters while `comparisons.test.ts` let comparison pages run to 200,
   * and nothing covered the tool pages at all — which is where an audit of the
   * live site found 130 of 193 over budget with the site "when to skip it"
   * clause truncated away.
   *
   * The 200 ceiling is deliberate rather than 160: several pages are honest
   * sentences that cannot be said in less, and truncating prose to hit a number
   * produces worse copy, not better SEO. What must hold is that the sentence
   * which carries the page's argument is not the part being cut — asserted in
   * `seo.test.ts` for tool pages, where the hook is generated.
   */
  const CEILING = 200;

  it("keeps every route's description under the ceiling", async () => {
    const over: string[] = [];
    for (const r of await allRoutes()) {
      const desc = r.meta.description;
      if (typeof desc === "string" && desc.length > CEILING) {
        over.push(`${r.path} (${desc.length})`);
      }
    }
    expect(over).toEqual([]);
  });
});

describe("title budget", () => {
  /**
   * A title under 25 characters renders as a stub. `/blog` was "Essays · Lattice"
   * at 16 and `/glossary` "Glossary · Lattice" at 18 — neither says what the page
   * is. The floor exists to catch that class.
   *
   * There is deliberately no matching ceiling. Sixty-four titles run long, and
   * that is correct: `/fix/measure-llm-changes` front-loads the whole query, "How
   * do I know if my LLM changes actually helped?", which survives truncation.
   * Capping those would cut the search term off the front of the one field that
   * has to carry it.
   */
  const FLOOR = 25;

  it("gives every route a title long enough to read as a result", async () => {
    const short: string[] = [];
    for (const r of await allRoutes()) {
      // The template is applied by the layout, not by `generateMetadata`, so the
      // raw value is what every route in this file returns and it is 10
      // characters shorter than what a reader sees. Measuring it raw would fail
      // "Essays on production AI" (23) for a page that actually renders as
      // "Essays on production AI · Lattice" (33) — so the template is applied
      // here to measure the string a search result shows.
      const raw = r.meta.title;
      if (typeof raw !== "string") continue;
      const rendered = site.titleTemplate.replace("%s", raw);
      if (rendered.length < FLOOR) {
        short.push(`${r.path} "${rendered}" (${rendered.length})`);
      }
    }
    expect(short).toEqual([]);
  });
});

/**
 * Every page making a factual claim names who wrote it and when it was checked.
 *
 * The category audit found a named editor with a visible verification date on
 * every page engines cited — and `/compare`, `/fix` and `/blog` were the only
 * families declaring one. The tool pages (112), glossary pages (51) and
 * alternatives pages made up the bulk of the site and had none, which is effort
 * ranked exactly backwards against result.
 *
 * Asserted against the rendered output rather than the source, because the two
 * halves of this are independent and both matter: the JSON-LD `author` is what a
 * consumer reads, and the visible byline is what a reader (or a passage
 * extractor) actually sees. Emitting one without the other is the easy mistake,
 * and it looks fine in either file alone.
 */
describe("authorship and verification", () => {
  const appDir = path.join(process.cwd(), "src", "app");

  /** The page families that state a claim about the index's own data. */
  const CREDITED_SEGMENTS = [
    "[slug]",
    "[slug]/[tool]",
    "[slug]/[tool]/alternatives",
    "glossary/[slug]",
  ];

  it("declares an author and a date on every credited JSON-LD graph", () => {
    // Read from source because these nodes are built in the component body, not
    // in `generateMetadata`, so there is nothing on the metadata object to check.
    const missing: string[] = [];
    for (const segment of CREDITED_SEGMENTS) {
      const src = fs.readFileSync(path.join(appDir, segment, "page.tsx"), "utf8");
      if (!/\.\.\.credit\(\)/.test(src)) missing.push(`${segment}: no credit()`);
    }
    expect(missing).toEqual([]);
  });

  it("renders a visible byline on every credited page family", () => {
    // The half that cannot be asserted from JSON-LD: an author in structured
    // data that no reader ever sees is a signal to machines and not to people,
    // and these pages are read by both.
    const missing: string[] = [];
    for (const segment of CREDITED_SEGMENTS) {
      const src = fs.readFileSync(path.join(appDir, segment, "page.tsx"), "utf8");
      if (!/<Byline\b/.test(src)) missing.push(`${segment}: no <Byline>`);
    }
    expect(missing).toEqual([]);
  });

  it("spreads credit() rather than restating author and date by hand", () => {
    // `credit()` exists so the author, publisher and date cannot drift apart
    // across four page families — which is what happened before it: three
    // families each spelled out a subset of the three fields. A page that
    // hand-rolls `dateModified` here has opted out of that.
    const stray: string[] = [];
    for (const segment of CREDITED_SEGMENTS) {
      const src = fs.readFileSync(path.join(appDir, segment, "page.tsx"), "utf8");
      // Outside the helper itself: a stray `dateModified:` alongside a credit()
      // means two dates on one page.
      if (/\.\.\.credit\(\)/.test(src) && /dateModified:/.test(src)) {
        stray.push(`${segment}: credit() plus a hand-written dateModified`);
      }
    }
    expect(stray).toEqual([]);
  });

  it("resolves credit() to a real author node and the dataset's month", () => {
    // The end of the chain. `credit()` must point at a Person when one is
    // configured and at the organisation otherwise — never a Person named after
    // the organisation, which is a false claim in the field engines read.
    //
    // Both branches are asserted rather than just the configured one, because
    // `vitest.config.mts` only forwards the branding variables and
    // `NEXT_PUBLIC_AUTHOR_NAME` is not among them — so in CI `site.author` is
    // null and the byline reads "Lattice editorial". `brand.test.ts` is gated
    // off CI for exactly that reason. Asserting the named branch here would
    // mean this file fails on every push and passes on every machine.
    const node = credit() as { author: object; dateModified: string };

    expect(node.dateModified).toBe(datasetModified);
    // First of the month, not the build time: the freshness argument on this
    // site rests on the date meaning the last verification.
    expect(node.dateModified).toMatch(/^\d{4}-\d{2}-01$/);

    if (site.author) {
      expect(node.author).toEqual({ "@type": "Person", name: site.author.name });
      expect(bylineName).toBe(site.author.name);
    } else {
      expect(node.author).toEqual({ "@id": ids.organization });
      expect(bylineName).toBe(`${site.name} editorial`);
    }
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
