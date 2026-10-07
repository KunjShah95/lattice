import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategorySection } from "@/components/category-section";
import { categories, getCategory, getSecondHomeTools } from "@/lib/data";
import { layerStyle } from "@/lib/layer";
import { TrackLink } from "@/components/track-link";
import { Byline } from "@/components/byline";
import { AS_OF } from "@/lib/attributes";
import { toJsonLd } from "@/lib/jsonld";
import { absolute, breadcrumbNode, credit, graph, ids } from "@/lib/seo";
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
    // See `absolute()` in lib/seo.ts: Next does not derive `og:url` from the
    // canonical, and an inherited one points at the home page.
    openGraph: { url: absolute(`/${category.slug}`) },
  };
}

export default async function CategoryPage({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  const siblings = categories.filter((c) => c.slug !== slug);
  // Tools whose home is another layer but which declare this one too. Without
  // this block, a second home is only visible from the tool's own page, so a
  // reader who arrives at the layer where the tool actually matters — agent
  // memory under Retrieval, a prompt registry under Prompt Engineering — never
  // learns it is here.
  const alsoHere = getSecondHomeTools(slug);
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
                // `credit()` replaces the bare `dateModified` it had: a layer
                // page states a responsibility claim about the whole stack, so
                // it is exactly the kind of page that should say who maintains
                // it and when it was last checked.
                ...credit(),
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

      {/* The layer page states a responsibility claim about the whole stack —
          what belongs here and what does not — which is a claim about the
          index, not about a tool. It gets the same attribution the tool pages
          do. Placed after the section rather than inside it because
          `CategorySection` is shared with the home page, where one byline for
          all nine layers would be the honest rendering and nine would not be. */}
      <Byline
        fact="Layer boundaries and entries verified"
        date={category.tools[0]?.asOf ?? AS_OF}
        className="border-t border-border pt-5"
      />

      {/* Also here from another layer. Same content as the tool page's "Also
          belongs in", reached from the other end — which is the direction that
          was missing. The swatch is the tool's *home* layer, so the pair reads
          as "this layer, and that one" rather than a second list of tools that
          look native here. */}
      {alsoHere.length ? (
        <section className="border-t border-border py-10">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
            Also relevant here
          </h2>
          <p className="editorial-justify mt-2 max-w-[62ch] text-pretty text-[14px] leading-relaxed text-fg-muted">
            These tools are indexed in another layer, but they also do{" "}
            {category.title.toLowerCase()}&apos;s job. Each carries its home
            layer&apos;s colour.
          </p>
          <ul className="mt-5 space-y-px">
            {alsoHere.map(({ tool, because }) => (
              <li key={`${tool.category.slug}-${tool.slug}`}>
                {/* Tracked, but the reverse direction of the tool page's
                    "Also belongs in". Taken together the two counts say whether
                    the crossing is being read from either end — a field that is
                    only ever read in one direction is a field nobody needed. */}
                <TrackLink
                  href={`/${tool.category.slug}/${tool.slug}`}
                  event="second-home"
                  className="group -mx-2 flex gap-3 rounded-md px-2 py-3 transition-colors hover:bg-bg-sunken"
                >
                  <span
                    aria-hidden="true"
                    className="mt-1.5 h-6 w-[3px] shrink-0 rounded-full"
                    style={layerStyle(tool.category.layer)}
                  />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-[15px] font-medium group-hover:text-accent">
                        {tool.name}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                        {tool.category.short}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-pretty text-[13px] leading-relaxed text-fg-muted">
                      {because}
                    </span>
                  </span>
                </TrackLink>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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
