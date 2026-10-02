/**
 * The search index, assembled from the same data the pages render from.
 *
 * This used to be built inline in the root layout and handed to
 * `<SearchProvider>` as a prop. That put all 129 entries into the RSC payload
 * of *every* route — roughly 42 KB of serialised JSON in the HTML of a page
 * whose own markup might be 16 KB. It was the single largest thing in the
 * document that no reader had asked for yet.
 *
 * It now lives here so two consumers can share one definition: the
 * `/search-index.json` route that serves it on demand, and the test that
 * guards its shape. The palette fetches it the first time it is opened.
 */
import { categories } from "@/lib/data";
import { posts } from "@/lib/posts";
import { resolvedComparisons } from "@/lib/comparisons";
import type { SearchEntry } from "@/lib/search";

export function buildSearchEntries(): SearchEntry[] {
  return [
    // Tools
    ...categories.flatMap((c) =>
      c.tools.map((tool) => ({
        kind: "tool" as const,
        name: tool.name,
        blurb: tool.blurb,
        categoryTitle: c.title,
        categoryLayer: c.layer,
        href: `/${c.slug}/${tool.slug}`,
        external: tool.url,
        domain: tool.domain,
        tag: tool.kind,
      })),
    ),
    // Essays — the site's actual argument. Excluding these meant a query for
    // "evals" returned only tools and hid the best answer on the site.
    ...posts.map((p) => ({
      kind: "essay" as const,
      name: p.meta.title,
      blurb: p.meta.dek,
      categoryTitle: "Essays",
      categoryLayer: p.meta.layers[0] ?? null,
      href: `/blog/${p.meta.slug}`,
      tag: "Essay",
    })),
    // Comparisons
    ...resolvedComparisons.map((c) => ({
      kind: "comparison" as const,
      name: c.title,
      blurb: c.description,
      categoryTitle: "Comparisons",
      categoryLayer: c.tools[0]?.layer ?? null,
      href: `/compare/${c.slug}`,
      tag: "Compared",
    })),
  ];
}
