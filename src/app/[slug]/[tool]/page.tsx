import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { layerStyle } from "@/lib/layer";
import { roleTitle, rolesInOrder } from "@/lib/roles";
import { StackSpine } from "@/components/stack-spine";
import {
  allTools,
  getAlternatives,
  getAlternativeTo,
  getSecondHomes,
  getSiblingTools,
  getTool,
} from "@/lib/data";
import { postsForSection } from "@/lib/posts";
import { resolvedComparisons } from "@/lib/comparisons";
import { hasAlternativesPage } from "@/lib/alternatives";
import { site } from "@/lib/site";
import { toJsonLd } from "@/lib/jsonld";
import {
  breadcrumbNode,
  datasetModified,
  describeKind,
  faqPageJsonLd,
  graph,
  ids,
  toolDefinition,
  toolEntityJsonLd,
  toolQuestions,
} from "@/lib/seo";

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

  // Title carries the three things people search a tool name with: what it
  // is, when to use it, and what else to look at.
  return {
    title: `${tool.name}: when to use it, and alternatives`,
    description: `${tool.name} is ${describeKind(tool)} for ${category.title.toLowerCase()}. ${tool.blurb} When to use it, when to skip it, licence and alternatives.`,
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
  const alternatives = getAlternatives(categorySlug, toolSlug);
  const alternativeTo = getAlternativeTo(categorySlug, toolSlug);
  const secondHomes = getSecondHomes(categorySlug, toolSlug);

  // Comparisons that include this tool — the most valuable links on the page,
  // because they are the only place a tool appears in a decision context.
  const inComparisons = resolvedComparisons.filter((c) =>
    c.tools.some((t) => t.name === tool.name),
  );

  const pageUrl = `${site.url}/${category.slug}/${tool.slug}`;
  const questions = toolQuestions(
    tool,
    category,
    alternatives.map((a) => a.tool.name),
    siblings.map((s) => s.name),
  );
  // The definition and the use/skip pair already render above as the lead
  // paragraph and the decision boxes; the rest get their own answer blocks.
  const answerBlocks = questions.filter(
    (qa) => !/^(What is|When should)/.test(qa.question),
  );

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
                name: `${tool.name}: when to use it, and alternatives`,
                description: toolDefinition(tool, category),
                dateModified: datasetModified,
                isPartOf: { "@id": ids.website },
                publisher: { "@id": ids.organization },
                about: { "@id": `${pageUrl}#subject` },
                mainEntity: { "@id": `${pageUrl}#subject` },
                breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
              },
              toolEntityJsonLd(tool, category, pageUrl),
              breadcrumbNode(pageUrl, [
                { name: site.name, path: "" },
                { name: category.title, path: `/${category.slug}` },
                // One role in the trail when the tool has a single owner, all of
                // them when it does not — a breadcrumb that named one role for a
                // two-role tool would be a small false claim in structured data.
                ...rolesInOrder(tool.roles).map((r) => ({
                  name: roleTitle(r),
                  path: `/roles/${r}`,
                })),
                { name: tool.name, path: `/${category.slug}/${tool.slug}` },
              ]),
              faqPageJsonLd(questions, pageUrl),
            ),
          ),
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
              <span aria-hidden="true"> · </span>
              {tool.kind}
              {tool.deployment ? (
                <>
                  <span aria-hidden="true"> · </span>
                  {tool.deployment}
                </>
              ) : null}
            </p>
          </div>
        </div>

        {/* What it is, as a sentence that names its subject. Answer engines
            lift passages, not layouts — "Paged-attention inference engine…"
            on its own does not say what it is describing. */}
        <p className="mt-6 text-pretty text-[16px] leading-relaxed text-fg-muted">
          {toolDefinition(tool, category)}
        </p>

        {/* The facts a decision turns on. Licence and deployment are the two
            that most often rule a tool in or out before anything else.

            `asOf` is promoted out of this list into a stamp of its own below.
            It is not metadata: the build throws if any entry is more than six
            months old, so the date on this page is the receipt for a check
            that actually happened. No competitor in this category can show
            you one — the nearest, ToolDirectory, re-checks every 90 days by
            hand. Saying so is the cheapest trust the site can buy. */}
        <dl className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-border py-3 font-mono text-[11.5px]">
          {tool.license ? (
            <div className="flex gap-1.5">
              <dt className="text-fg-subtle">licence</dt>
              <dd className="text-fg-muted">{tool.license}</dd>
            </div>
          ) : null}
          {tool.language ? (
            <div className="flex gap-1.5">
              <dt className="text-fg-subtle">language</dt>
              <dd className="text-fg-muted">{tool.language}</dd>
            </div>
          ) : null}
          <div className="flex gap-1.5">
            <dt className="text-fg-subtle">cost</dt>
            <dd className="text-fg-muted">{tool.cost}</dd>
          </div>
          {/* Who owns this, which is the question a reader who has found a tool
              by search cannot yet answer. Links back into the role view so the
              axis is reachable from the page people actually land on. */}
          <div className="flex gap-1.5">
            <dt className="text-fg-subtle">owned by</dt>
            <dd className="flex flex-wrap gap-1">
              {rolesInOrder(tool.roles).map((r) => (
                <Link
                  key={r}
                  href={`/roles/${r}`}
                  className="underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-accent"
                >
                  {roleTitle(r)}
                </Link>
              ))}
            </dd>
          </div>
        </dl>

        {/* Calibration stamp + stack position. */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: "var(--band-control)" }}
            />
            Verified {tool.asOf}
          </span>
          <div className="min-w-[15rem] flex-1">
            <StackSpine layer={category.layer} />
          </div>
        </div>

        {/* The decision pair — the site's whole thesis, per tool.

            Rendered as one object with two states rather than two equal
            cards. Two equal rounded cards read as two features; the reader
            is meant to feel a valve. `use` is the active state and sits in
            full ink; `skip` is the constraint and recedes. Equal weight would
            imply the two are equally worth knowing, which is false — almost
            every competitor in this category publishes a "best for" line and
            not one of them publishes the "skip when" half. That second
            sentence is the reason to trust the first. */}
        <div className="mt-7 grid gap-px border border-border bg-border sm:grid-cols-2">
          <div className="bg-bg-elevated p-3.5">
            <h2 className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-fg">
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 shrink-0 rounded-[1px] border border-accent bg-accent"
              />
              Use {tool.name} when
            </h2>
            <p className="mt-2 text-pretty text-[14px] leading-relaxed text-fg">
              {tool.useWhen}
            </p>
          </div>
          <div className="bg-bg-elevated p-3.5">
            <h2 className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 shrink-0 rounded-full border border-fg-subtle"
              />
              Skip {tool.name} when
            </h2>
            <p className="mt-2 text-pretty text-[14px] leading-relaxed text-fg-muted">
              {tool.skipWhen}
            </p>
          </div>
        </div>

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

        {/* Second homes. A layer-ordered index that pretends every tool has
            exactly one layer is convenient and wrong: the tools that span two
            — an agent runtime whose memory is a vector store, an eval platform
            whose registry versions prompts — are the ones a reader most needs
            to find from the *other* direction. The reason is shown, because an
            unexplained cross-reference reads as a mistake. */}
        {secondHomes.length ? (
          <div className="mt-5 border-l-2 border-border-strong pl-3.5">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
              Also belongs in
            </h2>
            <ul className="mt-2 space-y-1.5">
              {secondHomes.map(({ section, because }) => (
                <li
                  key={section.slug}
                  className="flex flex-wrap items-baseline gap-x-2 text-[13.5px] leading-relaxed text-fg-muted"
                >
                  <span
                    aria-hidden="true"
                    className="inline-block h-2.5 w-[2px] shrink-0 translate-y-0.5 rounded-full"
                    style={layerStyle(section.layer)}
                  />
                  <Link
                    href={`/${section.slug}`}
                    className="shrink-0 font-medium underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-accent"
                  >
                    {section.title}
                  </Link>
                  {/* `because` carries its own full stop, so nothing is appended
                      here. Enforced by the build guard in `data.ts`. */}
                  <span className="min-w-0">{because}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

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

      {/* Quick answers: the remaining questions people ask about a tool,
          each a self-contained passage. Mirrored in the FAQPage JSON-LD. */}
      {answerBlocks.length ? (
        <section className="mt-14 border-t border-border pt-8">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
            Quick answers
          </h2>
          <dl className="mt-4 space-y-5">
            {answerBlocks.map((qa) => (
              <div key={qa.question}>
                <dt className="text-[15px] font-medium">{qa.question}</dt>
                <dd className="mt-1 max-w-[62ch] text-pretty text-[14px] leading-relaxed text-fg-muted">
                  {qa.answer}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

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

      {/* Alternatives — the peer graph, which is what a reader comparing
          options actually wants next. */}
      {alternatives.length ? (
        <section className="mt-12">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
              Alternatives to {tool.name}
            </h2>
            {/* A dedicated page carries the reverse edges and marks which
                entries are adjacent rather than real substitutes, neither of
                which fits in a list on this page. */}
            {hasAlternativesPage(categorySlug, toolSlug) ? (
              <Link
                href={`/${categorySlug}/${toolSlug}/alternatives`}
                className="shrink-0 font-mono text-[11px] text-fg-subtle underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-accent"
              >
                compare {alternatives.length} →
              </Link>
            ) : null}
          </div>
          <ul className="mt-4 space-y-px">
            {alternatives.map(({ tool: alt, category: altCat }) => (
              <li key={`${altCat.slug}-${alt.slug}`}>
                <Link
                  href={`/${altCat.slug}/${alt.slug}`}
                  className="group -mx-2 flex gap-3 rounded-md px-2 py-3 transition-colors hover:bg-bg-sunken"
                >
                  <span
                    aria-hidden="true"
                    className="mt-1.5 h-6 w-[3px] shrink-0 rounded-full"
                    style={layerStyle(altCat.layer)}
                  />
                  <span className="min-w-0">
                    <span className="block text-[15px] font-medium group-hover:text-accent">
                      {alt.name}
                    </span>
                    <span className="mt-0.5 block text-pretty text-[13px] leading-relaxed text-fg-muted">
                      {alt.blurb}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Reverse edge: who else points here as a substitute. */}
      {alternativeTo.length ? (
        <section className="mt-10">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
            Listed as an alternative to
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {alternativeTo.map(({ tool: other, category: c }) => (
              <li key={`${c.slug}-${other.slug}`}>
                <Link
                  href={`/${c.slug}/${other.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[13px] text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
                >
                  <span
                    aria-hidden="true"
                    className="h-3 w-[2px] rounded-full"
                    style={layerStyle(c.layer)}
                  />
                  {other.name}
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
