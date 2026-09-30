# Lattice

A curated, opinionated index of the infrastructure behind working AI systems —
73 tools across 10 categories.

Built with **Next.js 16** (App Router), **React 19**, **Tailwind CSS v4** and
TypeScript. Fully static: every category page is prerendered at build time.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm start          # serve the production build
npm run lint
```

> **Note on ports** — if `3000` is occupied, Next will fall back to `3001`.

## Project structure

```
src/
  app/
    layout.tsx          Root shell: fonts, metadata, search provider, header/footer
    page.tsx            Home — hero plus every category inline
    [slug]/page.tsx     Per-category page, prerendered via generateStaticParams
    sitemap.ts          Generated from the category data
    robots.ts
    llms.txt/route.ts   Plain-text index, generated from the same data
  components/
    category-section.tsx  Numbered category block (shared by home + detail)
    tool-row.tsx          One tool: favicon, name, mono tag, description
    search-provider.tsx   ⌘K command palette (context, scoring, keyboard nav)
    site-header.tsx       Sticky nav with live per-category counts
    site-footer.tsx
    theme-toggle.tsx      Also exports the pre-paint theme script
    logo.tsx
  lib/
    data.ts             The dataset — categories and tools
    site.ts             All placeholder branding and copy
    types.ts
```

## Editing content

**`src/lib/data.ts` is the only file you need to touch to change what's listed.**
Categories and tools are defined as compact tuples:

```ts
t("vLLM", "vllm.ai", "Serving", "Paged-attention inference engine.")
//     name    domain      tag       description
```

Adding a category means appending an object with an `index`, `slug`, `title`,
`description` and `tools`. The sitemap, `llms.txt`, footer, header counts and
⌘K search index all derive from this file automatically — nothing else needs
updating.

## Rebranding

All placeholder branding lives in **`src/lib/site.ts`**: the wordmark, URL,
title template, description, tagline, header nav, copyright holder and contact
links. Change those values and the whole site follows. The logo glyph is in
`src/components/logo.tsx`.

## Design system

Tokens are CSS custom properties in `src/app/globals.css`, exposed to Tailwind
through `@theme inline`:

| Token | Role |
| --- | --- |
| `--bg` / `--bg-elevated` / `--bg-sunken` | Three surface levels |
| `--fg` / `--fg-muted` / `--fg-subtle` | Three text levels |
| `--border` / `--border-strong` | Hairlines and emphasis |
| `--accent` | Single accent, used sparingly |

Light and dark are defined as a matched pair. The active theme is a class on
`<html>`, set before first paint by an inline script (`themeInitScript` in
`src/app/theme-toggle.tsx`) so there is no flash and no hydration mismatch.

The theme toggle deliberately holds **no React state** — both icons render and
the `dark` variant picks one. The theme lives in the DOM, not in React.

## Design provenance

The layout language — numbered category sections, counts in the sticky nav,
hairline-separated tool rows, a ⌘K palette, and a minimal footer — was
modelled on the structure of curated directories in this space. All copy,
branding, the dataset and the logo are original to this project. No content,
assets or text were taken from any existing site.
