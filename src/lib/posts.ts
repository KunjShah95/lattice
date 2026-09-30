import type { ComponentType } from "react";

export type PostMeta = {
  slug: string;
  title: string;
  /** Meta description and og:description. */
  description: string;
  /** Standfirst shown on the post page and in listings. */
  dek: string;
  /** ISO date. */
  date: string;
  readingTime: string;
  /** Stack layers the post speaks to — drives the accent rule. */
  layers: number[];
  /** Category slugs linked from the post. */
  sections: string[];
  /** Slugs of related posts, for the footer links. */
  related: string[];
};

export type Post = {
  meta: PostMeta;
  /** The MDX body as a React component. */
  Component: ComponentType<Record<string, unknown>>;
};

import Ctor1, { meta as m1 } from "@/content/blog/choosing-an-inference-runtime.mdx";
import Ctor2, { meta as m2 } from "@/content/blog/the-gateway-is-the-product.mdx";
import Ctor3, { meta as m3 } from "@/content/blog/fix-the-ranking-not-the-prompt.mdx";
import Ctor4, { meta as m4 } from "@/content/blog/evals-are-the-asset.mdx";
import Ctor5, { meta as m5 } from "@/content/blog/agents-need-a-durable-host.mdx";
import Ctor6, { meta as m6 } from "@/content/blog/prompt-or-finetune.mdx";

/**
 * Every essay is registered here. MDX cannot be glob-imported at build time
 * with static params, so the list is explicit — which also means a new post
 * cannot be added without deciding where it belongs.
 */
const registry: Array<[PostMeta, ComponentType<Record<string, unknown>>]> = [
  [m1, Ctor1],
  [m2, Ctor2],
  [m3, Ctor3],
  [m4, Ctor4],
  [m5, Ctor5],
  [m6, Ctor6],
];

export const posts: Post[] = registry
  .map(([meta, Component]) => ({ meta, Component }))
  .sort((a, b) => (a.meta.date < b.meta.date ? 1 : -1));

export const getPost = (slug: string) => posts.find((p) => p.meta.slug === slug);

/** Posts that reference a given category, newest first. */
export const postsForSection = (sectionSlug: string) =>
  posts.filter((p) => p.meta.sections.includes(sectionSlug));

export const relatedPosts = (slug: string) => {
  const post = getPost(slug);
  if (!post) return [];
  return post.meta.related
    .map((s) => getPost(s))
    .filter((p): p is Post => Boolean(p));
};
