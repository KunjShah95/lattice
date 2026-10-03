import type { MetadataRoute } from "next";
import { allTools, categories } from "@/lib/data";
import { allAlternativesPages } from "@/lib/alternatives";
import { posts } from "@/lib/posts";
import { resolvedComparisons } from "@/lib/comparisons";
import { resolvedSymptoms } from "@/lib/symptoms";
import { glossary } from "@/lib/glossary";
import { site } from "@/lib/site";
import { datasetModified } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  // The build time is not a modification time: stamping every URL with it on
  // each deploy tells crawlers 190 pages changed when none did, and they learn
  // to ignore the field. Dataset pages change when the dataset is re-verified.
  const lastModified = new Date(datasetModified);

  return [
    {
      url: site.url,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${site.url}/all`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${site.url}/blog`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${site.url}/compare`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${site.url}/glossary`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    // The methodology page is the one a sceptical reader and an answer engine
    // both want, and it is the only route whose content is about the index
    // rather than an entry in it. High priority for that reason.
    {
      url: `${site.url}/methodology`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    ...categories.map((c) => ({
      url: `${site.url}/${c.slug}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    {
      url: `${site.url}/fix`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    // Symptom pages answer the queries readers actually type ("why is my LLM
    // app slow"), which no category page can.
    ...resolvedSymptoms.map((s) => ({
      url: `${site.url}/fix/${s.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.85,
    })),
    ...resolvedComparisons.map((c) => ({
      url: `${site.url}/compare/${c.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...posts.map((p) => ({
      url: `${site.url}/blog/${p.meta.slug}`,
      lastModified: new Date(p.meta.date),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...glossary.map((t) => ({
      url: `${site.url}/glossary/${t.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    // Every tool has a page. A directory's value is being findable, so all of
    // them belong in the sitemap — not just the ones with inbound links yet.
    ...allTools.map((entry) => ({
      url: `${site.url}/${entry.category.slug}/${entry.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    // Alternatives pages, for the tools with enough of a graph to justify one.
    // "Alternatives to X" is the query a reader types once they have already
    // decided to leave something, and it is the one shape a vendor cannot
    // publish honestly about a competitor — so these are the pages most worth
    // being found for.
    ...allAlternativesPages().map((p) => ({
      url: `${site.url}/${p.slug}/${p.tool}/alternatives`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
