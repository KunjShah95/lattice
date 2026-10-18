import Link from "next/link";
import { ToolDirectory } from "@/components/tool-directory";
import { ProductHuntBadge } from "@/components/product-hunt-badge";
import { StackDiagram } from "@/components/stack-diagram";
import { StartHere } from "@/components/start-here";
import { allTools, categories, stackLayers, toolCount } from "@/lib/data";
import { toJsonLd } from "@/lib/jsonld";
import { graph, siteJsonLd } from "@/lib/seo";
import { site } from "@/lib/site";
import { bandColor } from "@/lib/layer";
import { resolvedSymptoms } from "@/lib/symptoms";
import { resolvedComparisons } from "@/lib/comparisons";
import { CtaBand, EarlyAccessPill, Faq, PricingTiers, SectionHeading } from "@/components/marketing";
import { isEarlyAccess } from "@/lib/offer";

/**
 * The headline states the one claim no other directory makes. "AI
 * infrastructure" stays in it, it is the head term this page ranks for, and
 * the accent lands on "skip", the half of every entry competitors leave out.
 */
const HEADLINE = ["Every", "AI", "infrastructure", "tool,", "with", "when", "to", "skip", "it."];
const ACCENT = "skip";

/**
 * A single pen stroke under "working", inked after the headline lands.
 * `pathLength="1"` normalises the dash maths so the draw-on animation does
 * not depend on the word's rendered width.
 */
function InkStroke() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 12"
      preserveAspectRatio="none"
      className="ink-stroke pointer-events-none absolute -bottom-[0.08em] left-0 h-[0.22em] w-full overflow-visible"
    >
      <path
        d="M2 8.5C38 4.2 92 2.6 198 5.4"
        pathLength={1}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        opacity="0.55"
      />
    </svg>
  );
}

function ArrowUpRight() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="nudge nudge-up-right mb-0.5 shrink-0 text-fg-subtle transition-colors group-hover:text-accent"
    >
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}

/** A spread of tools for the coverage strip: round-robin across sections. */
const MARQUEE = (() => {
  const bySection = categories.map((c) => allTools.filter((t) => t.category.slug === c.slug));
  const out: typeof allTools = [];
  for (let i = 0; out.length < 40; i++) {
    let added = false;
    for (const list of bySection) {
      if (list[i]) {
        out.push(list[i]);
        added = true;
      }
    }
    if (!added) break;
  }
  return out.slice(0, 40);
})();

const HOME_FAQ = [
  {
    q: "Is Lattice free?",
    a: "Yes. The index, the Stack Builder, comparisons, symptom guides and the dataset are free, with no account. The only thing offered on top is a review of your own stack by the maintainer.",
  },
  {
    q: "Can a vendor pay to be listed or ranked higher?",
    a: "No. Placement, rankings and comparison verdicts are not for sale, and there are no affiliate links in the index or its data files. That neutrality is the reason the comparisons are worth reading.",
  },
  {
    q: "How are tools chosen?",
    a: "Hand-picked against a published bar, ordered by where they sit in a real system rather than by popularity. Every fact is dated, and the build fails if any is more than six months old.",
  },
  {
    q: "What is a stack review?",
    a: "You describe what you are building; you get back a written, layer-by-layer review with what to keep, swap or add, a cost band and the biggest risk. It is free during early access.",
  },
  {
    q: "Can my AI assistant use Lattice?",
    a: "Yes. There is an llms.txt, a JSON dataset and an MCP server, so a model can look tools up instead of guessing.",
  },
];

