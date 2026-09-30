import type { Metadata } from "next";
import Link from "next/link";
import { layerStyle } from "@/lib/layer";
import { posts } from "@/lib/posts";
import { getCategory } from "@/lib/data";

export const metadata: Metadata = {
  title: "Essays",
  description:
    "Long-form notes on the architectural decisions behind production AI systems: runtimes, gateways, retrieval, evaluation, durability and fine-tuning.",
  alternates: { canonical: "/blog" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function BlogIndexPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 pt-14 sm:px-6 sm:pt-16">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
          {posts.length} essays
        </p>
        <h1 className="mt-4 text-balance font-serif text-[34px] font-medium leading-[1.1] tracking-[-0.02em] sm:text-[42px]">
          Notes on building AI systems that hold up.
        </h1>
        <p className="mt-4 max-w-[54ch] text-pretty text-[15px] leading-relaxed text-fg-muted">
          The index tells you what exists. These essays cover the decisions
          behind it — what to reach for first, what looks like an optimisation
          and is actually a rewrite, and where the failure modes live.
        </p>
      </header>

      <ol className="mt-12 space-y-px">
        {posts.map((post) => {
          const layer = post.meta.layers[0] ?? null;
          return (
            <li key={post.meta.slug}>
              <Link
                href={`/blog/${post.meta.slug}`}
                className="group -mx-2 flex gap-4 rounded-md px-2 py-5 transition-colors hover:bg-bg-sunken"
              >
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-8 w-[3px] shrink-0 rounded-full"
                  style={layerStyle(layer)}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <h2 className="text-balance font-serif text-[19px] font-medium tracking-[-0.01em] group-hover:text-accent">
                      {post.meta.title}
                    </h2>
                    <span className="font-mono text-[11px] text-fg-subtle">
                      {post.meta.readingTime}
                    </span>
                  </span>
                  <span className="mt-1.5 block text-pretty text-[14px] leading-relaxed text-fg-muted">
                    {post.meta.dek}
                  </span>
                  <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-fg-subtle">
                    <time dateTime={post.meta.date}>
                      {formatDate(post.meta.date)}
                    </time>
                    {post.meta.sections.map((slug) => {
                      const category = getCategory(slug);
                      if (!category) return null;
                      return (
                        <span key={slug}>
                          <span aria-hidden="true">·</span> {category.title}
                        </span>
                      );
                    })}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
