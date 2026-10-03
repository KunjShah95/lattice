import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AS_OF } from "@/lib/attributes";
import { BANDS, bandColor, layerStyle } from "@/lib/layer";
import { toJsonLd } from "@/lib/jsonld";
import {
  authorNode,
  breadcrumbNode,
  bylineName,
  datasetModified,
  faqPageJsonLd,
  graph,
  ids,
} from "@/lib/seo";
import { site } from "@/lib/site";
import { getSymptom, resolvedSymptoms, symptomQuestions } from "@/lib/symptoms";

export function generateStaticParams() {
  return resolvedSymptoms.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/fix/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const s = getSymptom(slug);
  if (!s) return { title: "Not found" };
  // The title is the query; the suffix says what kind of answer this is.
  const title = `${s.title} A layer-by-layer checklist (${AS_OF.slice(0, 4)})`;
  return {
    title,
    description: s.description,
    alternates: { canonical: `/fix/${s.slug}` },
    openGraph: {
      type: "article",
      title: s.title,
      description: s.description,
      url: `${site.url}/fix/${s.slug}`,
    },
    twitter: { card: "summary_large_image", title: s.title, description: s.description },
  };
}

export default async function SymptomPage({ params }: PageProps<"/fix/[slug]">) {
  const { slug } = await params;
  const s = getSymptom(slug);
  if (!s) notFound();

  const band = BANDS.find((b) => b.id === s.band);
  const pageUrl = `${site.url}/fix/${s.slug}`;
  const questions = symptomQuestions(s);

  return (
    <div className="mx-auto max-w-3xl px-5 pt-14 sm:px-6 sm:pt-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(
            graph(
              {
                "@type": "Article",
                "@id": `${pageUrl}#article`,
                headline: s.title,
                description: s.description,
                dateModified: datasetModified,
                author: authorNode(),
                publisher: { "@id": ids.organization },
                isPartOf: { "@id": ids.website },
                mainEntityOfPage: { "@id": pageUrl },
              },
              {
                "@type": "HowTo",
                "@id": `${pageUrl}#checklist`,
                name: s.title,
                step: s.checks.map((c, i) => ({
                  "@type": "HowToStep",
                  position: i + 1,
                  name: c.check,
                  text: c.why,
                })),
              },
              {
                "@type": "WebPage",
                "@id": pageUrl,
                url: pageUrl,
                name: s.title,
                breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
              },
              breadcrumbNode(pageUrl, [
                { name: site.name, path: "" },
                { name: "Fix a symptom", path: "/fix" },
                { name: s.title, path: `/fix/${s.slug}` },
              ]),
              faqPageJsonLd(questions, pageUrl),
            ),
          ),
        }}
      />

      <header>
        <Link
          href="/fix"
          className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle transition-colors hover:text-fg-muted"
        >
          ← Fix a symptom
        </Link>

        {band ? (
          <p className="mt-5 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: bandColor(band.id) }} />
            Band {band.roman} · {band.title} · &ldquo;{band.sounds}&rdquo;
          </p>
        ) : null}

        <h1 className="mt-4 text-balance font-serif text-[32px] font-medium leading-[1.1] tracking-[-0.02em] sm:text-[42px]">
          {s.title}
        </h1>

        <div className="mt-6 max-w-[62ch] border-l-2 border-accent pl-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
            Short answer
          </p>
          <p className="mt-1.5 text-pretty text-[16px] leading-relaxed text-fg">{s.answer}</p>
        </div>

        <p className="mt-5 font-mono text-[11px] text-fg-subtle">
          By {bylineName} · Tool facts verified{" "}
          <time dateTime={datasetModified}>{AS_OF}</time> ·{" "}
          <Link href="/methodology" className="underline decoration-border-strong underline-offset-4 hover:text-fg-muted">
            method
          </Link>
        </p>
      </header>

      {/* The checklist. Ordered cheapest-first, not by layer, so the layer tag
          on each step is what shows the reader where in the stack they are. */}
      <section className="mt-12 border-t border-border pt-8">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
          Check in this order
        </h2>
        <ol className="mt-6 space-y-10">
          {s.checks.map((c, i) => (
            <li key={c.check} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3">
              <span className="font-mono text-[13px] text-fg-subtle">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3 className="text-balance text-[17px] font-medium leading-snug">{c.check}</h3>
                <p className="mt-1 inline-flex items-center gap-1.5 font-mono text-[11px] text-fg-subtle">
                  <span aria-hidden="true" className="h-3 w-[3px] rounded-full" style={layerStyle(c.layer)} />
                  Layer {String(c.layer).padStart(2, "0")} ·{" "}
                  <Link href={`/${c.section.slug}`} className="underline decoration-border-strong underline-offset-4 hover:text-fg-muted">
                    {c.section.title}
                  </Link>
                </p>
                <p className="mt-2 max-w-[62ch] text-pretty text-[14.5px] leading-relaxed text-fg-muted">{c.why}</p>

                {c.tools.length ? (
                  <ul className="mt-4 space-y-3">
                    {c.tools.map((t) => (
                      <li key={t.name} className="rounded-md border border-border bg-bg-elevated px-3 py-2.5">
                        <Link href={t.href} className="text-[14px] font-medium underline decoration-border-strong underline-offset-4 hover:text-accent">
                          {t.name}
                        </Link>
                        <dl className="mt-1.5 grid gap-1 text-[13px] leading-relaxed sm:grid-cols-[4.5rem_minmax(0,1fr)]">
                          <dt className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">Use when</dt>
                          <dd className="text-fg-muted">{t.useWhen}</dd>
                          <dt className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">Skip when</dt>
                          <dd className="text-fg">{t.skipWhen}</dd>
                        </dl>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12 border-t border-border pt-8">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
          Looks like a fix, is not
        </h2>
        <ul className="mt-4 space-y-3">
          {s.notTheFix.map((n) => (
            <li key={n} className="flex gap-3 text-pretty text-[14.5px] leading-relaxed text-fg-muted">
              <span aria-hidden="true" className="font-mono text-fg-subtle">×</span>
              {n}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 border-t border-border pt-8">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
          Quick answers
        </h2>
        <dl className="mt-4 space-y-5">
          {questions.slice(1).map((qa) => (
            <div key={qa.question}>
              <dt className="text-[15px] font-medium">{qa.question}</dt>
              <dd className="mt-1 max-w-[62ch] text-pretty text-[14px] leading-relaxed text-fg-muted">{qa.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      <nav aria-label="Read next" className="mt-14 border-t border-border pt-8">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">Read next</h2>
        <ul className="mt-4 space-y-px">
          {s.comparisons.map((c) => (
            <li key={c.slug}>
              <Link href={`/compare/${c.slug}`} className="group -mx-2 block rounded-md px-2 py-3 transition-colors hover:bg-bg-sunken">
                <span className="font-mono text-[11px] text-fg-subtle">Compare · </span>
                <span className="text-[15px] font-medium group-hover:text-accent">{c.title}</span>
              </Link>
            </li>
          ))}
          {s.related.map((p) => (
            <li key={p.slug}>
              <Link href={`/blog/${p.slug}`} className="group -mx-2 block rounded-md px-2 py-3 transition-colors hover:bg-bg-sunken">
                <span className="font-mono text-[11px] text-fg-subtle">Essay · </span>
                <span className="text-[15px] font-medium group-hover:text-accent">{p.title}</span>
                <span className="mt-0.5 block text-pretty text-[13px] leading-relaxed text-fg-muted">{p.dek}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
