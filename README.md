# Lattice

A curated index of the infrastructure behind working AI systems — **112 tools
across 10 sections**, **112 per-tool pages**, **6 head-to-head comparisons**, and
**11 essays** on the architectural decisions behind them.

Sections are ordered as a production stack: layer 1 is the substrate everything
else runs on, layer 9 is the surface you look at. Off-stack material (reading,
courses) sits deliberately outside the stack.

Routes: `/` index · `/all` filterable list · `/<section>` · `/<section>/<tool>` ·
`/compare` · `/compare/<slug>` · `/blog` · `/blog/<post>` · `/feed.xml` ·
`/llms.txt` · `/sitemap.xml`

Built with **Next.js 16** (App Router), **React 19**, **Tailwind CSS v4**,
TypeScript and MDX. Every route is prerendered at build time — 152 pages.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm start          # serve the production build
npm run lint
npm run test       # vitest, 291 unit tests
npm run verify     # lint + test + build
npm run og:render  # save every Open Graph card to og-out/ for review
npm run og:check   # assert no card clips or overflows its padding
```

> If port `3000` is occupied, Next falls back to `3001`. Pass an explicit port
> if a *second* project is also running locally: `npm run dev -- -p 4177`.

## Deploying to Cloudflare Workers

This deploys as a **Worker via OpenNext**, not a static export. Most of the site
is prerendered, but `/feed.xml`, `/llms.txt` and four of the seven
`opengraph-image` routes — the section, essay, comparison and glossary ones —
are server-rendered on demand, so there has to be something serving them. The
tool and alternatives cards *are* prerendered because those two routes declare
`generateStaticParams`; the other four declare none and render per request.
That is a deliberate asymmetry for now, not a constraint: categories, posts,
comparisons and glossary terms are all enumerable at build time, so adding
`generateStaticParams` to those four would move ~180 cards onto the static
path if cold-start latency on a share ever justifies it.

```bash
npm run deploy     # next build -> opennextjs-cloudflare build -> deploy
npm run preview    # build + adapt, then serve locally under workerd
```

| Script | Does |
| --- | --- |
| `npm run build` | Plain Next build (`.next`) |
| `npm run cf:build` | Adapts `.next` to `.open-next/` and emits `worker.js` |
| `npm run cf:deploy` | Uploads the Worker and its assets |
| `npm run deploy` | All three, in order |
| `npm run preview` | Build + adapt, then `wrangler dev` on workerd |

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
`og:url` on every one of the site's share images.

## Testing

Unit tests only — they cover the pure data and logic modules, not components.
Six suites, 134 tests.

| Suite | Tests | Covers |
| --- | --- | --- |
| `src/lib/data.test.ts` | 42 | Section and tool invariants, layer ordering, controlled facet vocabularies, date staleness, lookups, the alternatives graph |
| `src/lib/search.test.ts` | 26 | Tier ordering, AND semantics, the fuzzy floor, essays and comparisons in the index |
| `src/lib/posts.test.ts` | 22 | Frontmatter, date sorting, backlink integrity, coverage per section |
| `src/lib/comparisons.test.ts` | 17 | Row/tool counts, every reference resolves, no self-comparison |
| `src/lib/layer.test.ts` | 16 | Ramp mapping, clamping, and that the ramp is sized to the dataset |
| `src/lib/jsonld.test.ts` | 11 | Script-injection escaping |

`posts.ts` imports the MDX essays, so `vitest.config.mts` runs them through
`@mdx-js/rollup` — without that, Vite parses `.mdx` as plain JS and every suite
touching posts fails to collect.

CI (`.github/workflows/ci.yml`, Node 22) runs `npm ci`, `lint`, `test`, `build`,
then starts the built server and requests a sample of routes — see the routing
note below for why that last step exists.

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
    blog/page.tsx           Essay index
    blog/[slug]/            Essay page + per-essay cover image
    compare/page.tsx        Comparison index
    compare/[slug]/         Comparison table, recommendation, backlinks
    opengraph-image.tsx     Home cover image
    feed.xml/route.ts       RSS of the essays
    sitemap.ts              Sections + comparisons + essays + every tool
    robots.ts
    llms.txt/route.ts       Plain-text index, generated from the same data
  components/
    stack-diagram.tsx       Hero: nine bands sized by tool count
    start-here.tsx          Two-question decision path through the index
    tool-explorer.tsx       Client-side filter + section/kind/deployment/cost facets
    category-section.tsx    Numbered section block
    tool-row.tsx            One tool: layer swatch, name, host
    diagrams/
      flow-diagram.tsx      Spec-driven SVG renderer (theme-aware)
      index.tsx             The named figures used in essays
    search-provider.tsx     Cmd/Ctrl-K palette with ranked matching
    site-header.tsx         Sticky bar
    site-nav.tsx            Top-level links + mobile drawer
    site-footer.tsx
    theme-toggle.tsx        Also exports the pre-paint theme script
    logo.tsx
  content/blog/*.mdx        11 essay bodies + frontmatter
  lib/
    data.ts                 Link-bearing dataset: sections, tools, URLs, blurbs
    attributes.ts           Classification facts keyed by tool name + AS_OF
    comparisons.ts          Head-to-head comparisons, resolved against data
    posts.ts                Essay registry, cross-links, backlink guard
    search.ts               Ranking: buildIndex + searchTools, shared by all kinds
    layer.ts                Stack-depth → colour mapping
    og.tsx                  Open Graph card (Satori-safe subset of CSS)
    jsonld.ts               Structured data helpers
    site.ts                 All placeholder branding and copy
    types.ts
    *.test.ts               Vitest suites, alongside the modules they cover
```

