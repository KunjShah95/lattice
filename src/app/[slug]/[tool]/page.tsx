import type { Metadata } from "next";
import Link from "next/link";
import { ReviewCta } from "@/components/marketing";
import { notFound } from "next/navigation";
import { layerStyle } from "@/lib/layer";
import { categoryGuidance } from "@/lib/guidance";
import { PageGuidance } from "@/components/page-guidance";
import { roleTitle, rolesInOrder } from "@/lib/roles";
import { StackSpine } from "@/components/stack-spine";
import {
  allTools,
  getAlternatives,
  getAlternativeTo,
  getSecondHomes,
  getSiblingTools,
  getTool,
  STALE_AFTER_MONTHS,
} from "@/lib/data";
import { postsForSection } from "@/lib/posts";
import { resolvedComparisons } from "@/lib/comparisons";
import { hasAlternativesPage } from "@/lib/alternatives";
import { TrackLink } from "@/components/track-link";
import { Byline } from "@/components/byline";
import { DecisionValve } from "@/components/ui/decision-valve";
import { Eyebrow } from "@/components/ui/eyebrow";
import { FreshnessStamp } from "@/components/ui/freshness";
import { LinkRow } from "@/components/ui/link-row";
import { PreviewToolChip } from "@/components/ui/preview-tool-chip";
import { ToolPreview } from "@/components/ui/tool-preview";
import { CopyButton } from "@/components/copy-button";
import { badgeMarkdown } from "@/lib/badge";
import { site } from "@/lib/site";
import { toJsonLd } from "@/lib/jsonld";
import {
  breadcrumbNode,
  credit,
  faqPageJsonLd,
  graph,
  ids,
  toolDefinition,
  toolEntityJsonLd,
  toolMetaDescription,
  toolQuestions,
} from "@/lib/seo";

/**
 * The build date, fixed once per build. The freshness meter shows the entry's
 * state *when the guard ran*, the same instant `/verification.json` reports, so
 * it is read once at module load rather than per page: 112 pages that each read
 * the clock could straddle a month boundary and disagree with one another.
 */
