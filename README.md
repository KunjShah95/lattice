# Lattice

A curated index of the infrastructure behind working AI systems — **112 tools
across 10 sections**, **112 per-tool pages**, **9 comparisons**, **5 symptom
checklists**, **51 glossary terms** and **11 essays** on the architectural
decisions behind them.

Sections are ordered as a production stack: layer 1 is the substrate everything
else runs on, layer 9 is the surface you look at. Off-stack material (reading,
courses) sits deliberately outside the stack.

There are **six ways in**, because people arrive from different directions:

| Route | Starts from |
| --- | --- |
| `/` | The stack — where each layer sits and why the order is the argument |
| `/fix` | A symptom — "why is my app slow", not "I need a vector database" |
| `/all` | The whole index, filterable by section, role, deployment, kind, cost |
| `/roles` | **Your job** — what a platform, infra, data, applied or production engineer owns |
| `/compare` | A decision — two or three tools head-to-head, ending in a recommendation |
| `/blog` | The reasoning — essays arguing the calls, not listing products |

Routes: `/` · `/all` · `/roles` · `/roles/<role>` · `/<section>` · `/<section>/<tool>` ·
`/<section>/<tool>/alternatives` · `/compare` · `/compare/<slug>` · `/fix` ·
`/fix/<slug>` · `/glossary` · `/glossary/<term>` · `/blog` · `/blog/<post>` ·
`/methodology` · `/feed.xml` · `/llms.txt` · `/llms-full.txt` · `/tools.json` ·
`/verification.json` · `/search-index.json` · `/sitemap.xml`

Built with **Next.js 16** (App Router), **React 19**, **Tailwind CSS v4**,
TypeScript and MDX. Deployed to Cloudflare Workers via OpenNext — a Worker, not
a static export. 250 routes are prerendered; the remainder are a handful of
on-demand responses (see the deploy note below).

---

## Contents

