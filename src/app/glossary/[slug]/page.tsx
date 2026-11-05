import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { layerStyle } from "@/lib/layer";
import { getGlossaryTerm, glossary } from "@/lib/glossary";
import { getToolByName, stackLayers } from "@/lib/data";
import { AS_OF } from "@/lib/attributes";
import { site } from "@/lib/site";
import { toJsonLd } from "@/lib/jsonld";
import { breadcrumbNode, credit, graph, ids, lowerFirst } from "@/lib/seo";
import { Byline } from "@/components/byline";
import { PageGuidance } from "@/components/page-guidance";
import { PAGE_GUIDANCE } from "@/lib/guidance";

export function generateStaticParams() {
  return glossary.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/glossary/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const term = getGlossaryTerm(slug);
  if (!term) return { title: "Not found" };

  return {
    // Glossary pages answer exactly one query shape: "what is <term>".
    title: `What is ${lowerFirst(term.term)}? Definition`,
    description: `${term.term}: ${lowerFirst(term.definition)}`,
    alternates: { canonical: `/glossary/${term.slug}` },
    openGraph: {
      type: "article",
      title: term.term,
      description: term.definition,
      url: `${site.url}/glossary/${term.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: term.term,
      description: term.definition,
    },
  };
}

export default async function GlossaryTermPage({
  params,
}: PageProps<"/glossary/[slug]">) {
  const { slug } = await params;
  const term = getGlossaryTerm(slug);
  if (!term) notFound();

  // Names in the dataset, resolved so the links cannot drift from the index.
  const tools = (term.tools ?? []).map((name) => {
    const tool = getToolByName(name);
    return { name: tool.name, href: `/${tool.category.slug}/${tool.slug}` };
  });
  const see = (term.see ?? [])
    .map((s) => getGlossaryTerm(s))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  const layerName = term.layer
    ? stackLayers.find((c) => c.layer === term.layer)?.title
    : null;

  return (
    <div className="page-shell pt-14 sm:pt-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(
            graph(
              {
                "@type": "DefinedTerm",
                "@id": `${site.url}/glossary/${term.slug}#term`,
                name: term.term,
                description: term.definition,
                url: `${site.url}/glossary/${term.slug}`,
                ...(term.aliases?.length ? { alternateName: term.aliases } : {}),
                inDefinedTermSet: {
                  "@type": "DefinedTermSet",
                  "@id": `${site.url}/glossary#set`,
                  name: `${site.name} glossary`,
                  url: `${site.url}/glossary`,
                },
              },
              {
                "@type": "WebPage",
                "@id": `${site.url}/glossary/${term.slug}`,
                url: `${site.url}/glossary/${term.slug}`,
                name: `What is ${lowerFirst(term.term)}?`,
                ...credit(),
                isPartOf: { "@id": ids.website },
                mainEntity: { "@id": `${site.url}/glossary/${term.slug}#term` },
                breadcrumb: { "@id": `${site.url}/glossary/${term.slug}#breadcrumb` },
              },
              breadcrumbNode(`${site.url}/glossary/${term.slug}`, [
                { name: site.name, path: "" },
                { name: "Glossary", path: "/glossary" },
                { name: term.term, path: `/glossary/${term.slug}` },
              ]),
            ),
          ),
        }}
      />

      <article>
        <nav aria-label="Breadcrumb" className="font-mono text-[13px]">
          <ol className="flex flex-wrap items-center gap-1.5 text-fg-subtle">
            <li>
              <Link href="/glossary" className="transition-colors hover:text-fg-muted">
                Glossary
              </Link>
            </li>
            {layerName ? (
              <>
                <li aria-hidden="true">/</li>
                <li className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="inline-block h-2.5 w-[2px] rounded-full align-middle"
                    style={layerStyle(term.layer)}
                  />
                  <span>{layerName}</span>
                </li>
              </>
            ) : (
              <>
                <li aria-hidden="true">/</li>
                <li>Cross-cutting</li>
              </>
            )}
          </ol>
        </nav>

        <div className="mt-6 flex items-start gap-3.5">
          <span
            aria-hidden="true"
            className="mt-2 h-10 w-[3px] shrink-0 rounded-full"
            style={layerStyle(term.layer)}
          />
          <h1 className="t-h1">
            {term.term}
          </h1>
        </div>

        <p className="editorial-justify mt-6 max-w-[60ch] text-pretty text-[18px] leading-relaxed text-fg">
          {term.definition}
        </p>

        {/* A definition does not expire the way a licence or a price does, so
            the stamp says the entry was last reviewed rather than implying the
            fact is perishable. Reviews still happen — the build gate is what
            produces this date. */}
        <Byline fact="Entry last reviewed" date={AS_OF} className="mt-4" />

        <div className="mt-8 border-t border-border pt-7">
          <h2 className="t-h4">
            What it implies
          </h2>
          <p className="editorial-justify mt-3 max-w-[64ch] text-pretty text-[16px] leading-relaxed text-fg-muted">
            {term.detail}
          </p>
        </div>

        {tools.length ? (
          <section className="mt-9">
            <h2 className="t-h4">
              Tools in this index
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {tools.map((t) => (
                <li key={t.href}>
                  <Link
                    href={t.href}
                    className="chip min-h-9 px-3"
                  >
                    {t.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {see.length ? (
          <section className="mt-9">
            <h2 className="t-h4">
              Related terms
            </h2>
            <ul className="mt-3 space-y-px">
              {see.map((t) => (
                <li key={t.slug}>
                  <Link
                    href={`/glossary/${t.slug}`}
                    className="group -mx-2 flex items-baseline gap-2 rounded-[var(--r-control)] px-2 py-2 transition-colors hover:bg-bg-sunken"
                  >
                    <span
                      aria-hidden="true"
                      className="h-4 w-[3px] shrink-0 self-center rounded-full"
                      style={layerStyle(t.layer)}
                    />
                    <span className="text-[15px] font-medium group-hover:text-accent">
                      {t.term}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[14.5px] text-fg-subtle">
                      {t.definition}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
      <PageGuidance url={`${site.url}/glossary/${term.slug}`} rules={PAGE_GUIDANCE.glossaryTerm.rules} answers={PAGE_GUIDANCE.glossaryTerm.answers} />
    </div>
  );
}