import type { MetadataRoute } from "next";
import { categories } from "@/lib/data";
import { posts } from "@/lib/posts";
import { resolvedComparisons } from "@/lib/comparisons";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: site.url,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
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
    ...categories.map((c) => ({
      url: `${site.url}/${c.slug}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
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
  ];
}