- [Getting started](#getting-started)
- [Deploying to Cloudflare Workers](#deploying-to-cloudflare-workers)
- [Testing](#testing)
- [Project structure](#project-structure)
- [Editing content](#editing-content)
  - [Adding a tool](#adding-a-tool) · [Staleness](#staleness) · [Sections](#sections) · [Roles](#roles)
  - [Writing an essay](#writing-an-essay) · [Adding a comparison](#adding-a-comparison)
- [Rebranding](#rebranding)
- [Open Graph cards](#open-graph-cards)
- [Search](#search)
- [Design system](#design-system)
- [Accessibility](#accessibility)
- [Build-time guards](#build-time-guards)
- [Agents and answer engines](#agents-and-answer-engines)
- [A note on route naming](#a-note-on-route-naming)
- [What this index claims, and does not](#what-this-index-claims-and-does-not)
- [Licence](#licence)
- [Design provenance](#design-provenance)
- [Related documents](#related-documents)

---

## Getting started

Requires **Node 22** (what CI pins). MIT licensed — see [Licence](#licence).

```bash
npm install
npm run dev            # http://localhost:3000
npm run build          # next build + the OpenNext adapter
npm start              # serve the production build
npm run next:build     # plain Next build only, no adapter
npm run lint
npm run test           # vitest, 392 unit tests
npm run verify         # generate + lint + test + next build
npm run generate       # rebuild the GitHub awesome-list from the dataset
npm run generate:check # assert public/awesome-lattice.md is in step with the data
npm run indexnow       # push all sitemap URLs to Bing/Yandex/Seznam/Naver after a deploy
npm run og:render      # save every Open Graph card to og-out/ for review
npm run og:check       # assert no card clips or overflows its padding
npm run og:probe       # render one card standalone and report Satori flex-rule offenders
```

> **`npm run build` and `npm start` cannot share a `.next` directory with a running
> `next dev`.** Turbopack writes a dev-mode layout that `next build` refuses to
> clean, which surfaces as `ENOENT: required-server-files.json` from the OpenNext
> bundler rather than anything mentioning the dev server. Stop the dev server
> first; if you have already, delete `.next` and rebuild.

> If port `3000` is occupied, Next falls back to `3001`. Pass an explicit port
> if a *second* project is also running locally: `npm run dev -- -p 4177`.

## Deploying to Cloudflare Workers

This deploys as a **Worker via OpenNext**, not a static export. 250 routes are
prerendered, but `/feed.xml`, `/llms.txt`, `/llms-full.txt` and the section, essay,
comparison and glossary `opengraph-image` routes are server-rendered on demand, so
there has to be something serving them. The tool, alternatives and role cards
*are* prerendered because those routes declare `generateStaticParams`; the others
declare none and render per request. That is a deliberate asymmetry for now, not a
constraint: sections, posts, comparisons and glossary terms are all enumerable at
build time, so adding `generateStaticParams` to those routes would move most of the
remaining cards onto the static path if cold-start latency on a share ever justifies
it.

```bash
npm run deploy     # build -> opennextjs-cloudflare build -> deploy
npm run preview    # build + adapt, then serve locally under workerd
```

| Script | Does |
| --- | --- |
| `npm run build` | Next build, then the OpenNext adapter |
| `npm run next:build` | Plain Next build (`.next`), no adapter |
| `npm run cf:deploy` | Uploads the Worker and its assets |
| `npm run deploy` | `build` then `cf:deploy` |
| `npm run preview` | Build + adapt, then `wrangler dev` on workerd |

### After every deploy: `npm run indexnow`

A new comparison or role page otherwise waits for a crawl that can take weeks on a
young domain. The script reads the **live** sitemap and pushes all 250 URLs to
IndexNow, which fans out to Bing, Yandex, Seznam and Naver in hours. Ownership is
proved by `public/<32-hex>.txt`, whose body is the key; the script finds that file
itself, so rotating the key is delete-one-file-and-add-one-file.

Bing's index backs Copilot and a large share of ChatGPT search. Google does not take
IndexNow — Search Console and the sitemap cover that.

```bash
npm run indexnow             # submit
node scripts/indexnow.mjs --dry-run   # print what would be sent
```

Use the `node` form for a dry run. `npm run indexnow -- --dry` expands to
`--dry-run` under npm, and the script checks both spellings — but the `node` form
cannot be expanded behind your back, so prefer it.

### Do not deploy with `npx wrangler deploy`

That command makes wrangler auto-detect Next.js and then try to bootstrap the
OpenNext adapter **interactively** — installing packages, rewriting
`package.json` scripts, generating `wrangler.jsonc`, and running a migrate step.
In CI that fails, because the migrate step shells out to an `npm install` using
an `--allow-scripts` flag npm no longer accepts for project-scoped installs:

```
npm error code EALLOWSCRIPTS
npm error --allow-scripts is not allowed in project-scoped installs.
```

Committing `wrangler.jsonc` and `open-next.config.ts` is what prevents that
bootstrap from ever running. Set the deploy command in the Cloudflare dashboard
to `npm run deploy` and leave the build command as `npm run build`.

### Config, and why it is minimal

`wrangler.jsonc` deliberately omits three things the stock `@opennextjs/cloudflare`
template wires up:

- **an R2 bucket** for the incremental cache — there is no `revalidate` or ISR
  anywhere, so there is nothing to cache, and requiring a bucket to exist first
  is the most common cause of a failed first deploy;
- **a `WORKER_SELF_REFERENCE` service binding** — only needed once revalidation
  runs through a separate worker;
- **an `IMAGES` binding** — nothing uses `next/image`, so Next's image optimizer
  never runs.

`open-next.config.ts` uses `static-assets-incremental-cache`, which is
documented for apps that do not revalidate and only serve prerendered output.
If ISR is ever introduced, switch to `r2-incremental-cache` and add the
`r2_buckets` binding in the same change.

### esbuild must be a direct dependency

`@opennextjs/cloudflare` imports `esbuild` from its bundler but does not declare
it — it only appears transitively under `@opennextjs/aws` and `wrangler`, from
where it is not resolvable. Without an explicit `esbuild` devDependency the
build fails with:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'esbuild'
  imported from .../@opennextjs/cloudflare/dist/cli/build/bundle-server.js
```

### Install scripts

npm honours the `allowScripts` field in `package.json` and **ignores**
`allow-scripts` in `.npmrc` when both are present. `allowScripts` is therefore
the authoritative allowlist; it covers the native binaries (`sharp`, Tailwind
oxide, the platform SWC packages) plus `esbuild` and `workerd`, which the
OpenNext toolchain needs.

### Branding must be set before a public deploy

`src/lib/site.ts` reads four values from the environment and falls back to
`.invalid` placeholders. `src/lib/brand.test.ts` fails while any is still a
placeholder, so `npm run verify` fails locally until they are set, and CI gates
the check on the `SITE_URL` repository variable:

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_CONTACT_EMAIL=you@your-domain.com
NEXT_PUBLIC_CONTACT_X=https://x.com/yourhandle
NEXT_PUBLIC_COPYRIGHT_HOLDER=Your Name
```

`url` is also `metadataBase`, so a placeholder here puts a non-resolving
`og:url` on every one of the site's share images. It is the root of every
`rel=canonical` and every `og:url`, which is why those two are asserted equal
across all 250 routes in `route-metadata.test.ts`.

A **named author** is optional but worth setting: `NEXT_PUBLIC_AUTHOR_NAME` (and
optionally `NEXT_PUBLIC_AUTHOR_URL`) puts a real byline on every essay and
comparison instead of "Lattice editorial". Every page engines cited in the
positioning audit had a named human on it.

---

## Testing

Unit tests only — they cover the pure data and logic modules, not components. **392
tests across 18 suites**; `src/lib/seo.test.ts` is the largest because it asserts a
generated sentence for every one of the 112 tools rather than sampling.

| Suite | Tests | Covers |
| --- | --- | --- |
| `src/lib/seo.test.ts` | 120 | Every generated answer sentence for all 112 tools, plus `absolute()` |
| `src/lib/data.test.ts` | 42 | Section and tool invariants, layer ordering, controlled facet vocabularies, date staleness, lookups, the alternatives graph |
| `src/lib/search.test.ts` | 29 | Tier ordering, AND semantics, the fuzzy floor, roles in the index, essays and comparisons |
| `src/lib/facets.test.ts` | 27 | Facet semantics — OR within a group, AND across groups, counts from the pool that excludes the group being counted |
| `src/lib/comparisons.test.ts` | 27 | Row/tool counts, every reference resolves, no self-comparison |
| `src/lib/posts.test.ts` | 22 | Frontmatter, date sorting, backlink integrity, coverage per section |
| `src/lib/glossary.test.ts` | 19 | Term metadata, uniqueness, cross-links |
| `src/lib/alternatives.test.ts` | 16 | Substitutes graph, adjacency split, derived verdicts |
| `src/lib/roles.test.ts` | 13 | Role coverage, the two-role cap, distribution, and that no role is a superset of another |
| `src/lib/symptoms.test.ts` | 11 | Symptom checklist integrity |
| `src/lib/jsonld.test.ts` | 11 | Script-injection escaping |
| `src/lib/layer.test.ts` | 11 | Band mapping, clamping, and that the OG card and the site agree on every layer |
| `src/lib/verification.test.ts` | 10 | The staleness receipt matches what the guard enforces |
| `src/lib/route-metadata.test.ts` | 9 | Every one of the 250 routes: canonical present, `og:url` present, the two equal, and share-card coverage |
| `src/lib/llms.test.ts` | 8 | `/llms.txt` and `/llms-full.txt` carry the decision pair and the role section |
| `src/lib/dataset.test.ts` | 6 | The agent-facing JSON document, including that every role id resolves inline |
| `src/lib/search-entries.test.ts` | 6 | Index shape survives a JSON round trip and still ranks |
| `src/lib/brand.test.ts` | 5 | No placeholder domain, contact or over-long description |

Three of these deserve their own note, because they guard the class of bug this
repo actually produced rather than the one it was designed against.

**`route-metadata.test.ts` exists because `og:url` and `rel=canonical` disagreed.**
Next does not derive `og:url` from `alternates.canonical` — set it once in the root
layout and every route inherits the *home page's* URL, set nothing and the tag
vanishes. Four pages (`/all`, `/blog`, `/glossary`, `/roles`) shipped a canonical of
their own next to an `og:url` of the site root: two tags for the same resource making
contradictory claims. Nothing caught it, because nothing compared them. Now every
route passes its own path to `absolute()` in `lib/seo.ts`, and this suite asserts the
two agree across all 250.

It also asserts **share-card coverage, both ways**: every segment listed below has
an `opengraph-image.tsx`, and no card file exists outside that list. That check
exists because five segments had no card and were silently inheriting the root one,
which rendered *the wrong image* rather than none. See
[Open Graph cards](#open-graph-cards).

**`facets.test.ts` exists because the facet logic was untestable in place.**
`tool-explorer.tsx` is `"use client"` and vitest runs in a node environment, so
logic inside it could not be exercised without a DOM. The filtering was extracted to
`src/lib/facets.ts` as pure functions and covered by 27 tests, several against the
real 112-row dataset. See [Search](#search).

**`llms.test.ts` exists because the agent-facing documents drift silently.** They are
generated from the same dataset as the UI, so a field added to a tool that only
reaches the HTML leaves every agent-facing copy behind — and the pages still render
correctly, so nothing else notices.

`posts.ts` imports the MDX essays, so `vitest.config.mts` runs them through
`@mdx-js/rollup` — without that, Vite parses `.mdx` as plain JS and every suite
touching posts fails to collect.

CI (`.github/workflows/ci.yml`, Node 22) runs `npm ci`, `lint`, `test`, `build`,
then starts the built server and requests a sample of routes — see the routing
note below for why that last step exists.

---

## Project structure

```
src/
  app/
    layout.tsx              Root shell: fonts, metadata, search provider, chrome
    page.tsx                Home — hero + stack diagram + the full index
    not-found.tsx           404, with the section list as recovery
    [slug]/page.tsx         Section page, prerendered via generateStaticParams
    [slug]/opengraph-image  Cover image per section (generated PNG)
    [slug]/[tool]/page.tsx  One page per tool (112 of them)
    [slug]/[tool]/alternatives/  Alternatives page + per-page cover image
    all/page.tsx            Whole index in one filterable list
    roles/page.tsx          Specialisation index — five ways in by job
    roles/[role]/page.tsx   One role's tools, grouped by section
    fix/page.tsx            Symptom index, grouped by band
    fix/[slug]/             Ordered checklist through the stack for one symptom
    glossary/page.tsx       Term index
    glossary/[slug]/        One term: definition, then what it implies
    blog/page.tsx           Essay index
    blog/[slug]/            Essay page + per-essay cover image
    compare/page.tsx        Comparison index, split across-layers vs substitutes
    compare/[slug]/         Comparison table, recommendation, backlinks
    methodology/page.tsx    How entries are chosen and checked, and where this is wrong
    opengraph-image.tsx     Home cover image: the stack drawn as a section elevation
    favicon.ico, icon.svg,  The mark, pixel-snapped per size
    apple-icon.png          (regenerate with `npm run icons:render`)
    feed.xml/route.ts       RSS of the essays
    sitemap.ts              Every indexable route, 250 URLs
    robots.ts               Allow answer engines, block training crawlers
    llms.txt/route.ts       Plain-text table of contents, task-keyed
    llms-full.txt/route.ts  The whole index as one document, with a role section
    tools.json/route.ts     The index as JSON for coding agents, CORS-open
    verification.json/      Public receipt for the staleness guard
    search-index.json/      The palette corpus, fetched on first open
  components/
    stack-diagram.tsx       Hero: nine bands sized by tool count
    stack-spine.tsx         Nine-band rail showing where a page sits in the stack
    start-here.tsx          Two-question decision path through the index
    tool-explorer.tsx       Client-side filter; wires lib/facets.ts to the UI
    category-section.tsx    Numbered section block
    tool-row.tsx            One tool: layer swatch, name, host
    glossary-list.tsx       Term list with definition and implication
    diagrams/
      flow-diagram.tsx      Spec-driven SVG renderer (theme-aware)
      index.tsx             The named figures used in essays
    search-provider.tsx     Cmd/Ctrl-K palette with ranked matching
    site-header.tsx         Sticky bar
    site-nav.tsx            Top-level links + mobile drawer
    site-footer.tsx
    theme-toggle.tsx        Also exports the pre-paint theme script
    logo.tsx                The mark (L on a 3x3 lattice) + wordmark
  content/blog/*.mdx        11 essay bodies + frontmatter
  lib/
    data.ts                 Link-bearing dataset: sections, tools, URLs, blurbs
    attributes.ts           Classification facts keyed by tool name + AS_OF
    comparisons.ts          Head-to-head comparisons, resolved against data
    posts.ts                Essay registry, cross-links, backlink guard
    search.ts               Ranking: buildIndex + searchTools, shared by all kinds
    facets.ts               Facet filtering, as pure functions (see Search)
    layer.ts                Stack-depth → colour mapping
    roles.ts                The specialisation axis: vocabulary, copy, helpers
    dataset.ts              The whole index as one JSON document for agents
    og.tsx                  Open Graph card (Satori-safe subset of CSS)
    jsonld.ts               Structured data helpers
    site.ts                 All placeholder branding and copy
    types.ts
    *.test.ts               Vitest suites, alongside the modules they cover
```

---

## Editing content

### Adding a tool

Adding a tool is a **two-file** edit. `data.ts` holds what a link *is*;
`attributes.ts` holds what it *is*. They are kept apart on purpose and asserted
against each other at build time.

**1. Add the classification to `src/lib/attributes.ts`, keyed by display name:**

```ts
"MyTool": {
  kind: "runtime",            // ToolKind
  roles: ["serving"],          // Role[] — one, or two where both are true
  deployment: "self-hosted",  // Deployment | null
  license: "Apache-2.0",      // SPDX id, "proprietary", or null
  language: "Rust",
  cost: "free",
  useWhen: "You control the hardware and want …",
  skipWhen: "You would rather rent capacity than …",
  alternatives: ["OtherTool"], // optional, resolved against the dataset
},
```

`roles` is **required and not optional** — omitting it fails the build, because a
tool with no role is invisible on `/roles` and the facet silently under-reports.

**2. Add the link to `src/lib/data.ts`:**

```ts
t("MyTool", "mytool.dev", "One-line factual summary of what it is.")
//     name      host       blurb
```

Three arguments, not four — there is no `tag` field. Classification moved to
`attributes.ts` so a wrong licence can be corrected without touching prose, and
a URL can be corrected without touching a classification.

`host` is a full path where a bare domain would be wrong — GitHub entries need
`owner/repo`, otherwise they all resolve to the site homepage. Every `https://`
URL is checked against a valid origin by `data.test.ts`.

**Adding a tool without an attributes entry throws at module load**, which fails
the build. That is intentional: the reverse case is equally caught by
`assertCoverage`, so a tool can never appear without classification or
classification exist without a tool.

### Staleness

`AS_OF` in `attributes.ts` is when licence and cost were last checked. `data.ts`
throws if any tool's `asOf` is more than `STALE_AFTER_MONTHS` (currently 6) old,
so a stale-but-confident figure fails the build instead of quietly misleading.
When you refresh those facts, bump `AS_OF`. **With `AS_OF = "2026-09"` this
guard starts failing around March 2027** — plan the refresh, or expect the build
to break and know why.

### Sections

Adding a section means adding an object with `index`, `slug`, `title`, `short`,
`description`, `responsibility`, `layer`, `role` and `tools`. `short` is the
compact label used in the footer, the 404 page, tool pages and search results —
the header does not list layers, because the stack diagram on the index is the
layer navigator. The sitemap, `llms.txt`, cover images and search index all
derive from the dataset automatically.

Only `kind: "reading"` tools may omit deployment and licence.

### Roles

Every tool also carries `roles` — the specialisation it belongs to, as one or
two ids from `src/lib/roles.ts`:

```ts
roles: ["platform"],        // what a platform engineer owns
roles: ["data", "applied"], // genuinely both
```

This is a **second axis, not a replacement for `layer`**. The layer ramp answers
*where a tool sits*; roles answer *who needs it*. They correlate but are not the
same question — a platform engineer owns routing (layer 2), orchestration
(layer 6) *and* the evals that prove the whole thing works (layer 9), so roles cut
across the ramp deliberately. Collapsing them would hide exactly the cross-layer
tools worth surfacing.

Assign a role by what the tool is **for**, not by who vendors it. The rules
enforced at build time and in `roles.test.ts`:

- at least one role, or the tool is invisible on `/roles`;
- **at most two** — three means nobody is accountable for it, and an uncapped
  axis decays into a synonym for "popular";
- every id must exist in `ROLES`;
- no role may be empty, or a strict superset of another.

Both build-time guards read the vocabulary from `ROLES` rather than restating it.
A hardcoded copy of the five ids was harmless-looking and not: adding a sixth role
would have left the validator at five, so every tool tagged with the new role failed
the build as "unknown", and the emptiness check would have silently stopped
covering it. Adding a role is a one-file change.

**Why five, and why not seniority.** Job titles were the obvious framing and they do
not work: a Principal and a Staff engineer need the *same* tools, so every entry
would carry the same value on that axis and the facet would filter to nothing while
appearing to work. Seniority changes who decides and what the bar is, not which parts
of the stack you own. The useful axis is the specialisation inside the title.

Five is chosen so nothing is a remainder. Four merges AI Infrastructure into ML
Platform — the distinction a serving engineer cares about most. Six splits Applied
from Agents, but very few tools are one without the other.

**The counts do not sum to 112, and that is correct.** Platform 24, infra 18, data
23, applied 46, production 25. An eval framework genuinely belongs to a platform
engineer *and* an applied engineer, and forcing one value would hide it from one of
them. `applied` is the widest bucket by construction — agent frameworks, fine-tuning,
prompt work and the reading material that goes with all three — and
`roles.test.ts` asserts that ordering is deliberate rather than drift.

Roles feed `/roles`, `/roles/<id>`, the `/all` facet row, the search palette's
`roleWord` tier, `tools.json`, `llms-full.txt` and `llms.txt` — all derived, so a new
role needs no second edit.

### Writing an essay

1. Add `src/content/blog/<slug>.mdx` exporting a `meta` object:

   ```js
   export const meta = {
     slug: "my-post",
     title: "…",
     description: "…",   // meta description + og:description
     dek: "…",            // standfirst
     date: "2026-09-30",
     readingTime: "7 min",
     layers: [3],         // stack layers the post speaks to
     sections: ["retrieval-vector-stores"],
     related: ["other-post-slug"],
   };
   ```

2. Register it in `src/lib/posts.ts` (explicit, not globbed — a new post should
   require deciding where it belongs).
3. Link the related slugs in each referenced post's `related` array, otherwise
   the "Read next" block will be empty.

Figures are available in MDX without importing: `<RequestPath />`,
`<RagPipeline />`, `<AgentLoop />`, `<EvalFlywheel />`, `<PromptVsTune />`.
They are PascalCase deliberately — MDX will silently emit `<requestPath>` as an
unknown HTML tag if it cannot resolve a lowercase name.

### Adding a comparison

Comparisons live in `src/lib/comparisons.ts` and are deliberately narrow: they
cover tools that are genuine substitutes for one another, and each ends in a
recommendation rather than a feature grid.

```ts
{
  slug: "my-comparison",
  title: "A vs B vs C",
  description: "…",        // meta description
  intro: "…",              // framing at the top of the page
  tools: [{ name: "vLLM", angle: "The default." }, …],
  rows: [{ dimension: "Best for", values: ["…", "…", "…"] }, …],
  verdict: "…",            // the actual recommendation
  rules: ["…"],            // rules of thumb
  sections: ["inference-serving"],
  related: ["choosing-an-inference-runtime"],
}
```

Tools are referenced **by name** and resolved against `data.ts` at build time,
so a comparison cannot drift from the index or link to something that moved.

---

## Rebranding

All placeholder branding is in **`src/lib/site.ts`**: wordmark, URL, title
template, description, tagline, copyright holder and contact.

The mark is defined once, as `MARK_CELLS` in `src/components/logo.tsx`: five
inked cells spelling an L on a 3x3 lattice, the corner joint in the accent, the
four unused cells left as registration dots. Every rendering derives from it —
the header and footer wordmark, the masthead glyph on every share card
(`src/lib/og.tsx`, where the joint takes the band tint), and the favicon, SVG
icon and Apple touch icon (`scripts/render-icons.mjs`, which redraws it
pixel-snapped per size; run `npm run icons:render` after changing the mark).
Do not reintroduce a separate logo file.

Two palettes must be kept in step by hand, because Satori does not read CSS
custom properties:

- `src/app/globals.css` — the live site
- `src/lib/og.tsx` — the generated cover images

The card is **dark-only** and inlines the `.dark` values as hex literals, so a
change to the light theme does not touch it and a change to the dark one does.
The `oklch()` layer tokens are converted by hand; re-derive them rather than
eyeballing, or the badge dot stops matching the section it is badging.

---

## Open Graph cards

Every indexable route declares a share image. `scripts/render-og.mjs` collects
them all to `og-out/` by reading the `og:image` each page actually declares — so a
card that renders but is never referenced, or a page that references a card it does
not have, both show up in the summary. Current state: **250/250**, mean 70 KB.

| Route | Card |
| --- | --- |
| `/` | Home — `OgHomeCard`: the nine layers as a section elevation with band brackets, drawn from `stackLayers` |
| `/<section>` | Section |
| `/<section>/<tool>` | Tool |
| `/<section>/<tool>/alternatives` | Alternatives |
| `/compare`, `/compare/<slug>` | Comparison index, head-to-head |
| `/blog`, `/blog/<post>` | Essay index, essay |
| `/fix`, `/fix/<symptom>` | Symptom index, symptom checklist |
| `/glossary`, `/glossary/<term>` | Glossary index, term |
| `/roles`, `/roles/<role>` | Role index, one specialisation |
| `/all` | Whole index |
| `/methodology` | Method |

That table is the complete set, and `route-metadata.test.ts` enforces it in both
directions: every listed route has a card file, and no card exists off-list. Adding
a card means adding a row.

**Why that guard exists.** Five segments originally had no `opengraph-image.tsx` and
relied on inheriting the root one, which is why `/all`, `/blog`, `/glossary`,
`/methodology` and `/roles` all shared the home page's og:image. Removing
`openGraph.title` from the layout — to stop every top-level page shipping the home
page's og:title — also dropped that inheritance, and those five went from *a wrong
card* to *no card at all*, rendering as a bare `twitter:summary` text link.

Worse, none of the usual checks noticed: a missing card is not a type error, not a
metadata field, and does not fail a build.

Two cards use `variant="plain"` on purpose: `/all` and `/roles` are the two views
that refuse to sort by depth, so drawing a strata rail on them would contradict the
page's own premise.

```bash
npm run build && npx next start -p 3200
npm run og:render -- --base http://localhost:3200
npm run og:check
```

Point it at a production server, not dev: in dev every card pays a Turbopack
compile first, and a stale dev bundle will hand back a card the production
build would not.

### Fonts

The card embeds **three** Latin-subset faces from `assets/og/` — Plex Serif 500
for the title, Plex Sans 600 for the subtitle and the use/skip valve, Plex Mono
500 for every label — read once at module scope. Satori enforces a **500 KB
per-route bundle ceiling that counts embedded fonts**, and the full static TTFs
come to ~600 KB between them, so subsetting is the only reason they fit at all:
they land at 71 KB, 65 KB and 51 KB, ~187 KB total. A fourth face is a budget
decision, not a free choice.

Regenerate after an upstream Plex release (`scripts/fetch-og-fonts.ps1` downloads
the release zips; `scripts/subset-og-fonts.py` does the subsetting):

```bash
python scripts/subset-og-fonts.py <dir containing the source TTFs>
```

### Satori's rules, and the three that bite

1. **Any `<div>` whose children are not a plain string must declare
   `display: flex`.** Not "more than one child" — a `<div>` wrapping a single
   component is just as fatal, and it throws without saying which node. This is
   why every wrapper on the card is a flex row. `npm run og:probe` walks the
   element tree and reports offenders before Satori does, because otherwise each
   attempt costs a dev-server reload.
2. **No `lineClamp`, no `text-overflow`.** A long title grows the card past
   630px and is clipped by the frame rather than throwing, so every string is
   truncated in JS by `clamp` in `og.tsx`.
3. **Satori does not reliably wrap text in a flex item.** A sentence in a flex
   row is measured at max-content and runs past the card instead of wrapping,
   and giving the element `maxWidth` or even an explicit `width` does not always
   force the reflow. That is why the use/skip valve pre-wraps in JS
   (`wrapLines` / `VALVE_CHARS_PER_LINE`) rather than trusting the layout engine.
   `VALVE_CHARS_PER_LINE` is measured against the real font, not guessed.

`npm run og:check` measures the ink bounding box of every rendered card
against the padding box, which is how a clipped subtitle or an overflowing
sentence gets caught without opening 250 images. It is the only check in the
repo that catches this class of bug, because none of these failures throw.

---

## Search

`⌘K` / `Ctrl-K` opens a palette backed by `src/lib/search.ts`. The index covers
**tools, essays and comparisons** — a query for "evals" returns the essay that
argues the point alongside the tools that implement it, because excluding the
essays hid the best answer on the site.

Every hit has an internal `href`, so the palette never navigates the reader off
site. A tool's own site is a secondary control on the row rather than the
primary target.

Ranking is tiered (`exactName` > `namePrefix` > `nameWordPrefix` > `blurbPhrase`
> … > `fuzzy`), so a tool literally named "TensorRT-LLM" outranks one that
merely mentions LLMs in its description. Two details that matter more than they
look:

- **The blurb is substring-matched.** An earlier scorer fell through to a loose
  subsequence scan instead, so a query for "rag" missed the one tool whose
  description literally contained "RAG" and returned seven irrelevant results
  for "vllm".
- **Multi-word queries are ANDed**, so "open source" finds "Open-source
  tracing…" even though the literal phrase spans a hyphen.

The fuzzy fallback sits an order of magnitude below every real match and requires
matched characters to land within `len × 2` of each other, so it can never
outrank intent. It is also gated off below three characters, which is why
single-letter queries return name-prefix matches instead of noise.

**Roles get their own tier, and it is above the fuzzy floor on purpose.** A role is a
declared field rather than incidental prose, so it should not depend on the fuzzy
scan finding scattered letters — the span gate rejects most blurbs for a query like
"platform". `roleWord` matches on a word prefix of a role display name, which is what
makes "infra" find AI Infrastructure while "prod" does not silently match Production
& Governance. It still sits below every phrase match, so typing "data" does not
drown real name and blurb hits in role matches.

### Facets on `/all`

`ToolExplorer` filters the same dataset client-side with facet counts — the whole
index is a few kilobytes, so there is no round trip per keystroke. Past a few
hundred entries that should move to a server-side search index.

**Role** is the first facet row, ahead of deployment, kind and cost, because it
is the only axis that describes the reader rather than the tool. It is also the
one multi-valued facet: a tool tagged for two roles appears under both and
matches *either* selection, so "Platform OR Infra" behaves as OR-within the
group while the groups still AND together. The other three groups are
single-valued and reduce to one `Set.has`.

The filtering itself lives in **`src/lib/facets.ts`, not in the component**.
`tool-explorer.tsx` is `"use client"` and vitest runs in a node environment, so
logic inside it cannot be tested without a DOM — and untestable-in-place is the
same as untested. The module is pure functions taking the whole selection at
once; the component keeps only the `useMemo` wiring and the markup. Two
behaviours are worth knowing when reading either file:

- **counts come from the pool that excludes the group being counted.** Counting
  a group from a pool that already includes its own selection makes every option
  show the same number, which renders as a plausible set of chips and is the
  classic faceted-search bug;
- **roles are exploded across that pool**, so a two-role tool is counted under
  both and the five role counts sum to more than the tool count. That is the
  same overlap `/roles` states in prose, and `facets.test.ts` pins it.

Role display names are flattened onto each tool in `allToolEntries`, not looked
up client-side, so the string the reader types against is the string on screen.
`data.ts` already carries a field called `role` — that is a *section's* stack
role (`layer` / `crosscutting` / `offstack`) and predates this axis. They are
unrelated and both names are live in the codebase.

---

## Design system

Tokens are CSS custom properties in `src/app/globals.css`, exposed to Tailwind
through `@theme inline`. Light and dark are a matched pair.

The **layer ramp** (`--layer-1` … `--layer-9`) runs gold at the substrate to
indigo at the surface. It is the site's main identity device: the same colour
identifies a section in the hero diagram, the section rule, each tool row, the
search palette, and the essay's accent. `src/lib/layer.ts` maps a depth number
to `var(--layer-N)`, and `globals.css` defines exactly nine stops, so adding a
tenth layer requires touching both.

The active theme is a class on `<html>`, applied before first paint by an inline
script so there is no flash and no hydration mismatch. The toggle deliberately
holds no React state.

---

## Accessibility

- The header carries the top-level sections; the stack diagram on the index is the
  layer navigator, and a mobile drawer covers small screens.
- The search palette traps scroll, restores focus on open, and supports
  arrow/enter/escape.
- `prefers-reduced-motion` disables smooth scrolling and transitions.
- JSON-LD is escaped for `<`, `>` and `&` before injection.

---

## Build-time guards

Several mistakes are not type errors and would otherwise ship silently. Each is
caught by a throw during module load, so the build fails:

| Guard | Catches |
| --- | --- |
| `data.ts` | A tool with no entry in `attributes.ts` |
| `data.ts` | Duplicate tool slug within a section; duplicate section ordinal |
| `data.ts` | An `alternative` that names a tool which does not exist |
| `data.ts` | A non-reading tool with no deployment, or with no licence |
| `data.ts` | Licence/cost data older than the staleness window |
| `data.ts` | A tool with no roles, more than two, an unknown role id, or a repeated one |
| `data.ts` | A role in the vocabulary that no tool carries |
| `data.ts` | A comparison naming a tool that is not in the dataset |
| `comparisons.ts` | Row value count ≠ tool count; unknown section slug |
| `posts.ts` | A `related` slug that does not resolve to a post |

And four that are **not** module-load throws, because they are cross-route or
copy-shaped rather than dataset-shaped, and would otherwise ship silently:

| Guard | Catches |
| --- | --- |
| `route-metadata.test.ts` | A route with no canonical, no `og:url`, or two that disagree |
| `route-metadata.test.ts` | An indexable route family that stopped being generated |
| `route-metadata.test.ts` | A route with no share card, or a card on a route with none |
| `llms.test.ts` | An agent-facing document that lost the use/skip pair or the role section |
| `dataset.test.ts` | `tools.json` carrying a role id its own vocabulary does not define |

---

## Agents and answer engines

Four machine-readable surfaces, all generated from the same dataset as the UI so
they cannot claim a different freshness than the pages do:

| Surface | What it is |
| --- | --- |
| `/tools.json` | The whole index as JSON. CORS-open. Per tool: layer, band, roles, kind, deployment, licence, cost, use/skip, canonical URL |
| `/llms.txt` | Plain-text table of contents, **task-keyed** rather than taxonomy-keyed — an agent arriving here has a problem, not a browsing intent |
| `/llms-full.txt` | Everything in one document: every tool's decision pair, every comparison table, every glossary term, plus a `## By role` section |
| `/verification.json` | The public receipt for the staleness guard: rule, build date, per-entry check and expiry |

`/tools.json` resolves the role vocabulary **inline** rather than linking to it. An
agent that has to fetch a second document to learn what "applied" means will not
fetch it, so the vocabulary ships in the same file as the ids that use it.

`robots.txt` splits the crawlers deliberately: answer engines (OAI-SearchBot,
ChatGPT-User, PerplexityBot, Claude-SearchBot, Google-Extended, DuckAssistBot,
MistralAI-User) are allowed, training crawlers (GPTBot, ClaudeBot, CCBot,
Bytespider, meta-externalagent, Amazonbot, Diffbot) are not. Google-Extended is
allowed as a trade — it controls Gemini grounding *and* Gemini training, and blocking
it was costing Gemini citations.

---

## A note on route naming

`app/[slug]/[tool]` reuses the `slug` param name from `app/[slug]`. Next.js
requires one name per dynamic position at a given depth, so renaming the first
segment of the tool route to `category` is not an option. Static routes (`/all`,
`/blog`, `/compare`) take precedence over these dynamic segments and do not
conflict.

The trap is that this class of mistake **builds cleanly**. `next build` passing
is therefore not sufficient verification here — run `npm start` and hit a tool
page. The current tree has been checked this way: `/inference-serving/vllm`,
`/retrieval-vector-stores/qdrant`, `/workflow-orchestration/temporal`,
`/roles/data` and `/roles/nonsense` return `200`, `200`, `200`, `200` and `404`
respectively, with **zero** `5xx` responses.

`/roles/<role>` sits under a static `/roles`, alongside the dynamic `app/[slug]` that
claims every other single segment — same precedence rule as `/all`, `/blog`,
`/compare`, `/fix`, `/glossary` and `/methodology`, and the same reason it is worth
checking rather than assuming.

---

## What this index claims, and does not

Two claims are load-bearing enough to state plainly, because they are enforced by
the build rather than asserted in prose:

1. **Every entry carries a use-when and a skip-when.** The second is the one that
   matters. A directory that only tells you when to use something has no reason to
   tell you the truth about anything else.
2. **The build fails when the data goes stale.** If any entry's licence, cost or
   deployment was last confirmed more than six months ago, the build throws and the
   site does not deploy. `AS_OF` in `attributes.ts` is that date, and
   `/verification.json` is the public receipt.

**Where it is wrong** is published at `/methodology`, in a section of its own — layer
coverage is uneven by construction, the layer model is a simplification, freshness is
not accuracy, and role assignments are judgement calls whose counts deliberately do
not sum to 112. Stating the weaknesses is not hedging; it is the thing that makes the
rest of the page worth believing.

---

## Licence

**MIT** — see [`LICENSE`](./LICENSE).

The licence covers this repository: the source, the copy, the essays, the
diagrams, the branding and the logo, and the dataset as compiled — the layer
assignments, the use/skip sentences, the role tags and the section copy.

It does **not** relicense anything the index points at. Each tool's own licence
is recorded in `src/lib/attributes.ts` and shown on its page, because that fact
is the point: 41 Apache-2.0, 31 proprietary, 22 MIT, plus BSD-3-Clause, MPL-2.0,
PostgreSQL, BSL-1.1, Elastic-2.0 and Llama-3.1-Community. Those are facts *about*
third-party software, not grants *from* this project, and the MIT licence here
grants nothing over any of them. Third-party names and logos remain the property
of their owners, used to identify the software being described.

`public/awesome-lattice.md` is generated from that dataset and carries the same
MIT terms.

## Design provenance

The layout language — a stack-ordered index, hairline-separated rows, counts in
the density meter, a Cmd-K palette, a minimal footer — follows conventions common
to curated directories in this space. All copy, the dataset, the essays, the
diagrams, the branding and the logo are original to this project and covered by
the [MIT licence](#licence). No content, assets or text were taken from any
existing site.

---

## Related documents

Strategy and positioning live outside this repo, one directory up:

| Document | What it is |
| --- | --- |
| `../strategy/01-competitive-landscape.md` | 30+ competitors verified by direct fetch, split into three tiers. Which claims are commoditised and which are genuinely open |
| `../strategy/02-unique-selling-points.md` | Six ranked USPs with proof each is open, and an explicit list of claims to **stop** making |
| `../strategy/03-launch-and-citation-plan.md` | Blockers first, then the launch sequence, the role axis as a distribution surface, and a 20-query monthly citation log |
| `../strategy/moodboard.html` | The visual direction, built in the direction it describes. Open in a browser |
| `../gtm/` | The executable off-site half: checklist status, citation-tracker template, and promo angle scaffolds for newsletter / HN / Reddit |