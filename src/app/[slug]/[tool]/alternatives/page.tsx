import type { Metadata } from "next";
import { AS_OF } from "@/lib/attributes";
import Link from "next/link";
import { notFound } from "next/navigation";
import { layerStyle } from "@/lib/layer";
import { getTool } from "@/lib/data";
import { resolvedComparisons } from "@/lib/comparisons";
import { getSubstitutes, hasAlternativesPage, verdictFor } from "@/lib/alternatives";
import { site } from "@/lib/site";
import { toJsonLd } from "@/lib/jsonld";
import {
  breadcrumbNode,
  credit,
  faqPageJsonLd,
  graph,
  ids,
  listNames,
} from "@/lib/seo";
import { Byline } from "@/components/byline";
import { allAlternativesPages } from "@/lib/alternatives";

/**
 * `/<section>/<tool>/alternatives` — the substitutes graph as a page.
 *
 * This is the highest-leverage unbuilt surface in the category, and the reason
 * is specific rather than sentimental.
 *
 * A vendor can publish "alternatives to X" for their own product, because X is
 * losing to them. What no vendor can publish is an honest alternatives page for
 * a competitor, including the line "this one is not actually a substitute". A
 * page that says so — where the cross-layer entries are marked adjacent rather
 * than interchangeable — cannot be produced by anyone with a commercial
 * interest in the answer. That is the whole product, and it is why the graph
 * here is bidirectional rather than curated toward a conclusion.
 *
 * Only tools with enough substance get a page. `MIN_ALTERNATIVES` exists so
 * this does not manufacture thin answers: two rows with no verdict is worse
 * than no page, because it looks like an answer and is not one. Everything
 * else keeps the same information on its own tool page.
 */

export function generateStaticParams() {
  return allAlternativesPages();
}