const BUILT_AT = new Date();

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
    // `toolMetaDescription` leads with the use/skip hook on purpose; see the
    // comment there. An audit of the live site found the old blurb-then-hook
    // order pushed "when to skip it" past the truncation point on 130 of 193
    // tool pages.
    description: toolMetaDescription(tool, category),
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
  const badgeText = badgeMarkdown(site.url, category.slug, tool.slug, tool.name, tool.asOf);
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
    <div className="page-shell pt-14 sm:pt-20">
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
                // `credit()` adds author + publisher + dateModified. The
                // per-tool `tool.asOf` is the visible stamp below; this is the
                // dataset-wide month, which is what the index as a whole was
                // last checked against.
                ...credit(),
                isPartOf: { "@id": ids.website },
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
        <nav aria-label="Breadcrumb" className="font-mono text-[13px]">
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

        <div className="mt-7 flex items-start gap-4">
          <span
            aria-hidden="true"
            className="mt-2.5 h-12 w-[4px] shrink-0 rounded-full"
            style={layerStyle(category.layer)}
          />
          <div className="min-w-0">
            <h1 className="t-h1">{tool.name}</h1>
            {/* Three facts, three shapes. They used to be one mono line at one
                size and one colour, which made the name and its metadata read
                as the same rank. */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-elevated px-2.5 py-1 font-mono text-[12px] uppercase tracking-[0.06em] text-fg-muted">
                {tool.kind}
              </span>
              {tool.deployment ? (
                <span className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-[12.5px] text-fg-muted">
                  {tool.deployment === "self-hosted"
                    ? "Self-hosted"
                    : tool.deployment === "saas"
                      ? "SaaS"
                      : "Managed"}
                </span>
              ) : null}
              <a
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full px-1 py-1 font-mono text-[12.5px] text-fg-subtle underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg"
              >
                {tool.domain}
              </a>
            </div>
          </div>
        </div>

        {/* What it is, as a sentence that names its subject. Answer engines
            lift passages, not layouts — "Paged-attention inference engine…"
            on its own does not say what it is describing. */}
        <p className="measure mt-7 text-[18px] leading-relaxed text-fg-muted">
          {toolDefinition(tool, category)}
        </p>

        {/* Who wrote it and when the facts were checked. The per-tool `asOf` is
            the date this entry was last verified, which is the one a reader
            weighing a licence or a price is asking about. */}
        <Byline fact="Facts verified" date={tool.asOf} className="mt-4" />

        {/* The facts a decision turns on. Licence and deployment are the two
            that most often rule a tool in or out before anything else.

            `asOf` is promoted out of this list into a stamp of its own below.
            It is not metadata: the build throws if any entry is more than six
            months old, so the date on this page is the receipt for a check
            that actually happened. No competitor in this category can show
            you one — the nearest, ToolDirectory, re-checks every 90 days by
            hand. Saying so is the cheapest trust the site can buy. */}
        {/* The facts a decision turns on. Four labelled values, each with the
            label dropped back to 12px mono and the value at reading size —
            the old row set all of it in one 13px line and asked the reader to
            parse punctuation to tell which word was which. */}
        <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-5 border-y border-border py-5 sm:grid-cols-4">
          {tool.license ? (
            <div>
              <dt className="t-label">Licence</dt>
              <dd className="mt-1.5 text-[15px] text-fg">{tool.license}</dd>
            </div>
          ) : null}
          {tool.language ? (
            <div>
              <dt className="t-label">Language</dt>
              <dd className="mt-1.5 text-[15px] text-fg">{tool.language}</dd>
            </div>
          ) : null}
          <div>
            <dt className="t-label">Cost</dt>
            <dd className="mt-1.5 text-[15px] capitalize text-fg">
              {tool.cost.replace("-", " ")}
            </dd>
          </div>
          {/* Who owns this, which is the question a reader who has found a tool
              by search cannot yet answer. */}
          <div>
            <dt className="t-label">Owned by</dt>
            <dd className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[15px]">
              {rolesInOrder(tool.roles).map((r) => (
                <Link
                  key={r}
                  href={`/roles/${r}`}
                  className="underline decoration-border-strong underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
                >
                  {roleTitle(r)}
                </Link>
              ))}
            </dd>
          </div>
        </dl>

        {/* Calibration stamp + stack position. The stamp is the guard made
            visible: when this was checked and when the build starts refusing
            it. */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <FreshnessStamp
            asOf={tool.asOf}
            now={BUILT_AT}
            windowMonths={STALE_AFTER_MONTHS}
          />
          <div className="min-w-[14rem] flex-1">
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
        <DecisionValve
          className="mt-7"
          toolName={tool.name}
          useWhen={tool.useWhen}
          skipWhen={tool.skipWhen}
        />

        <p className="mt-5 text-[14.5px] leading-relaxed text-fg-muted">
          <span className="text-fg">{category.responsibility}</span>{" "}
          <Link
            href={`/${category.slug}`}
            className="underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-accent"
          >
            See every {category.short.toLowerCase()} tool
          </Link>
          .
        </p>

        {/* Second homes. A layer-ordered index that pretends every tool has
            exactly one layer is convenient and wrong: the tools that span two
            — an agent runtime whose memory is a vector store, an eval platform
            whose registry versions prompts — are the ones a reader most needs
            to find from the *other* direction. The reason is shown, because an
            unexplained cross-reference reads as a mistake. */}
        {secondHomes.length ? (
          <div className="mt-5 border-l-2 border-border-strong pl-3.5">
            <Eyebrow as="h2" size="xs">
              Also belongs in
            </Eyebrow>
            <ul className="mt-2 space-y-1.5">
              {secondHomes.map(({ section, because }) => (
                <li
                  key={section.slug}
                  className="flex flex-wrap items-baseline gap-x-2 text-[15px] leading-relaxed text-fg-muted"
                >
                  <span
                    aria-hidden="true"
                    className="inline-block h-2.5 w-[2px] shrink-0 translate-y-0.5 rounded-full"
                    style={layerStyle(section.layer)}
                  />
                  {/* Tracked, because whether anyone follows a second home is the
                      only evidence that the taxonomy's overlaps are the thing
                      readers actually want — the claim `layer_overlaps` and this
                      field were added to serve. */}
                  <TrackLink
                    href={`/${section.slug}`}
                    event="second-home"
                    className="shrink-0 font-medium underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-accent"
                  >
                    {section.title}
                  </TrackLink>
                  {/* `because` carries its own full stop, so nothing is appended
                      here. Enforced by the build guard in `data.ts`. */}
                  <span className="min-w-0">{because}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Tracked: this is the one click that leaves the site, and whether
            readers actually reach a provider is the metric
            `strategy/04-monetisation.md` §7 cannot answer from a page view
            alone. */}
        {/* Two exits, ranked. Visiting the project is the primary action; the
            comparison builder is the secondary one, and it used to be a bare
            underlined word with `ml-3` holding it beside the button. */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <TrackLink
            href={tool.url}
            event="outbound"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ink group inline-flex h-12 items-center justify-center gap-2 rounded-[var(--r-control)] px-5 text-[16px] font-medium"
          >
            Visit {tool.domain}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="nudge nudge-up-right"
            >
              <path d="M7 17 17 7M9 7h8v8" />
            </svg>
          </TrackLink>

          <Link
            href={`/compare/build?tools=${category.slug}/${tool.slug}`}
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-[var(--r-control)] border border-border-strong bg-bg-elevated px-5 text-[16px] font-medium transition-colors hover:bg-bg-sunken"
          >
            Compare with another tool
            <span aria-hidden="true" className="nudge text-fg-subtle">→</span>
          </Link>
        </div>

        {/* A badge a README can carry: when this entry's facts were last
            confirmed. A disclosure, not a block, so it costs the page nothing
            for the reader who does not maintain a README. No popularity figure
            on it, on purpose — see `lib/badge.ts`. */}
        <details className="mt-8 max-w-md">
          <summary className="inline-flex cursor-pointer list-none items-center gap-2 text-[13.5px] font-medium text-fg-muted transition-colors hover:text-fg">
            <span aria-hidden="true" className="grid h-5 w-5 place-items-center rounded-full border border-border-strong text-[12px] leading-none">
              ↓
            </span>
            Badge this entry
          </summary>
          <div className="mt-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- an SVG that is already the right size; next/image would add an optimizer this Worker deliberately does not ship */}
            <img
              src={`/${category.slug}/${tool.slug}/badge.svg`}
              alt={`Lattice badge: ${tool.name} verified ${tool.asOf}`}
              height={20}
            />
            <pre className="mt-3 overflow-x-auto rounded-[var(--r-control)] border border-border bg-bg-sunken p-3 font-mono text-[13px] leading-relaxed text-fg-muted">
              <code>{badgeText}</code>
            </pre>
            <div className="mt-2">
              <CopyButton text={badgeText} label="Copy Markdown" copiedLabel="Copied" />
            </div>
          </div>
        </details>
      </header>

      {/* Rules of thumb for the decision this tool sits inside, then the
          remaining questions people ask about it. Each answer is a
          self-contained passage, mirrored in the FAQPage JSON-LD. */}
      <ReviewCta context={`Deciding whether ${tool.name} fits your stack? Get a second opinion before you commit.`} />

      <PageGuidance url={pageUrl}
        rules={categoryGuidance(category.slug).rules}
        answers={answerBlocks}
        markerStyle={layerStyle(category.layer)}
      />

      {/* Appears-in: the decision contexts, which is what makes this page
          more than a link with a sentence on it. */}
      {inComparisons.length ? (
        <section className="mt-16 border-t border-border pt-10">
          <h2 className="t-h4">Compared in</h2>
          <ul className="mt-4 space-y-px">
            {inComparisons.map((c) => (
              <li key={c.slug}>
                {/* Tracked because this is the exit into the cross-layer wedge —
                    the comparison surface `strategy/02` §4 says no funded
                    competitor can occupy. Whether anyone walks from a tool into
                    one is the only direct evidence the wedge is being used. */}
                <LinkRow
                  href={`/compare/${c.slug}`}
                  event="compare"
                  layer={category.layer}
                  title={c.title}
                  description={c.description}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Reading on this layer */}
      {sectionPosts.length ? (
        <section className="mt-16 border-t border-border pt-10">
          <h2 className="t-h4">Reading on {category.short.toLowerCase()}</h2>
          <ul className="mt-4 space-y-px">
            {sectionPosts.map((p) => (
              <li key={p.meta.slug}>
                <LinkRow
                  href={`/blog/${p.meta.slug}`}
                  layer={p.meta.layers[0] ?? null}
                  title={p.meta.title}
                  description={p.meta.dek}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Alternatives — the peer graph, which is what a reader comparing
          options actually wants next. */}
      {alternatives.length ? (
        <section className="mt-16 border-t border-border pt-10">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="t-h4">Alternatives to {tool.name}</h2>
            {/* A dedicated page carries the reverse edges and marks which
                entries are adjacent rather than real substitutes, neither of
                which fits in a list on this page. */}
            {hasAlternativesPage(categorySlug, toolSlug) ? (
              // Tracked, not wrapped in an extra element: `strategy/02` §5 calls
              // alternatives pages the single biggest lever for a directory, so
              // whether anyone walks into one is the most important navigation
              // fact on this site.
              <TrackLink
                href={`/${categorySlug}/${toolSlug}/alternatives`}
                event="alternatives"
                className="shrink-0 font-mono text-[13px] text-fg-subtle underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-accent"
              >
                compare {alternatives.length} →
              </TrackLink>
            ) : null}
          </div>
          <ul className="mt-4 space-y-px">
            {alternatives.map(({ tool: alt, category: altCat }) => (
              <li key={`${altCat.slug}-${alt.slug}`}>
                <LinkRow
                  href={`/${altCat.slug}/${alt.slug}`}
                  layer={altCat.layer}
                  title={alt.name}
                  description={alt.blurb}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Reverse edge: who else points here as a substitute. */}
      {alternativeTo.length ? (
        <section className="mt-16 border-t border-border pt-10">
          <h2 className="t-h4">Listed as an alternative to</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {alternativeTo.map(({ tool: other, category: c }) => (
              <li key={`${c.slug}-${other.slug}`}>
                <PreviewToolChip
                  href={`/${c.slug}/${other.slug}`}
                  layer={c.layer}
                  preview={<ToolPreview tool={other} />}
                >
                  {other.name}
                </PreviewToolChip>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Siblings — the crawl graph that keeps a section connected. */}
      {siblings.length ? (
        <section className="mt-16 border-t border-border pt-10">
          <h2 className="t-h4">Also in {category.short.toLowerCase()}</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {siblings.map((s) => (
              <li key={s.slug}>
                <PreviewToolChip
                  href={`/${category.slug}/${s.slug}`}
                  layer={category.layer}
                  preview={<ToolPreview tool={s} />}
                >
                  {s.name}
                </PreviewToolChip>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