function BentoCard({
  href,
  label,
  title,
  body,
  className = "",
  children,
}: {
  href: string;
  label: string;
  title: string;
  body: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <li className={className}>
      <Link
        href={href}
        data-spot=""
        className="crop group relative flex h-full flex-col rounded-2xl bg-bg-elevated/70 p-6 shadow-ink transition-shadow duration-300 [--crop-inset:-6px] hover:shadow-lift sm:p-7"
      >
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-fg-subtle">{label}</span>
        <span className="mt-3 flex items-start justify-between gap-3">
          <span className="text-balance text-[19px] font-semibold leading-snug tracking-[-0.01em] transition-colors group-hover:text-accent">
            {title}
          </span>
          <ArrowUpRight />
        </span>
        <span className="mt-2 block text-pretty text-[14px] leading-relaxed text-fg-muted">{body}</span>
        {children ? <div className="mt-auto">{children}</div> : null}
      </Link>
    </li>
  );
}

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-5 sm:px-6">
      {/* Site-level identity. Every other page references these nodes by @id
          rather than restating them. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(graph(siteJsonLd())) }}
      />
      {/*
        Hero. The headline does the work; nothing competes with it.

        The `112 tools · hand-picked` eyebrow that used to sit above the h1 is
        gone. It made three claims that are all already made elsewhere and
        better: the count is in the diagram header and the footer, and
        "hand-picked" is exactly what the paragraph below the headline argues
        ("Most AI tooling directories list products"). An eyebrow directly above
        a headline is the second-loudest element on the page, and this one was
        spending that on a number.
      */}
      <section className="pb-12 pt-14 sm:pt-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:gap-12">
          <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            {/*
              Each word rises out of its own mask, staggered. Transform only:
              the glyphs are at full ink from the first frame, so LCP and the
              contrast audit both see the finished headline. The spaces stay as
              text nodes between the masks, so the heading still reads (and
              copies) as one sentence.
            */}
            {/* Announcement pill: the one new thing, one click from here. */}
            <Link
              href="/review"
              className="group mb-6 inline-flex max-w-full items-center gap-2 rounded-full bg-bg-elevated py-1 pl-1 pr-3 text-[12.5px] text-fg-muted shadow-ink transition-shadow hover:shadow-lift"
            >
              <span className="rounded-full bg-fg px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-bg">
                New
              </span>
              <span className="truncate">
                {isEarlyAccess ? "Free stack reviews during early access" : "Stack reviews by the maintainer"}
              </span>
              <span aria-hidden="true" className="nudge text-fg-subtle">→</span>
            </Link>
            <h1 className="max-w-full text-balance font-serif text-[32px] font-medium leading-[1.06] tracking-[-0.025em] sm:text-[44px] lg:text-[48px]">
              {HEADLINE.map((word, i) => (
                <span key={word}>
                  <span className="mask-line">
                    <span
                      style={{ "--i": i } as React.CSSProperties}
                      className={word === ACCENT ? "relative text-accent" : undefined}
                    >
                      {word}
                      {word === ACCENT ? <InkStroke /> : null}
                    </span>
                  </span>
                  {i < HEADLINE.length - 1 ? " " : null}
                </span>
              ))}
            </h1>

            <p className="mt-6 max-w-[46ch] text-pretty text-[16px] leading-relaxed text-fg-muted">
              {toolCount} tools across {stackLayers.length} layers of a production AI stack. Each
              entry says when to use it <em>and when not to</em>, so you can choose without vendor
              spin. Build your stack with the free Stack Builder, or have an engineer review yours.
            </p>

            {/* Two doors, ranked: the free tool first (most readers), the
                review second (the readers who are about to commit). */}
            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <Link
                href="/stack-builder"
                className="btn-ink group inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-5 text-[15px] font-medium"
              >
                Build my stack
                <span aria-hidden="true" className="nudge">→</span>
              </Link>
              <Link
                href="/review"
                className="btn-paper group inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-5 text-[15px] font-medium"
              >
                Get an expert review
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
              <ProductHuntBadge />
              <p className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-fg-subtle">
                <span aria-hidden="true" className="pulse-dot h-1.5 w-1.5 rounded-full bg-band-state" />
                No sponsored placement
              </p>
            </div>

            {/* The proof point. The six-month gate in `lib/data.ts` throws and
                stops the deploy, so the date on a page is a receipt. */}
            <div className="mt-9 max-w-[42ch] border-t border-border pt-4">
              <p className="text-pretty text-[13px] leading-relaxed text-fg-muted">
                Licence, cost and deployment facts go stale, so every entry is dated and the
                build <span className="text-fg">fails</span> if any is more than six months old.{" "}
                <Link
                  href="/methodology"
                  className="text-fg underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-accent"
                >
                  Read the method
                </Link>
                .
              </p>
            </div>
          </div>

          <StackDiagram />
        </div>
      </section>

      {/* Coverage strip. Labelled as coverage, never as customers: these are
          tools the index maps, not companies that use it. */}
      <section aria-labelledby="covers" className="border-t border-border py-10">
        <h2 id="covers" className="text-center text-[17px] font-medium text-fg-muted sm:text-[19px]">
          Maps the tools you are already weighing
        </h2>
        <div className="marquee mt-6" style={{ "--marquee-duration": "80s" } as React.CSSProperties}>
          {[0, 1].map((copy) => (
            <ul key={copy} aria-hidden={copy === 1 ? true : undefined} className="marquee-track">
              {MARQUEE.map((t) => (
                <li key={t.slug} className="whitespace-nowrap text-[15px] font-medium text-fg-muted">
                  {t.name}
                </li>
              ))}
            </ul>
          ))}
        </div>
      </section>

      {/* What it does, as a bento: each cell is one way in, with a sketch of
          what is behind it rather than a stock icon. */}
      <section aria-labelledby="ways-in" className="border-t border-border py-20">
        <SectionHeading
          id="ways-in"
          title="Start from where you are, not from a category."
          lede="Most people arrive with a workload, a symptom or a shortlist. Each of those has its own door."
        />
        <ul className="mt-12 grid gap-4 md:grid-cols-6">
          <BentoCard
            className="md:col-span-4"
            href="/stack-builder"
            label="Stack Builder"
            title="Describe the workload. Get the stack."
            body="RAG, agent, voice or plain API: answer a few questions and get one pick per layer, the reason, its skip-when and a cost band."
          >
            <div aria-hidden="true" className="mt-6 flex items-end gap-1.5">
              {stackLayers.map((c, i) => (
                <span
                  key={c.slug}
                  className="draw-y block w-full rounded-sm"
                  style={{
                    height: `${18 + ((i * 37) % 5) * 9}px`,
                    backgroundColor: `var(--layer-${c.layer})`,
                    opacity: i % 3 === 1 ? 0.35 : 0.85,
                    "--i": i,
                  } as React.CSSProperties}
                />
              ))}
            </div>
          </BentoCard>
          <BentoCard
            className="md:col-span-2"
            href="/fix"
            label="Fix"
            title="Start from the symptom."
            body="Slow, expensive, wrong answers, flaky agents: an ordered checklist through the stack."
          />
          <BentoCard
            className="md:col-span-3"
            href="/compare"
            label="Compare"
            title={`${resolvedComparisons.length} head-to-heads, each with a verdict.`}
            body="Including across layers: gateway vs guardrails vs evals, which no vendor will ever publish."
          />
          <BentoCard
            className="md:col-span-3"
            href="/llms.txt"
            label="For agents"
            title="Readable by your AI assistant."
            body="llms.txt, a JSON dataset and an MCP server, so a model can query the index instead of guessing."
          >
            <pre aria-hidden="true" className="mt-5 overflow-hidden rounded-lg bg-bg-sunken px-3 py-2.5 font-mono text-[11.5px] leading-relaxed text-fg-muted">
{`search_tools({ layer: 3, cost: "free" })
recommend_stack({ workload: "rag" })`}
            </pre>
          </BentoCard>
        </ul>
      </section>

      {/* The index as a directory: centred section headings over grids of
          cards, each card one click from its tool page. */}
      <section id="all" aria-labelledby="directory" className="scroll-mt-20 border-t border-border py-20">
        <SectionHeading
          id="directory"
          title={`All ${toolCount} tools, by layer.`}
          lede="Ordered by where each tool sits in a production system, not by how popular it is. Click any card for when to use it, when to skip it, and its alternatives."
        />
        <div className="mt-12">
          <ToolDirectory categories={categories} />
        </div>
      </section>

      {/* Symptom entry. Most readers arrive with a problem, not a category,
          and no other index in the category routes by symptom. Each card is
          one click from an ordered checklist through the stack. */}
      <section aria-labelledby="fix-heading" className="border-t border-border py-20">
        <SectionHeading
          id="fix-heading"
          title="Something wrong? Start from the symptom."
          lede={
            <>
              Each one is an ordered checklist through the stack, cheapest check first.{" "}
              <Link
                href="/fix"
                className="text-fg underline decoration-border-strong underline-offset-4 hover:decoration-accent"
              >
                See every symptom
              </Link>
              .
            </>
          }
        />
        <div className="mt-12" />
        {/* Cells on a sheet rather than floating cards: one hairline grid,
            shared edges. Hover marks the cell with crop corners and sends the
            arrow toward the page it opens. */}
        <ul className="mt-6 grid gap-px overflow-hidden rounded-xl bg-border shadow-ink sm:grid-cols-2 lg:grid-cols-3">
          {resolvedSymptoms.map((s, i) => (
            <li key={s.slug} className="bg-bg">
              <Link
                href={`/fix/${s.slug}`}
                data-spot=""
                style={{ "--spot": bandColor(s.band) } as React.CSSProperties}
                className="crop group relative flex h-full min-h-[7.5rem] flex-col gap-2 p-5 transition-colors duration-200 [--crop-inset:6px] hover:bg-bg-sunken"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-fg-subtle">
                    <span aria-hidden="true" className="h-2 w-2 rounded-full transition-transform duration-300 ease-[var(--ease-spring)] group-hover:scale-125" style={{ backgroundColor: bandColor(s.band) }} />
                    {s.label}
                  </span>
                  <span aria-hidden="true" className="font-mono text-[10px] text-fg-subtle">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </span>
                <span className="mt-auto flex items-end justify-between gap-3">
                  <span className="text-pretty text-[15px] font-medium leading-snug transition-colors group-hover:text-accent">{s.title}</span>
                  <ArrowUpRight />
                </span>
              </Link>
            </li>
          ))}
          <li className="bg-bg-sunken/60">
            <Link href="/compare" data-spot="" className="crop group relative flex h-full min-h-[7.5rem] flex-col gap-2 p-5 transition-colors duration-200 [--crop-inset:6px] hover:bg-bg-sunken">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-fg-subtle">Choosing, not fixing</span>
              <span className="mt-auto flex items-end justify-between gap-3">
                <span className="text-pretty text-[15px] font-medium leading-snug transition-colors group-hover:text-accent">
                  Compare tools, including across layers
                </span>
                <ArrowUpRight />
              </span>
            </Link>
          </li>
        </ul>
      </section>

      {/* Decision path: the index answers "what exists", this answers
          "given what I am building, which parts matter". */}
      <section id="start-here" className="scroll-mt-20 border-t border-border py-12">
        <StartHere />
      </section>

      {/* The offer. Placed after the free tools on purpose: a reader who has
          used the Stack Builder or a symptom guide knows what a review would
          add, and is the reader most likely to want one. */}
      <section id="review" aria-labelledby="offer" className="scroll-mt-20 border-t border-border py-20">
        <div className="flex flex-col items-center gap-6">
          <EarlyAccessPill />
          <SectionHeading
            id="offer"
            title="Want an engineer to check your stack?"
            lede="The same rulebook as the index, applied to your system: a written review of every layer, with a cost band and the risk most likely to bite first."
          />
        </div>
        <div className="mt-12">
          <PricingTiers />
        </div>
        <p className="mt-6 text-center text-[13.5px] text-fg-muted">
          Reviews never change where a tool sits in the index.{" "}
          <Link
            href="/review"
            className="text-fg underline decoration-border-strong underline-offset-4 hover:decoration-accent"
          >
            See exactly what you get
          </Link>
          .
        </p>
      </section>

      <section aria-labelledby="home-faq" className="border-t border-border py-20">
        <SectionHeading id="home-faq" title="The short answers." />
        <div className="mx-auto mt-12 max-w-3xl">
          <Faq items={HOME_FAQ} />
        </div>
      </section>

      <div className="pb-20">
        <CtaBand />
      </div>

      {/* Colophon.

          Opens with the definition this homepage exists to rank for. "AI
          infrastructure" is the head term; the two sentences that follow are
          written to stand alone as a quoted answer, naming each layer so an
          answer engine can lift the passage whole. Counts come from the
          dataset, not prose, so they cannot drift.
      */}
      <section className="border-t border-border py-12">
        <div className="max-w-[62ch]">
          <h2 className="text-[15px] font-medium">What is AI infrastructure?</h2>
          <p className="editorial-justify mt-2 text-pretty text-[13px] leading-relaxed text-fg-muted">
            AI infrastructure is everything between your product and the model:
            runtimes that serve weights, gateways that route requests, stores
            that hold embeddings, frameworks that run agents, and evals that say
            whether any of it works. Lattice indexes {toolCount} such AI
            infrastructure tools as one AI stack, ordered by depth: {" "}
            <Link
              href="/all"
              className="text-fg underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-accent"
            >
              browse every tool
            </Link>
            , or{" "}
            <Link
              href="/stack-builder"
              className="text-fg underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-accent"
            >
              build your stack
            </Link>
            .
          </p>
        </div>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-[46ch]">
            <h2 className="text-[15px] font-medium">How this list is kept</h2>
            <p className="editorial-justify mt-2 text-pretty text-[13px] leading-relaxed text-fg-muted">
              Entries are hand-picked rather than submitted, and ordered by where
              they sit in a real system rather than by how popular they are. Any
              licence or cost figure older than six months fails the build, so a
              stale entry cannot reach production.{" "}
              <Link
                href="/methodology"
                className="text-fg underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-accent"
              >
                The full method, including what this list gets wrong
              </Link>
              . When something changes, it is listed on{" "}
              <Link
                href="/corrections"
                className="text-fg underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-accent"
              >
                Corrections
              </Link>
              .
            </p>
          </div>
          <a
            href={site.contact.href}
            className="shrink-0 text-[13px] text-fg-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg"
          >
            Suggest a tool
          </a>
        </div>

        {/* Reader-facing links only. /feed.xml and /llms.txt are deliberately not
            linked from anywhere visible: they are for crawlers and agents, which
            find them via the sitemap (robots.txt cannot list URLs, only rules),
            and a human clicking "RSS" gets a raw XML document with no
            explanation of what it is. */}
        <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-6 font-mono text-[11px] text-fg-subtle">
          <Link href="/all" className="transition-colors hover:text-fg-muted">
            All {toolCount} AI infrastructure tools, filterable →
          </Link>
        </div>
      </section>
    </div>
  );
}
