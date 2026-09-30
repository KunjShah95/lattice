import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { layerStyle } from "@/lib/layer";
import { getPost, posts, relatedPosts } from "@/lib/posts";
import { getCategory } from "@/lib/data";
import { site } from "@/lib/site";
import { toJsonLd } from "@/lib/jsonld";

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
      authors: [site.copyrightHolder],
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

          <p className="mt-4 max-w-[58ch] text-pretty text-[16px] leading-relaxed text-fg-muted">
            {meta.dek}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-5 font-mono text-[11px] text-fg-subtle">
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

        <div className="prose-lattice">
          <Component />
        </div>
      </article>

      {/* Related essays — the internal backlink graph. */}
      {related.length ? (
        <nav aria-label="Related essays" className="mt-16 border-t border-border pt-8">
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
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: meta.title,
    description: meta.description,
    datePublished: meta.date,
    dateModified: meta.date,
    author: { "@type": "Person", name: site.copyrightHolder },
    publisher: { "@type": "Organization", name: site.name },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${site.url}/blog/${meta.slug}`,
    },
    keywords: meta.sections
      .map((s) => getCategory(s)?.title)
      .filter(Boolean)
      .join(", "),
  };
}
