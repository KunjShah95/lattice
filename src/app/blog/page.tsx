import type { Metadata } from "next";
import Link from "next/link";
import { layerStyle } from "@/lib/layer";
import { posts } from "@/lib/posts";
import { getCategory } from "@/lib/data";
import { site } from "@/lib/site";
import { absolute, collectionPageNodes, indexCrumbs } from "@/lib/seo";
import { toJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "Essays on production AI",
  description:
    "Long-form notes on the architectural decisions behind production AI systems: runtimes, gateways, retrieval, evaluation, durability and fine-tuning.",
  alternates: { canonical: "/blog" },
  // See `absolute()` in lib/seo.ts: Next does not derive `og:url` from the
  // canonical, and an inherited one points at the home page.
  openGraph: { url: absolute("/blog") },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function BlogIndexPage() {
  const pageUrl = `${site.url}/blog`;
  const name = "Essays";

  return (
    <div className="page-shell pt-14 sm:pt-20">
      {/* The essays as an ItemList. The per-post pages each carry Article
          JSON-LD, but nothing joined them: this is the only page that says
          which essays exist, and it links out by rendered <a> alone otherwise.
          `dek` is the description — the same one each post's own metadata
          uses, so the two cannot disagree. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(
            collectionPageNodes({
              pageUrl,
              name,
              description: metadata.description as string,
              listId: "essays",
              crumbs: indexCrumbs("Essays", "/blog"),
              items: posts.map((p) => ({
                name: p.meta.title,
                description: p.meta.dek,
                url: absolute(`/blog/${p.meta.slug}`),
              })),
            }),
          ),
        }}
      />

      <header>
        <p className="t-label">
          {posts.length} essays
        </p>
        <h1 className="mt-4 t-h1">
          Notes on building AI systems that hold up.
        </h1>
        <p className="measure mt-4 text-[17px] leading-relaxed text-fg-muted">
          The index tells you what exists. These essays cover the decisions
          behind it — what to reach for first, what looks like an optimisation
          and is actually a rewrite, and where the failure modes live.
        </p>
      </header>

      <ol className="mt-10 divide-y divide-border">
        {posts.map((post) => {
          const layer = post.meta.layers[0] ?? null;
          return (
            <li key={post.meta.slug}>
              <Link
                href={`/blog/${post.meta.slug}`}
                className="group -mx-2 flex gap-4 rounded-[var(--r-control)] px-2 py-6 transition-colors hover:bg-bg-sunken"
              >
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-8 w-[3px] shrink-0 rounded-full"
                  style={layerStyle(layer)}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <h2 className="t-h3 transition-colors group-hover:text-accent">
                      {post.meta.title}
                    </h2>
                  </span>
                  <span className="mt-2 block text-pretty text-[15px] leading-relaxed text-fg-muted">
                    {post.meta.dek}
                  </span>
                  <span className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <time
                      dateTime={post.meta.date}
                      className="inline-flex items-center rounded-[var(--r-pill)] border border-border px-2 py-0.5 font-mono text-[12px] tabular-nums text-fg-muted"
                    >
                      {formatDate(post.meta.date)}
                    </time>
                    <span className="inline-flex items-center rounded-[var(--r-pill)] border border-border px-2 py-0.5 font-mono text-[12px] text-fg-muted">
                      {post.meta.readingTime}
                    </span>
                    {post.meta.sections.map((slug) => {
                      const category = getCategory(slug);
                      if (!category) return null;
                      return (
                        <span
                          key={slug}
                          className="inline-flex items-center gap-1.5 rounded-[var(--r-pill)] border border-border px-2 py-0.5 text-[12.5px] text-fg-muted"
                        >
                          <span
                            aria-hidden="true"
                            className="h-1.5 w-1.5 rounded-full"
                            style={layerStyle(category.layer)}
                          />
                          {category.short}
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
