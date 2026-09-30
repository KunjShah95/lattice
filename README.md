# Lattice

A curated index of the infrastructure behind working AI systems — **112 tools
across 10 sections**, plus **6 essays** on the architectural decisions behind
them.

Sections are ordered as a production stack: layer 1 is the substrate everything
else runs on, layer 9 is the surface you look at. Off-stack material (reading,
courses) sits deliberately outside the stack.

Built with **Next.js 16** (App Router), **React 19**, **Tailwind CSS v4**,
TypeScript and MDX. Every route is prerendered at build time.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm start          # serve the production build
npm run lint
```

> If port `3000` is occupied, Next falls back to `3001`.

## Project structure

```
src/
  app/
    layout.tsx              Root shell: fonts, metadata, search provider, chrome
    page.tsx                Home — hero + stack diagram + the full index
    [slug]/page.tsx         Section page, prerendered via generateStaticParams
    [slug]/opengraph-image  Cover image per section (generated PNG)
    blog/page.tsx           Essay index
    blog/[slug]/            Essay page + per-essay cover image
    opengraph-image.tsx     Home cover image
    sitemap.ts              Sections + essays
    robots.ts
    llms.txt/route.ts       Plain-text index, generated from the same data
  components/
    stack-diagram.tsx       Hero: nine bands sized by tool count
    category-section.tsx    Numbered section block
    tool-row.tsx            One tool: layer swatch, name, tag, host
    diagrams/
      flow-diagram.tsx      Spec-driven SVG renderer (theme-aware)
      index.tsx             The named figures used in essays
    search-provider.tsx     Cmd/Ctrl-K palette with ranked matching
    site-header.tsx         Sticky nav that doubles as a depth indicator
    site-footer.tsx
    theme-toggle.tsx        Also exports the pre-paint theme script
    logo.tsx
  content/blog/*.mdx        Essay bodies + frontmatter
  lib/
    data.ts                 The dataset — sections and tools
    posts.ts                Essay registry and cross-link helpers
    layer.ts                Stack-depth → colour mapping
    og.tsx                  Open Graph card (Satori-safe subset of CSS)
    jsonld.ts               Structured data helpers
    site.ts                 All placeholder branding and copy
    types.ts
```

## Editing content

**`src/lib/data.ts` is the only file you need for the index.** Tools are
compact tuples:

```ts
t("vLLM", "vllm.ai", "Serving", "Paged-attention inference engine.")
//     name    host        tag       description
```

`host` is a full path where a bare domain would be wrong — GitHub entries need
`owner/repo`. A build-time guard throws on duplicate tool slugs within a
section and on duplicate section ordinals, so neither can slip through
silently.

Adding a section means adding an object with `index`, `slug`, `title`, `short`
(used in the nav), `description`, `responsibility`, `layer`, `role` and `tools`.
The sitemap, `llms.txt`, footer, header, cover image and search index all
derive from that file automatically.

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

## Rebranding

All placeholder branding is in **`src/lib/site.ts`**: wordmark, URL, title
template, description, tagline, copyright holder and contact. The logo glyph is
in `src/components/logo.tsx`.

Two palettes must be kept in step by hand, because Satori does not read CSS
custom properties:

- `src/app/globals.css` — the live site
- `src/lib/og.tsx` — the generated cover images

## Design system

Tokens are CSS custom properties in `src/app/globals.css`, exposed to Tailwind
through `@theme inline`. Light and dark are a matched pair.

The **layer ramp** (`--layer-1` … `--layer-9`) runs gold at the substrate to
indigo at the surface. It is the site's main identity device: the same colour
identifies a section in the hero diagram, the header nav, the section rule, each
tool row, the search palette, and the essay's accent. `src/lib/layer.ts` maps a
depth number to `var(--layer-N)`, and `src/app/globals.css` defines exactly
nine stops, so adding a tenth layer requires touching both.

The active theme is a class on `<html>`, applied before first paint by an inline
script so there is no flash and no hydration mismatch. The toggle deliberately
holds no React state.

## Accessibility and robustness

- Nav counts drop out below `xl` rather than clipping; the layer rule carries
  identity without them.
- The search palette traps scroll, restores focus on open, and supports
  arrow/enter/escape.
- `prefers-reduced-motion` disables smooth scrolling and transitions.
- JSON-LD is escaped for `<`, `>` and `&` before injection.

## Design provenance

The layout language — a stack-ordered index, hairline-separated rows, counts in
the nav, a Cmd-K palette, a minimal footer — follows conventions common to
curated directories in this space. All copy, the dataset, the essays, the
diagrams, the branding and the logo are original to this project. No content,
assets or text were taken from any existing site.
