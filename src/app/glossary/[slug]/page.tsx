import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { layerStyle } from "@/lib/layer";
import { getGlossaryTerm, glossary } from "@/lib/glossary";
import { getToolByName, stackLayers } from "@/lib/data";
import { site } from "@/lib/site";
import { toJsonLd } from "@/lib/jsonld";

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
    title: term.term,
    description: term.definition,
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
    <div className="mx-auto max-w-3xl px-5 pt-14 sm:px-6 sm:pt-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd({
            "@context": "https://schema.org",
            "@type": "DefinedTerm",
            name: term.term,
            description: term.definition,
            inDefinedTermSet: {
              "@type": "DefinedTermSet",
              name: `${site.name} glossary`,
              url: `${site.url}/glossary`,
            },
          }),
        }}
      />

      <article>
        <nav aria-label="Breadcrumb" className="font-mono text-[11px]">
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
          <h1 className="text-balance font-serif text-[32px] font-medium leading-[1.12] tracking-[-0.02em] sm:text-[40px]">
            {term.term}
          </h1>
        </div>

        <p className="mt-6 max-w-[60ch] text-pretty text-[17px] leading-relaxed text-fg">
          {term.definition}
        </p>

        <div className="mt-8 border-t border-border pt-7">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
            What it implies
          </h2>
          <p className="mt-3 max-w-[64ch] text-pretty text-[15px] leading-relaxed text-fg-muted">
            {term.detail}
          </p>
        </div>

        {tools.length ? (
          <section className="mt-9">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
              Tools in this index
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {tools.map((t) => (
                <li key={t.href}>
                  <Link
                    href={t.href}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[13px] text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
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
            <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
              Related terms
            </h2>
            <ul className="mt-3 space-y-px">
              {see.map((t) => (
                <li key={t.slug}>
                  <Link
                    href={`/glossary/${t.slug}`}
                    className="group -mx-2 flex items-baseline gap-2 rounded-md px-2 py-2 transition-colors hover:bg-bg-sunken"
                  >
                    <span
                      aria-hidden="true"
                      className="h-4 w-[3px] shrink-0 self-center rounded-full"
                      style={layerStyle(t.layer)}
                    />
                    <span className="text-[14px] font-medium group-hover:text-accent">
                      {t.term}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-fg-subtle">
                      {t.definition}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </div>
  );
}