import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategorySection } from "@/components/category-section";
import { categories, getCategory } from "@/lib/data";
import { toJsonLd } from "@/lib/jsonld";
import { breadcrumbNode, datasetModified, graph, ids } from "@/lib/seo";
import { site } from "@/lib/site";

export function generateStaticParams() {
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) return { title: "Not found" };

  // "<Layer> tools" is how the category is searched; the count and the
  // "production" qualifier separate it from submission-driven directories.
  return {
    title: `${category.title} tools for production AI (${category.tools.length})`,
    description: `${category.description} ${category.tools.length} curated ${category.title.toLowerCase()} tools, each with when to use it, when to skip it, licence and alternatives.`,
    alternates: { canonical: `/${category.slug}` },
  };
}

export default async function CategoryPage({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  const siblings = categories.filter((c) => c.slug !== slug);
  const position = categories.findIndex((c) => c.slug === slug);
  const prev = position > 0 ? categories[position - 1] : null;
  const next = position < categories.length - 1 ? categories[position + 1] : null;

  const pageUrl = `${site.url}/${category.slug}`;

  return (
    <div className="mx-auto max-w-5xl px-5 pt-14 sm:px-6 sm:pt-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(
            graph(
              {
                "@type": "CollectionPage",
                "@id": pageUrl,
                url: pageUrl,
                name: `${category.title} tools`,
                description: `${category.description} ${category.responsibility}`,
                dateModified: datasetModified,
                isPartOf: { "@id": ids.website },
                breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
                mainEntity: { "@id": `${pageUrl}#tools` },
              },
              {
                "@type": "ItemList",
                "@id": `${pageUrl}#tools`,
                name: `${category.title} tools`,
                numberOfItems: category.tools.length,
                itemListElement: category.tools.map((tool, i) => ({
                  "@type": "ListItem",
                  position: i + 1,
                  name: tool.name,
                  url: `${pageUrl}/${tool.slug}`,
                })),
              },
              breadcrumbNode(pageUrl, [
                { name: site.name, path: "" },
                { name: category.title, path: `/${category.slug}` },
              ]),
            ),
          ),
        }}
      />

      <CategorySection category={category} headingLevel="h1" />

      {/* Prev / next */}
      <nav
        aria-label="Category pagination"
        className="flex items-stretch justify-between gap-4 border-t border-border py-6"
      >
        {prev ? (
          <Link
            href={`/${prev.slug}`}
            className="group min-w-0 flex-1 rounded-lg px-3 py-2 transition-colors hover:bg-bg-sunken"
          >
            <span className="block font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              Previous
            </span>
            <span className="mt-1 block truncate text-[14px] font-medium">
              {prev.title}
            </span>
          </Link>
        ) : (
          <span className="flex-1" />
        )}

        {next ? (
          <Link
            href={`/${next.slug}`}
            className="group min-w-0 flex-1 rounded-lg px-3 py-2 text-right transition-colors hover:bg-bg-sunken"
          >
            <span className="block font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              Next
            </span>
            <span className="mt-1 block truncate text-[14px] font-medium">
              {next.title}
            </span>
          </Link>
        ) : (
          <span className="flex-1" />
        )}
      </nav>

      {/* All other sections, so no page is a dead end. */}
      <div className="pt-4">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-subtle">
          All sections
        </h2>
        <ul className="mt-4 grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {siblings.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/${c.slug}`}
                className="flex items-baseline gap-2 rounded-md px-2 py-1.5 text-[13px] text-fg-muted transition-colors hover:bg-bg-sunken hover:text-fg"
              >
                <span className="font-mono text-[11px] text-fg-subtle">
                  {c.index}
                </span>
                {c.title}
                <span className="font-mono text-[11px] text-fg-subtle">
                  {c.tools.length}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