export async function generateMetadata({
  params,
}: PageProps<"/[slug]/[tool]/alternatives">): Promise<Metadata> {
  const { slug, tool } = await params;
  const found = getTool(slug, tool);
  if (!found) return { title: "Not found" };

  const { tool: entry, category } = found;
  const subs = getSubstitutes(slug, tool);
  if (!hasAlternativesPage(slug, tool)) return { title: "Not found" };

  // The title carries the query verbatim. "Alternatives to X" is the phrase a
  // reader types after they have already decided to leave, and matching it is
  // worth more than a cleverer title.
  return {
    // Year of the last verification, not the build: it has to stay true.
    title: `${entry.name} alternatives (${AS_OF.slice(0, 4)}): ${subs.length} substitutes compared`,
    description:
      `${subs.length} recorded substitutes for ${entry.name}, with what each one is ` +
      `for and when it is not a real swap. Compared on layer, deployment and licence — ` +
      `plus when to skip each one.`,
    alternates: { canonical: `/${category.slug}/${entry.slug}/alternatives` },
    openGraph: {
      type: "article",
      title: `${entry.name} alternatives`,
      description: `${subs.length} substitutes for ${entry.name}, and where each stops being a fair comparison.`,
      url: `${site.url}/${category.slug}/${entry.slug}/alternatives`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${entry.name} alternatives`,
      description: `${subs.length} substitutes for ${entry.name}.`,
    },
  };
}

export default async function AlternativesPage({
  params,
}: PageProps<"/[slug]/[tool]/alternatives">) {
  const { slug, tool } = await params;
  const found = getTool(slug, tool);
  if (!found) notFound();

  const { tool: entry, category } = found;
  const subs = getSubstitutes(slug, tool);
  // Defence in depth: `generateStaticParams` should already have excluded
  // these, but a directly-requested URL must not render a thin page.
  if (!hasAlternativesPage(slug, tool)) notFound();

  const verdict = verdictFor(entry, category, subs);
  const pageUrl = `${site.url}/${category.slug}/${entry.slug}/alternatives`;

  // Grouped so the cross-layer entries are visibly not the same kind of
  // thing. Collapsing them into one list is the mistake every aggregator
  // makes, and it is what makes a reader think a vector store can replace an
  // inference engine.
  const inLayer = subs.filter((s) => s.category.layer === category.layer);
  const adjacent = subs.filter((s) => s.category.layer !== category.layer);

  // A comparison that includes this tool is a better answer than this page,
  // so it goes first.
  const inComparisons = resolvedComparisons.filter((c) =>
    c.tools.some((t) => t.name === entry.name),
  );

  const decision = {
    question: `What should you use instead of ${entry.name}?`,
    answer: verdict,
  };

  return (
    <div className="mx-auto max-w-3xl px-5 pt-14 sm:px-6 sm:pt-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd(
            graph(
              {
                "@type": "WebPage",
                "@id": pageUrl,
                url: pageUrl,
                name: `${entry.name} alternatives`,
                description: decision.answer,
                ...credit(),
                isPartOf: { "@id": ids.website },
                about: {
                  "@type": "SoftwareApplication",
                  name: entry.name,
                  url: `${site.url}/${category.slug}/${entry.slug}`,
                },
                breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
              },
              breadcrumbNode(pageUrl, [
                { name: site.name, path: "" },
                { name: category.title, path: `/${category.slug}` },
                { name: entry.name, path: `/${category.slug}/${entry.slug}` },
                {
                  name: "Alternatives",
                  path: `/${category.slug}/${entry.slug}/alternatives`,
                },
              ]),
              faqPageJsonLd([decision], pageUrl),
            ),
          ),
        }}
      />

      <header>
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
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href={`/${category.slug}/${entry.slug}`}
                className="transition-colors hover:text-fg-muted"
              >
                {entry.name}
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
            <h1 className="text-balance font-serif text-[30px] font-medium leading-[1.12] tracking-[-0.02em] sm:text-[38px]">
              {entry.name} alternatives
            </h1>
            <p className="mt-2 font-mono text-[12px] text-fg-subtle">
              {subs.length} substitutes · {inLayer.length} in{" "}
              {category.short.toLowerCase()} · {adjacent.length} adjacent
            </p>
          </div>
        </div>
      </header>

      {/* The verdict. Placed above the list because the question asked is the
          question answered — a reader who only reads this paragraph should
          still have something usable. */}
      <section className="mt-8 border-t border-border pt-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
          The short answer
        </p>
        <p className="mt-2.5 max-w-[64ch] text-pretty text-[15.5px] leading-relaxed text-fg">
          {verdict}
        </p>
        {/* Sits directly under the verdict because that is the paragraph a
            citation lifts, and a lifted paragraph with no accountable name on
            the page is the one an engine has least reason to quote. */}
        <Byline fact="Comparison reviewed" date={entry.asOf} className="mt-4" />
      </section>

      {/* A real comparison beats this page. */}
      {inComparisons.length ? (
        <section className="mt-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
            Better than this page
          </p>
          <ul className="mt-3 space-y-px">
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

      {/* In-layer substitutes. These are the real answer. */}
      {inLayer.length ? (
        <section className="mt-12 border-t border-border pt-7">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[11px] tabular-nums text-fg-subtle">
              {inLayer.length}
            </span>
            <h2 className="font-serif text-[20px] font-medium tracking-[-0.015em]">
              Real substitutes
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
              in {category.title}
            </span>
          </div>

          <ul className="mt-5 space-y-px">
            {inLayer.map((s) => (
              <li key={`${s.category.slug}-${s.tool.slug}`} className="border-t border-border py-4 first:border-t-0 first:pt-0">
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 h-6 w-[3px] shrink-0 rounded-full"
                    style={layerStyle(s.category.layer)}
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/${s.category.slug}/${s.tool.slug}`}
                      className="text-[15px] font-medium underline decoration-transparent underline-offset-2 transition-colors hover:decoration-border-strong"
                    >
                      {s.tool.name}
                    </Link>
                    <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                      {s.tool.kind}
                      {s.tool.license ? ` · ${s.tool.license}` : ""}
                    </span>
                    <p className="mt-1 text-pretty text-[13px] leading-relaxed text-fg-muted">
                      {s.tool.blurb}
                    </p>
                    {/* Both halves. A substitutes page that only carries the
                        positive half is a vendor page with better manners. */}
                    <p className="mt-1.5 text-pretty text-[12.5px] leading-relaxed text-fg-muted">
                      <span className="text-fg-subtle">Use when</span>{" "}
                      {s.tool.useWhen}
                    </p>
                    <p className="mt-1 text-pretty text-[12.5px] leading-relaxed text-fg-subtle">
                      <span className="text-fg-muted">Skip when</span>{" "}
                      {s.tool.skipWhen}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Adjacent, not interchangeable. The section exists so the page can be
          honest about the difference; collapsing it into the list above would
          be the single most misleading thing this page could do. */}
      {adjacent.length ? (
        <section className="mt-12 border-t border-border pt-7">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[11px] tabular-nums text-fg-subtle">
              {adjacent.length}
            </span>
            <h2 className="font-serif text-[20px] font-medium tracking-[-0.015em]">
              Adjacent, not substitutes
            </h2>
          </div>
          <p className="mt-3 max-w-[62ch] text-pretty text-[13.5px] leading-relaxed text-fg-muted">
            These appear in the same graph but sit in a different layer. They solve a
            neighbouring problem, not this one — including them in a shortlist is the
            most common mistake made when migrating off {entry.name}.
          </p>

          <ul className="mt-5 space-y-px">
            {adjacent.map((s) => (
              <li key={`${s.category.slug}-${s.tool.slug}`} className="border-t border-border py-3.5 first:border-t-0 first:pt-0">
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 h-6 w-[3px] shrink-0 rounded-full opacity-50"
                    style={layerStyle(s.category.layer)}
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/${s.category.slug}/${s.tool.slug}`}
                      className="text-[14.5px] font-medium underline decoration-transparent underline-offset-2 transition-colors hover:decoration-border-strong"
                    >
                      {s.tool.name}
                    </Link>
                    <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                      {s.category.title}
                    </span>
                    <p className="mt-1 text-pretty text-[13px] leading-relaxed text-fg-muted">
                      {s.tool.blurb}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-12 border-t border-border pt-6 text-[12.5px] leading-relaxed text-fg-subtle">
        This graph is bidirectional and unsponsored. A tool appears here if{" "}
        {entry.name} or another entry names it as a substitute, and{" "}
        {listNames(subs.map((s) => s.tool.name))} point at {entry.name} as well.
        {" "}
        <Link href="/methodology" className="underline decoration-border-strong underline-offset-4 hover:text-fg-muted">
          How this index is compiled
        </Link>{" "}
        — including where it is wrong.
      </p>
    </div>
  );
}