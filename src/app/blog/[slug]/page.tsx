import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EssayContents } from "@/components/essay-contents";
import { ReadingRail } from "@/components/reading-rail";
import { essayHeadings } from "@/lib/headings";
import { layerStyle } from "@/lib/layer";
import { getPost, posts, relatedPosts } from "@/lib/posts";
import { getCategory } from "@/lib/data";
import { site } from "@/lib/site";
import { toJsonLd } from "@/lib/jsonld";
import { authorNode, breadcrumbNode, bylineName, graph, ids } from "@/lib/seo";

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.meta.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Not found" };

  return {
    title: post.meta.title,
    description: post.meta.description,
    alternates: { canonical: `/blog/${post.meta.slug}` },
    openGraph: {
      type: "article",
      title: post.meta.title,
      description: post.meta.description,
      url: `${site.url}/blog/${post.meta.slug}`,
      publishedTime: post.meta.date,
      authors: [bylineName],
    },
    twitter: {
      card: "summary_large_image",
      title: post.meta.title,
      description: post.meta.description,
    },
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function PostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const { meta, Component } = post;
  const related = relatedPosts(slug);
  const headings = essayHeadings(slug);
  const sections = meta.sections
    .map((s) => getCategory(s))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <div className="mx-auto max-w-3xl px-5 pt-14 sm:px-6 sm:pt-16">
      <script
        type="application/ld+json"
        // Structured data for rich results. Content is ours, not user input.
        dangerouslySetInnerHTML={{ __html: toJsonLd(postJsonLd(meta)) }}
      />

      {/* `relative` so the reading rail can hang off the article's right edge
          without reflowing it: the essay's line length is the thing that makes it
          readable, and a rail that narrowed it would cost more than it gave. */}
      <div className="relative">
      <ReadingRail headings={headings} />
      <article>
        <header className="mb-10">
          <Link
            href="/blog"
            className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle transition-colors hover:text-fg-muted"
          >
            ← Essays
          </Link>

          <h1 className="mt-5 text-balance font-serif text-[32px] font-medium leading-[1.12] tracking-[-0.02em] sm:text-[42px]">
            {meta.title}
          </h1>

          <p className="editorial-justify mt-4 max-w-[58ch] text-pretty text-[16px] leading-relaxed text-fg-muted">
            {meta.dek}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-5 font-mono text-[11px] text-fg-subtle">
            <span>By {bylineName}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={meta.date}>{formatDate(meta.date)}</time>
            <span aria-hidden="true">·</span>
            <span>{meta.readingTime}</span>
            {sections.map((c) => (
              <span key={c.slug} className="inline-flex items-center gap-1.5">
                <span aria-hidden="true">·</span>
                <Link
                  href={`/${c.slug}`}
                  className="underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg-muted"
                >
                  {c.title}
                </Link>
              </span>
            ))}
          </div>
        </header>

        <EssayContents headings={headings} />

        <div className="prose-lattice">
          <Component />
        </div>
      </article>
      </div>

      {/*
        The next step, in the reader's terms.

        An essay here is an argument, and the strongest moment to act is the
        moment it finishes — which is exactly when the page previously offered
        nothing but more essays. `meta.sections` was already resolved above and
        used only in the header breadcrumb, so the reader had to scroll back up
        to act on what they had just been convinced of.

        Placed above "Read next" deliberately: the tools are the point, the
        further reading is the consolation prize.
      */}
      {sections.length ? (
        <section className="mt-16 border-t border-border pt-8">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
            Where to look next
          </h2>
          <p className="mt-3 max-w-[60ch] text-pretty text-[14px] leading-relaxed text-fg-muted">
            {sections.length === 1
              ? "This essay is mostly about one layer, so that is where the options are:"
              : "This essay spans several layers. The options live in each:"}
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {sections.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/${c.slug}`}
                  className="group flex h-full items-start gap-3 rounded-lg border border-border bg-bg-elevated p-3.5 transition-colors hover:border-border-strong"
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 h-8 w-[3px] shrink-0 rounded-full"
                    style={layerStyle(c.layer)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium group-hover:text-accent">
                      {c.title}
                    </span>
                    <span className="mt-0.5 block text-pretty text-[12.5px] leading-relaxed text-fg-muted">
                      {c.responsibility}
                    </span>
                    <span className="mt-1.5 block font-mono text-[11px] text-fg-subtle">
                      {c.tools.length} tools →
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Related essays — the internal backlink graph. */}
      {related.length ? (
        <nav aria-label="Related essays" className="mt-12 border-t border-border pt-8">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
            Read next
          </h2>
          <ul className="mt-4 space-y-px">
            {related.map((r) => (
              <li key={r.meta.slug}>
                <Link
                  href={`/blog/${r.meta.slug}`}
                  className="group -mx-2 flex gap-3 rounded-md px-2 py-3 transition-colors hover:bg-bg-sunken"
                >
                  <span
                    aria-hidden="true"
                    className="mt-1.5 h-6 w-[3px] shrink-0 rounded-full"
                    style={layerStyle(r.meta.layers[0] ?? null)}
                  />
                  <span className="min-w-0">
                    <span className="block text-[15px] font-medium group-hover:text-accent">
                      {r.meta.title}
                    </span>
                    <span className="mt-0.5 block text-pretty text-[13px] leading-relaxed text-fg-muted">
                      {r.meta.dek}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}

function postJsonLd(meta: import("@/lib/posts").PostMeta) {
  const pageUrl = `${site.url}/blog/${meta.slug}`;
  return graph(
    {
      "@type": "Article",
      "@id": `${pageUrl}#article`,
      headline: meta.title,
      description: meta.description,
      datePublished: meta.date,
      dateModified: meta.date,
      author: authorNode(),
      publisher: { "@id": ids.organization },
      isPartOf: { "@id": ids.website },
      mainEntityOfPage: { "@id": pageUrl },
      keywords: meta.sections
        .map((s) => getCategory(s)?.title)
        .filter(Boolean)
        .join(", "),
    },
    {
      "@type": "WebPage",
      "@id": pageUrl,
      url: pageUrl,
      name: meta.title,
      breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
    },
    breadcrumbNode(pageUrl, [
      { name: site.name, path: "" },
      { name: "Essays", path: "/blog" },
      { name: meta.title, path: `/blog/${meta.slug}` },
    ]),
  );
}
