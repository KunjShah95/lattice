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
npm run test       # vitest, 134 unit tests
npm run verify     # lint + test + build
```

> If port `3000` is occupied, Next falls back to `3001`. Pass an explicit port
> if a *second* project is also running locally: `npm run dev -- -p 4177`.

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