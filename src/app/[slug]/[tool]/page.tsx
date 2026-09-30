import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { layerStyle } from "@/lib/layer";
import { allTools, getSiblingTools, getTool } from "@/lib/data";
import { postsForSection } from "@/lib/posts";
import { resolvedComparisons } from "@/lib/comparisons";
import { site } from "@/lib/site";
import { toJsonLd } from "@/lib/jsonld";

/**
 * One page per tool, nested under its section: /<section>/<tool>.
 *
 * Two reasons this is worth generating for every entry rather than only the
 * popular ones. It gives the dataset real URLs to be discovered through, and
 * it creates the sibling/backlink graph that makes a directory worth browsing
 * rather than merely searchable.
 *
 * The first segment reuses the `slug` name already used by `app/[slug]`.
 * Next.js requires one name per dynamic position at a given depth — naming
 * this one `category` builds cleanly and then 500s at runtime with
 * "different slug names for the same dynamic path".
 */
export function generateStaticParams() {
  return allTools.map((entry) => ({
    slug: entry.category.slug,
    tool: entry.slug,
  }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[slug]/[tool]">): Promise<Metadata> {
  const { slug: categorySlug, tool: toolSlug } = await params;
  const found = getTool(categorySlug, toolSlug);
  if (!found) return { title: "Not found" };

  const { tool, category } = found;
  const tagSuffix = tool.tag ? ` (${tool.tag})` : "";

  return {
    title: `${tool.name}${tagSuffix}`,
    description: `${tool.blurb} Part of ${category.title} in the ${site.name} index.`,
    alternates: { canonical: `/${category.slug}/${tool.slug}` },
    openGraph: {
      type: "article",
      title: `${tool.name} — ${category.title}`,
      description: tool.blurb,
      url: `${site.url}/${category.slug}/${tool.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: tool.name,
      description: tool.blurb,
    },
  };
}

export default async function ToolPage({ params }: PageProps<"/[slug]/[tool]">) {
  const { slug: categorySlug, tool: toolSlug } = await params;
  const found = getTool(categorySlug, toolSlug);
  if (!found) notFound();

  const { tool, category } = found;
  const siblings = getSiblingTools(categorySlug, toolSlug);
  const sectionPosts = postsForSection(categorySlug);

  // Comparisons that include this tool — the most valuable links on the page,
  // because they are the only place a tool appears in a decision context.
  const inComparisons = resolvedComparisons.filter((c) =>
    c.tools.some((t) => t.name === tool.name),
  );

  return (
    <div className="mx-auto max-w-3xl px-5 pt-14 sm:px-6 sm:pt-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: tool.name,
            description: tool.blurb,
            url: tool.url,
            applicationCategory: category.title,
            ...(tool.tag ? { keywords: tool.tag } : {}),
          }),
        }}
      />

      <header>
        {/* Breadcrumb doubles as the section backlink. */}
        <nav aria-label="Breadcrumb" className="font-mono text-[11px]">
          <ol className="flex flex-wrap items-center gap-1.5 text-fg-subtle">
            <li>
              <Link href="/" className="transition-colors hover:text-fg-muted">
                Index
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href={`/${category.slug}`}
                className="transition-colors hover:text-fg-muted"
              >
                {category.short}
              </Link>
            </li>
          </ol>
        </nav>

        <div className="mt-6 flex items-start gap-3.5">
          <span
            aria-hidden="true"
            className="mt-2 h-10 w-[3px] shrink-0 rounded-full"
            style={layerStyle(category.layer)}
          />
          <div className="min-w-0">
            <h1 className="text-balance font-serif text-[32px] font-medium leading-[1.12] tracking-[-0.02em] sm:text-[40px]">
              {tool.name}
            </h1>
            <p className="mt-2 font-mono text-[12px] text-fg-subtle">
              {tool.domain}
              {tool.tag ? (
                <>
                  <span aria-hidden="true"> · </span>
                  {tool.tag}
                </>
              ) : null}
            </p>
          </div>
        </div>

        <p className="mt-6 text-pretty text-[16px] leading-relaxed text-fg-muted">
          {tool.blurb}
        </p>

        <p className="mt-6 max-w-[60ch] text-pretty text-[14.5px] leading-relaxed text-fg-muted">
          <span className="text-fg">{category.responsibility}</span>{" "}
          <span className="text-fg-muted">
            — that is what this layer of the stack is answerable for. See the
            full{" "}
            <Link
              href={`/${category.slug}`}
              className="underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg"
            >
              {category.title}
            </Link>{" "}
            section for the rest of the options.
          </span>
        </p>

        <a
          href={tool.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-7 inline-flex items-center gap-2 rounded-lg border border-border-strong bg-bg-elevated px-4 py-2 text-[14px] font-medium transition-colors hover:border-accent hover:text-accent"
        >
          Visit {tool.domain}
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M7 17 17 7M9 7h8v8" />
          </svg>
        </a>
      </header>

      {/* Appears-in: the decision contexts, which is what makes this page
          more than a link with a sentence on it. */}
      {inComparisons.length ? (
        <section className="mt-14 border-t border-border pt-8">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
            Compared in
          </h2>
          <ul className="mt-4 space-y-px">
            {inComparisons.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/compare/${c.slug}`}
                  className="group -mx-2 flex gap-3 rounded-md px-2 py-3 transition-colors hover:bg-bg-sunken"
                >
                  <span
                    aria-hidden="true"
                    className="mt-1.5 h-6 w-[3px] shrink-0 rounded-full"
                    style={layerStyle(category.layer)}
                  />
                  <span className="min-w-0">
                    <span className="block text-[15px] font-medium group-hover:text-accent">
                      {c.title}
                    </span>
                    <span className="mt-0.5 block text-pretty text-[13px] leading-relaxed text-fg-muted">
                      {c.description}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Reading on this layer */}
      {sectionPosts.length ? (
        <section className="mt-12">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
            Reading on {category.short.toLowerCase()}
          </h2>
          <ul className="mt-4 space-y-px">
            {sectionPosts.map((p) => (
              <li key={p.meta.slug}>
                <Link
                  href={`/blog/${p.meta.slug}`}
                  className="group -mx-2 flex gap-3 rounded-md px-2 py-3 transition-colors hover:bg-bg-sunken"
                >
                  <span
                    aria-hidden="true"
                    className="mt-1.5 h-6 w-[3px] shrink-0 rounded-full"
                    style={layerStyle(p.meta.layers[0] ?? null)}
                  />
                  <span className="min-w-0">
                    <span className="block text-[15px] font-medium group-hover:text-accent">
                      {p.meta.title}
                    </span>
                    <span className="mt-0.5 block text-pretty text-[13px] leading-relaxed text-fg-muted">
                      {p.meta.dek}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Siblings — the crawl graph that keeps a section connected. */}
      {siblings.length ? (
        <section className="mt-12">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
            Also in {category.short.toLowerCase()}
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {siblings.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/${category.slug}/${s.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[13px] text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
                >
                  <span
                    aria-hidden="true"
                    className="h-3 w-[2px] rounded-full"
                    style={layerStyle(category.layer)}
                  />
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
