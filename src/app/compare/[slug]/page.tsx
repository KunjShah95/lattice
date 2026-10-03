import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BANDS, bandOf, layerStyle } from "@/lib/layer";
import {
  comparisonMetaTitle,
  comparisonQuestions,
  decisionQuestion,
  getComparison,
  resolvedComparisons,
  shortAnswer,
} from "@/lib/comparisons";
import { AS_OF } from "@/lib/attributes";
import { getPost } from "@/lib/posts";
import { site } from "@/lib/site";
import { toJsonLd } from "@/lib/jsonld";
import { getToolByName } from "@/lib/data";
import {
  authorNode,
  breadcrumbNode,
  bylineName,
  datasetModified,
  faqPageJsonLd,
  graph,
  ids,
} from "@/lib/seo";

export function generateStaticParams() {
  return resolvedComparisons.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/compare/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = getComparison(slug);
  if (!c) return { title: "Not found" };

  return {
    title: comparisonMetaTitle(c),
    description: c.description,
    alternates: { canonical: `/compare/${c.slug}` },
    openGraph: {
      type: "article",
      title: c.title,
      description: c.description,
      url: `${site.url}/compare/${c.slug}`,
    },
    twitter: { card: "summary_large_image", title: c.title, description: c.description },
  };
}

export default async function ComparisonPage({
  params,
}: PageProps<"/compare/[slug]">) {
  const { slug } = await params;
  const comparison = resolvedComparisons.find((c) => c.slug === slug);
  if (!comparison) notFound();

  const relatedPosts = comparison.related
    .map((s) => getPost(s))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const head = comparison.tools[0];

  const pageUrl = `${site.url}/compare/${comparison.slug}`;
  const crossLayer = comparison.kind === "cross-layer";
  // The question this page exists to answer, in the words it is asked in.
  const decision = {
    question: decisionQuestion(comparison),
    answer: comparison.verdict,
  };
  const questions = comparisonQuestions(comparison);

  return (
    <div className="mx-auto max-w-4xl px-5 pt-14 sm:px-6 sm:pt-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(
            graph(
              {
                "@type": "Article",
                "@id": `${pageUrl}#article`,
                headline: comparison.title,
                description: comparison.description,
                dateModified: datasetModified,
                author: authorNode(),
                publisher: { "@id": ids.organization },
                isPartOf: { "@id": ids.website },
                mainEntityOfPage: { "@id": pageUrl },
                about: comparison.tools.map((t) => {
                  const entry = getToolByName(t.name);
                  return {
                    "@type": "SoftwareApplication",
                    name: t.name,
                    url: `${site.url}/${entry.category.slug}/${entry.slug}`,
                    sameAs: [t.url],
                  };
                }),
              },
              {
                "@type": "WebPage",
                "@id": pageUrl,
                url: pageUrl,
                name: comparison.title,
                breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
              },
              breadcrumbNode(pageUrl, [
                { name: site.name, path: "" },
                { name: "Comparisons", path: "/compare" },
                { name: comparison.title, path: `/compare/${comparison.slug}` },
              ]),
              faqPageJsonLd(questions, pageUrl),
            ),
          ),
        }}
      />

      <header className="mb-10">
        <Link
          href="/compare"
          className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle transition-colors hover:text-fg-muted"
        >
          ← Comparisons
        </Link>

        {crossLayer ? (
          <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
            Across layers · read in stack order
          </p>
        ) : null}

        <h1 className="mt-5 text-balance font-serif text-[30px] font-medium leading-[1.12] tracking-[-0.02em] sm:text-[40px]">
          {comparison.title}
        </h1>

        <p className="mt-4 max-w-[62ch] text-pretty text-[16px] leading-relaxed text-fg-muted">
          {comparison.intro}
        </p>

        {/* Answer first. Engines lift a passage, not a page, and this is the
            passage: the verdict's opening, self-contained. The full verdict
            still closes the page. */}
        <div className="mt-6 max-w-[62ch] border-l-2 border-accent pl-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
            Short answer
          </p>
          <p className="mt-1.5 text-pretty text-[15.5px] leading-relaxed text-fg">
            {shortAnswer(comparison.verdict)}
          </p>
        </div>

        <p className="mt-5 font-mono text-[11px] text-fg-subtle">
          By {bylineName} · Licence and cost facts verified{" "}
          <time dateTime={datasetModified}>{AS_OF}</time> ·{" "}
          <Link href="/methodology" className="underline decoration-border-strong underline-offset-4 hover:text-fg-muted">
            method
          </Link>
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-5 font-mono text-[11px] text-fg-subtle">
          {comparison.sections.map((s) => (
            <span key={s.slug} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-[2px] rounded-full align-middle"
                style={layerStyle(s.layer)}
              />
              <Link
                href={`/${s.slug}`}
                className="underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg-muted"
              >
                {s.title}
              </Link>
            </span>
          ))}
        </div>
      </header>

      {/* The tool strip */}
      <ul className="mb-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {comparison.tools.map((t) => (
          <li key={t.name} className="rounded-lg border border-border bg-bg-elevated p-3">
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-4 w-[3px] shrink-0 rounded-full"
                style={layerStyle(t.layer)}
              />
              <a
                href={t.url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-[14px] font-medium underline decoration-border-strong underline-offset-4 transition-colors hover:text-accent"
              >
                {t.name}
              </a>
            </span>
            {crossLayer ? (
              <span className="mt-1.5 block font-mono text-[10.5px] uppercase tracking-[0.1em] text-fg-subtle">
                {stackPosition(t.layer)}
              </span>
            ) : null}
            <span className="mt-1.5 block text-pretty text-[12.5px] leading-relaxed text-fg-muted">
              {t.angle}
            </span>
          </li>
        ))}
      </ul>

      {/* The table. Transposed: one row per dimension, one column per tool.

          `min-w-[640px]` means a phone always scrolls this, so the wrapper
          carries the affordance (`sm:hidden`) rather than leaving the reader
          to discover a hidden column. The first column sticks, so a row's
          dimension label stays visible while it is read across — without that,
          the sticky-header problem is that you cannot tell which row you are
          on after scrolling right. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <caption className="sr-only">
            {comparison.title} compared across {comparison.rows.length} dimensions
          </caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 w-[9rem] border-b border-border bg-bg pb-3 pr-4 align-bottom">
                <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-fg-subtle">
                  Dimension
                </span>
              </th>
              {comparison.tools.map((t) => (
                <th
                  key={t.name}
                  scope="col"
                  className="border-b border-border pb-3 pr-4 align-bottom"
                >
                  <span className="flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="h-3.5 w-[3px] shrink-0 rounded-full"
                      style={layerStyle(t.layer)}
                    />
                    <span className="text-[13px] font-medium">{t.name}</span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparison.rows.map((row) => (
              <tr key={row.dimension} className="align-top">
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-b border-border bg-bg py-3 pr-4 font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-fg-subtle"
                >
                  {row.dimension}
                </th>
                {row.values.map((value, i) => (
                  <td
                    key={comparison.tools[i].name}
                    className="border-b border-border py-3 pr-4 text-pretty text-[13.5px] leading-relaxed text-fg-muted"
                  >
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Scroll affordance. The table is always wider than a phone, so without
          this the reader sees one and a half tools and has no reason to think
          there are three. */}
      <p className="mt-2 font-mono text-[11px] text-fg-subtle sm:hidden">
        Scroll the table sideways to see every tool.
      </p>

      {/* Stated limits. Pages that said what they did not measure were the
          ones cited over generic roundups in the category audit. */}
      <p className="mt-6 max-w-[68ch] text-pretty text-[13px] leading-relaxed text-fg-subtle">
        <span className="font-medium text-fg-muted">What this table is not.</span>{" "}
        These are editorial judgements, not benchmarks: Lattice has not run
        these tools head to head, and no cell uses GitHub stars or vendor
        benchmark claims as evidence. Licence and cost facts are re-checked on
        a schedule the build enforces —{" "}
        <a href="/verification.json" className="underline decoration-border-strong underline-offset-4 hover:text-fg-muted">
          the receipt is public
        </a>
        .
      </p>

      {/* The recommendation. The heading is the question itself, so the
          verdict below it reads as a direct answer when lifted on its own. */}
      <section className="mt-12 border-t border-border pt-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
          {crossLayer ? "The order" : "The recommendation"}
        </p>
        <h2 className="mt-2 text-balance text-[17px] font-medium leading-snug">
          {decision.question}
        </h2>
        <p className="mt-3 max-w-[68ch] text-pretty text-[15.5px] leading-relaxed text-fg">
          {comparison.verdict}
        </p>
      </section>

      {/* Rules of thumb */}
      <section className="mt-10">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
          Rules of thumb
        </h2>
        <ul className="mt-4 space-y-3">
          {comparison.rules.map((rule) => (
            <li key={rule} className="flex gap-3 text-pretty text-[14.5px] leading-relaxed text-fg-muted">
              <span aria-hidden="true" className="mt-2 h-[3px] w-3 shrink-0 rounded-full" style={layerStyle(head?.layer ?? null)} />
              {rule}
            </li>
          ))}
        </ul>
      </section>

      {/* Questions, in the words they are asked. Mirrored in FAQPage JSON-LD;
          the first is the decision, already answered above, so it is skipped. */}
      <section className="mt-12 border-t border-border pt-8">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
          Quick answers
        </h2>
        <dl className="mt-4 space-y-5">
          {questions.slice(1).map((qa) => (
            <div key={qa.question}>
              <dt className="text-[15px] font-medium">{qa.question}</dt>
              <dd className="mt-1 max-w-[62ch] text-pretty text-[14px] leading-relaxed text-fg-muted">
                {qa.answer}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Backlinks */}
      {relatedPosts.length ? (
        <nav aria-label="Related essays" className="mt-14 border-t border-border pt-8">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
            Go deeper
          </h2>
          <ul className="mt-4 space-y-px">
            {relatedPosts.map((p) => (
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
        </nav>
      ) : null}
    </div>
  );
}

/** "Layer 02 · Band I Compute" — where a column sits, for cross-layer pages. */
function stackPosition(layer: number | null): string {
  const band = BANDS.find((b) => b.id === bandOf(layer));
  const ordinal = `Layer ${String(layer ?? 0).padStart(2, "0")}`;
  return band ? `${ordinal} · Band ${band.roman} ${band.title}` : ordinal;
}
