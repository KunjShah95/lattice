import Link from "next/link";
import { CategorySection } from "@/components/category-section";
import { ProductHuntBadge } from "@/components/product-hunt-badge";
import { StackDiagram } from "@/components/stack-diagram";
import { StartHere } from "@/components/start-here";
import { categories, toolCount } from "@/lib/data";
import { toJsonLd } from "@/lib/jsonld";
import { graph, siteJsonLd } from "@/lib/seo";
import { site } from "@/lib/site";
import { bandColor } from "@/lib/layer";
import { resolvedSymptoms } from "@/lib/symptoms";

const HEADLINE = ["The", "infrastructure", "behind", "working", "AI", "systems."];

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
              Each word rises out of its own mask, staggered. Transform only —
              the glyphs are at full ink from the first frame, so LCP and the
              contrast audit both see the finished headline. The spaces stay as
              text nodes between the masks, so the heading still reads (and
              copies) as one sentence.
            */}
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
              Sheet 01
              <span aria-hidden="true" className="px-2 text-border-strong">/</span>
              A production stack
            </p>
            <h1 className="max-w-full text-balance font-serif text-[32px] font-medium leading-[1.06] tracking-[-0.025em] sm:text-[44px] lg:text-[48px]">
              {HEADLINE.map((word, i) => (
                <span key={word}>
                  <span className="mask-line">
                    <span
                      style={{ "--i": i } as React.CSSProperties}
                      className={word === "working" ? "relative text-accent" : undefined}
                    >
                      {word}
                      {word === "working" ? <InkStroke /> : null}
                    </span>
                  </span>
                  {i < HEADLINE.length - 1 ? " " : null}
                </span>
              ))}
            </h1>

            <p className="editorial-justify mt-5 max-w-[46ch] text-pretty text-[15px] leading-relaxed text-fg-muted">
              Every entry here carries two sentences: when to use it, and when to skip it.
              Most directories publish the first. Almost none publish the second — it is the
              one that tells you whether anything on this page is worth your time.
              If you are choosing AI infrastructure tools for a production AI stack,
              this is the starting point: every layer, from inference runtimes to evals.
            </p>

            {/*
              One decision per viewport. The hero sets context, the diagram
              shows the shape, and this says what to actually do — in that
              order. It was previously absent, so a first-time reader landed on
              a beautiful diagram and had to infer that scrolling further was
              the intended action.

              The label names the action rather than the destination. "Start here"
              would compete with the section below it that is also called Start
              Here; this says what happens when you click.
            */}
            <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2">
              <Link
                href="/stack-builder"
                className="btn-ink group inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-[14px] font-medium sm:justify-start"
              >
                Build my stack
                <span aria-hidden="true" className="nudge">→</span>
              </Link>
              <a
                href="#start-here"
                className="group inline-flex min-h-11 items-center gap-1 text-[14px] text-fg-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-accent"
              >
                or find my starting layers
                <span aria-hidden="true" className="nudge nudge-down inline-block no-underline">↓</span>
              </a>
              <Link
                href="/all"
                className="inline-flex min-h-11 items-center text-[14px] text-fg-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-accent"
              >
                browse all {toolCount}
              </Link>
            </div>

            <ProductHuntBadge className="mt-7" />

            {/*
              The proof point, placed at first contact rather than in a
              footer nobody opens.

              "112 hand-picked tools" is the category's opening move and it is
              why 112 reads as small against directories claiming 50,000. This
              block is the better number: it is the one claim nobody else in
              the category can make, because making it means doing it rather
              than writing it. The six-month gate in `lib/data.ts` throws and
              stops the deploy, so the date on a page is a receipt, not a
              promise.

              It also fills what was a large dead zone under the CTA. The
              alternative was another navigation widget, and this page already
              has enough of those.
            */}
            <div className="mt-9 max-w-[40ch] border-t border-border pt-4">
              <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle">
                {/* The build gate is live, so the marker breathes. */}
                <span
                  aria-hidden="true"
                  className="pulse-dot h-1.5 w-1.5 rounded-full bg-band-state"
                />
                Why you can trust the figures
              </p>
              <p className="mt-2 text-pretty text-[13px] leading-relaxed text-fg-muted">
                Licence, cost and deployment facts go stale, so every entry is dated
                and the build{" "}
                <span className="text-fg">fails</span> if any is more than six months
                old. A stale entry cannot reach production, which is more than
                &ldquo;updated daily&rdquo; can tell you.
              </p>
              <Link
                href="/methodology"
                className="group mt-2.5 inline-flex items-center gap-1 font-mono text-[11px] text-fg-subtle underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-accent"
              >
                Read the method, including where it is wrong
                <span aria-hidden="true" className="nudge inline-block">→</span>
              </Link>
            </div>

            {/* No search field here. The sticky header already carries one and
                is visible in the first viewport at every breakpoint, so a
                second copy below the fold-adjacent hero was a duplicated
                affordance competing with the diagram — which is the actual
                pitch on this page, per the note above. */}
          </div>

          <StackDiagram />
        </div>
      </section>

      {/* Symptom entry. Most readers arrive with a problem, not a category —
          and no other index in the category routes by symptom. Each card is
          one click from an ordered checklist through the stack. */}
      <section aria-labelledby="fix-heading" className="border-t border-border py-12">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="fix-heading" className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
            Something wrong? Start from the symptom
          </h2>
          <Link href="/fix" className="group inline-flex shrink-0 items-center gap-1 font-mono text-[11px] text-fg-subtle underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-accent">
            All symptoms
            <span aria-hidden="true" className="nudge inline-block">→</span>
          </Link>
        </div>
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
                  Compare tools — including across layers
                </span>
                <ArrowUpRight />
              </span>
            </Link>
          </li>
        </ul>
      </section>

      {/* Decision path — the index answers "what exists", this answers
          "given what I am building, which parts matter". */}
      <section id="start-here" className="scroll-mt-20 border-t border-border py-12">
        <StartHere />
      </section>

      {/* The index — the legend for the diagram above. */}
      <div id="all" className="scroll-mt-20">
        <div className="mb-8 flex items-baseline gap-3 border-t border-border pt-6">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
            The index
          </h2>
          <span aria-hidden="true" className="h-px flex-1 bg-border" />
          <span className="font-mono text-[11px] text-fg-subtle">
            {categories.length} sections
          </span>
        </div>

        {categories.map((category) => (
          <CategorySection key={category.slug} category={category} />
        ))}
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
            infrastructure tools as one AI stack, ordered by depth —{" "}
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
            href={`mailto:${site.contact.email}`}
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
