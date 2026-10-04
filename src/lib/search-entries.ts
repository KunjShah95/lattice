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
import { allAlternativesPages } from "@/lib/alternatives";
import { posts } from "@/lib/posts";
import { resolvedComparisons } from "@/lib/comparisons";
import { resolvedSymptoms } from "@/lib/symptoms";
import { BANDS } from "@/lib/layer";
import { roleTitle } from "@/lib/roles";
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
        // Display strings, not ids: the fuzzy haystack matches what a reader
        // types ("infra", "platform"), not the internal slug.
        roles: tool.roles.map((r) => roleTitle(r)),
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
    // Symptoms. A reader typing "slow" or "wrong answers" has a problem, not
    // a tool name; these are the rows that match how they phrase it.
    ...resolvedSymptoms.map((s) => ({
      kind: "essay" as const,
      name: s.title,
      blurb: s.description,
      categoryTitle: "Fix a symptom",
      categoryLayer: BANDS.find((b) => b.id === s.band)?.layers[0] ?? null,
      href: `/fix/${s.slug}`,
      tag: s.label,
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
    // Alternatives pages. "X alternatives" and "alternatives to X" are two of
    // the highest-intent queries this index can serve, and the palette is the
    // only place a reader who types either will find them — they are one hop
    // from the tool page, which is one hop too many.
    ...allAlternativesPages().flatMap((p) => {
      const found = categories
        .find((c) => c.slug === p.slug)
        ?.tools.find((t) => t.slug === p.tool);
      if (!found) return [];
      return [
        {
          kind: "comparison" as const,
          name: `${found.name} alternatives`,
          blurb: `Every recorded substitute for ${found.name}, and which of them are adjacent rather than a real swap.`,
          categoryTitle: "Alternatives",
          categoryLayer: categories.find((c) => c.slug === p.slug)?.layer ?? null,
          href: `/${p.slug}/${p.tool}/alternatives`,
          tag: "Alternatives",
        },
      ];
    }),
  ];
}