## Editing content

Adding a tool is a **two-file** edit. `data.ts` holds what a link *is*;
`attributes.ts` holds what it *is*. They are kept apart on purpose and asserted
against each other at build time.

**1. Add the classification to `src/lib/attributes.ts`, keyed by display name:**

```ts
"MyTool": {
  kind: "runtime",            // ToolKind
  deployment: "self-hosted",  // Deployment | null
  license: "Apache-2.0",      // SPDX id, "proprietary", or null
  language: "Rust",
  cost: "free",
  useWhen: "You control the hardware and want …",
  skipWhen: "You would rather rent capacity than …",
  alternatives: ["OtherTool"], // optional, resolved against the dataset
},
```

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

## Writing an essay

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

## Adding a comparison

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

## Rebranding

All placeholder branding is in **`src/lib/site.ts`**: wordmark, URL, title
template, description, tagline, copyright holder and contact. The logo glyph is
in `src/components/logo.tsx`.

Two palettes must be kept in step by hand, because Satori does not read CSS
custom properties:

- `src/app/globals.css` — the live site
- `src/lib/og.tsx` — the generated cover images

The card is **dark-only** and inlines the `.dark` values as hex literals, so a
change to the light theme does not touch it and a change to the dark one does.
The `oklch()` layer tokens are converted by hand; re-derive them rather than
eyeballing, or the badge dot stops matching the section it is badging.

## Open Graph cards

Every indexable route declares a share image, and `scripts/render-og.mjs`
collects them all to `og-out/` by reading the `og:image` each page actually
declares — so a card that renders but is never referenced, or a page that
references a card it does not have, both show up in the summary.

| Route | Card |
| --- | --- |
| `/` | Home |
| `/<section>` | Section |
| `/<section>/<tool>` | Tool |
| `/<section>/<tool>/alternatives` | Alternatives |
| `/compare`, `/compare/<slug>` | Comparison index, head-to-head |
| `/blog/<post>` | Essay |
| `/glossary/<term>` | Glossary term |

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

Regenerate after an upstream Plex release:

```bash
# from the IBM/plex release zips, then:
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
sentence gets caught without opening 235 images. It is the only check in the
repo that catches this class of bug, because none of these failures throw.

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

`ToolExplorer` on `/all` filters the same dataset client-side with facet
counts — the whole index is a few kilobytes, so there is no round trip per
keystroke. Past a few hundred entries that should move to a real search index.

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

## Accessibility and robustness

- The header carries three top-level links (Index, Compare, Essays); the stack
  diagram on the index is the layer navigator, and a mobile drawer covers small
  screens.
- The search palette traps scroll, restores focus on open, and supports
  arrow/enter/escape.
- `prefers-reduced-motion` disables smooth scrolling and transitions.
- JSON-LD is escaped for `<`, `>` and `&` before injection.

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
| `data.ts` | A comparison naming a tool that is not in the dataset |
| `comparisons.ts` | Row value count ≠ tool count; unknown section slug |
| `posts.ts` | A `related` slug that does not resolve to a post |

## A note on route naming

`app/[slug]/[tool]` reuses the `slug` param name from `app/[slug]`. Next.js
requires one name per dynamic position at a given depth, so renaming the first
segment of the tool route to `category` is not an option. Static routes (`/all`,
`/blog`, `/compare`) take precedence over these dynamic segments and do not
conflict.

The trap is that this class of mistake **builds cleanly**. `next build` passing
is therefore not sufficient verification here — run `npm start` and hit a tool
page. The current tree has been checked this way: 19 routes including
`/inference-serving/vllm`, `/retrieval-vector-stores/qdrant` and
`/workflow-orchestration/temporal` all return `200`, with unknown sections and
unknown tools returning `404` and **zero** `5xx` responses.

## Design provenance

The layout language — a stack-ordered index, hairline-separated rows, counts in
the density meter, a Cmd-K palette, a minimal footer — follows conventions common
to curated directories in this space. All copy, the dataset, the essays, the
diagrams, the branding and the logo are original to this project. No content,
assets or text were taken from any existing site.
