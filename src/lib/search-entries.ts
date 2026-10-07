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
import { categories, getCategory } from "@/lib/data";
import { allAlternativesPages } from "@/lib/alternatives";
import { posts } from "@/lib/posts";
import { resolvedComparisons } from "@/lib/comparisons";
import { resolvedSymptoms } from "@/lib/symptoms";
import { BANDS } from "@/lib/layer";
import { roleTitle } from "@/lib/roles";
import { glossary } from "@/lib/glossary";
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
        // Second-home sections as display titles, for the same reason as roles
        // above. Someone typing "guardrails" or "agent memory" is describing a
        // layer, not a tool, and a tool that reaches that layer only as a
        // second home should be findable by the layer's name. The slugs would
        // also match, but a slug read out in the palette's category line looks
        // like a filename.
        alsoIn: (tool.secondHomes ?? []).map(
          (h) => getCategory(h.section)?.title ?? h.section,
        ),
        // The filterable projection. Role *ids* rather than the display names
        // above: this object exists for `search-filters.ts`, which backs a
        // query surface, and `?role=platform` is the value in the URL.
        facets: {
          section: c.slug,
          layer: c.layer,
          roles: tool.roles,
          kind: tool.kind,
          deployment: tool.deployment,
          cost: tool.cost,
        },
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
    // Glossary terms. Fifty-one definitions, each with its own page, and the
    // palette returned nothing for any of them — so "paged attention" or "KV
    // cache" found the tool that implements the term but not the page that
    // explains it, which is the page a reader arriving from a search engine
    // actually wants. Indexed as their own kind rather than folded into
    // `tool`, because a term is not a tool and the palette's kind pill is how a
    // reader tells the five flavours apart before navigating.
    ...glossary.map((term) => ({
      kind: "glossary" as const,
      name: term.term,
      // The definition, not the `detail`: one sentence is what the row can show
      // and what a search result should return. `detail` is the page's job.
      blurb: term.definition,
      categoryTitle: "Glossary",
      categoryLayer: term.layer,
      href: `/glossary/${term.slug}`,
      tag: "Term",
    })),
    // Alternatives pages. "X alternatives" and "alternatives to X" are two of
    // the highest-intent queries this index can serve, and the palette is the
    // only place a reader who types either will find them — they are one hop
    // from the tool page, which is one hop too many.
    // Trust and policy pages — discoverable from Cmd-K ("privacy", "contact").
    {
      kind: "essay" as const,
      name: "Contact",
      blurb: "Email, GitHub issues, and machine-readable endpoints for agents.",
      categoryTitle: "Site",
      categoryLayer: null,
      href: "/contact",
      tag: "Site",
    },
    {
      kind: "essay" as const,
      name: "Privacy policy",
      blurb: "What Lattice collects, third-party badges, and how to reach the maintainer.",
      categoryTitle: "Site",
      categoryLayer: null,
      href: "/privacy",
      tag: "Site",
    },
    {
      kind: "essay" as const,
      name: "About Lattice",
      blurb: "What this index is and how entries are chosen, checked, and corrected.",
      categoryTitle: "Site",
      categoryLayer: null,
      href: "/about",
      tag: "Site",
    },
    {
      kind: "essay" as const,
      name: "Returns and refunds",
      blurb: "Nothing is sold on this domain; vendor purchases use vendor policies.",
      categoryTitle: "Site",
      categoryLayer: null,
      href: "/returns",
      tag: "Site",
    },
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
