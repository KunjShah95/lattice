import Link from "next/link";
import { CategorySection } from "@/components/category-section";
import { AskAi } from "@/components/ask-ai";
import { QuickAnswers, RulesOfThumb } from "@/components/page-guidance";
import { PAGE_GUIDANCE } from "@/lib/guidance";
import { ProductHuntBadge } from "@/components/product-hunt-badge";
import { StackDiagram } from "@/components/stack-diagram";
import { StartHere } from "@/components/start-here";
import { categories, toolCount } from "@/lib/data";
import { toJsonLd } from "@/lib/jsonld";
import { faqPageJsonLd, graph, siteJsonLd } from "@/lib/seo";
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

function Arrow() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="nudge shrink-0"
    >
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="page-shell">
      {/* Site-level identity. Every other page references these nodes by @id
          rather than restating them. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(graph(siteJsonLd(), faqPageJsonLd(PAGE_GUIDANCE.home.answers, site.url))) }}
      />

      {/* Hero. One idea, one action, one picture. Everything that used to
          compete here — a sheet number, a second CTA, a trust block, two
          badges — now lives elsewhere or is gone. */}
      <section className="pb-14 pt-16 sm:pb-16 sm:pt-24">
        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:gap-16">
          <div className="min-w-0 lg:sticky lg:top-28 lg:self-start">
            <p className="t-label">
              A curated index
              <span aria-hidden="true" className="px-2 text-border-strong">
                /
              </span>
              {toolCount} tools, nine layers
            </p>

            <h1 className="t-display mt-5">
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

            <p className="t-lead measure mt-6">
              Every entry carries two sentences: when to use it, and when to skip
              it. Most directories publish the first. This one publishes the
              second, because that is the sentence that tells you whether anything
              here is worth your time.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Link
                href="/stack-builder"
                className="btn-ink group inline-flex h-12 items-center justify-center gap-2 rounded-[var(--r-control)] px-5 text-[16px] font-medium"
              >
                Build my stack
                <Arrow />
              </Link>
              <Link
                href="/all"
                className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--r-control)] border border-border-strong bg-bg-elevated px-5 text-[16px] font-medium text-fg transition-colors hover:bg-bg-sunken sm:justify-start"
              >
                Browse all {toolCount}
                <span aria-hidden="true" className="nudge text-fg-subtle">
                  →
                </span>
              </Link>
            </div>

            <p className="mt-6 flex max-w-[46ch] items-start gap-2.5 text-[14.5px] leading-relaxed text-fg-muted">
              <span
                aria-hidden="true"
                className="pulse-dot mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-band-state"
              />
              <span>
                Licence and cost facts are dated, and the build fails if any entry
                is more than six months old. A stale entry cannot reach production.
                <Link
                  href="/methodology"
                  className="ml-1 text-fg underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-accent"
                >
                  Read the method
                </Link>
                .
              </span>
            </p>
          </div>

          <StackDiagram />
        </div>
      </section>

      {/* Symptom entry. Most readers arrive with a problem, not a category —
          and no other index in the category routes by symptom. */}
      <section aria-labelledby="fix-heading" className="section border-t border-border">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="t-label">Start from the symptom</p>
            <h2 id="fix-heading" className="t-h2 mt-2">
              Something is wrong. Where?
            </h2>
          </div>
          <Link
            href="/fix"
            className="group inline-flex min-h-10 items-center gap-1.5 text-[14.5px] font-medium text-fg-muted transition-colors hover:text-fg"
          >
            All symptoms
            <span aria-hidden="true" className="nudge">→</span>
          </Link>
        </div>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {resolvedSymptoms.map((s, i) => (
            <li key={s.slug}>
              <Link
                href={`/fix/${s.slug}`}
                data-spot=""
                style={{ "--spot": bandColor(s.band) } as React.CSSProperties}
                className="crop group relative flex h-full min-h-[9.5rem] flex-col justify-between gap-6 rounded-[var(--r-card)] border border-border bg-bg-elevated p-5 shadow-ink transition-[transform,box-shadow,border-color] duration-200 [--crop-inset:4px] hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lift"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.08em] text-fg-muted">
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 rounded-full transition-transform duration-300 ease-[var(--ease-spring)] group-hover:scale-125"
                      style={{ backgroundColor: bandColor(s.band) }}
                    />
                    {s.label}
                  </span>
                  <span aria-hidden="true" className="font-mono text-[12px] text-fg-subtle">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </span>
                <span className="flex items-end justify-between gap-3">
                  <span className="text-pretty text-[19px] font-medium leading-snug tracking-[-0.012em] transition-colors group-hover:text-accent">
                    {s.title}
                  </span>
                  <Arrow />
                </span>
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/compare"
              className="crop group relative flex h-full min-h-[9.5rem] flex-col justify-between gap-6 rounded-[var(--r-card)] border border-dashed border-border-strong p-5 transition-[transform,box-shadow,border-color] duration-200 [--crop-inset:4px] hover:-translate-y-0.5 hover:bg-bg-sunken/60 hover:shadow-lift"
            >
              <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-fg-muted">
                Choosing, not fixing
              </span>
              <span className="flex items-end justify-between gap-3">
                <span className="text-pretty text-[19px] font-medium leading-snug tracking-[-0.012em] transition-colors group-hover:text-accent">
                  Compare tools, including across layers
                </span>
                <Arrow />
              </span>
            </Link>
          </li>
        </ul>
      </section>

      {/* Decision path — the index answers "what exists", this answers
          "given what I am building, which parts matter". */}
      <section id="start-here" className="section scroll-mt-20 border-t border-border">
        <StartHere />
      </section>

      {/* The index — the legend for the diagram above. */}
      <div id="all" className="scroll-mt-20">
        <div className="border-t border-border pt-12 sm:pt-14">
          <p className="t-label">The index</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <h2 className="t-h2">Nine layers, substrate first.</h2>
            <span className="font-mono text-[13px] tabular-nums text-fg-subtle">
              {categories.length} sections · {toolCount} tools
            </span>
          </div>
          <p className="measure mt-3 text-[15.5px] leading-relaxed text-fg-muted">
            Ordered by where a request passes through, not by popularity. Open a
            section to see every entry in it.
          </p>
        </div>

        <div className="mt-10">
          {categories.map((category) => (
            <CategorySection key={category.slug} category={category} collapsible />
          ))}
        </div>
      </div>

      {/* Colophon.

          Opens with the definition this homepage exists to rank for. "AI
          infrastructure" is the head term; the two sentences that follow are
          written to stand alone as a quoted answer, naming each layer so an
          answer engine can lift the passage whole. Counts come from the
          dataset, not prose, so they cannot drift.
      */}
      <section className="section border-t border-border">
        <div className="grid gap-10 sm:grid-cols-2 sm:gap-12">
          <div>
            <h2 className="t-h3">What is AI infrastructure?</h2>
            <p className="measure mt-3 text-[15.5px] leading-relaxed text-fg-muted">
              AI infrastructure is everything between your product and the model:
              runtimes that serve weights, gateways that route requests, stores
              that hold embeddings, frameworks that run agents, and evals that
              say whether any of it works. Lattice indexes {toolCount} such tools
              as one stack, ordered by depth —{" "}
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

          <div>
            <h2 className="t-h3">How this list is kept</h2>
            <p className="measure mt-3 text-[15.5px] leading-relaxed text-fg-muted">
              Entries are hand-picked rather than submitted, and ordered by where
              they sit in a real system rather than by how popular they are. Any
              licence or cost figure older than six months fails the build. When
              something changes, it is listed on{" "}
              <Link
                href="/corrections"
                className="text-fg underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-accent"
              >
                Corrections
              </Link>
              .
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
              <a
                href={site.contact.href}
                className="text-[14.5px] font-medium text-fg-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg"
              >
                Suggest a tool
              </a>
              <ProductHuntBadge />
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-6 font-mono text-[13px] text-fg-subtle">
          <Link href="/all" className="transition-colors hover:text-fg">
            All {toolCount} tools, filterable →
          </Link>
          <Link href="/start" className="transition-colors hover:text-fg">
            Start with a five-step path →
          </Link>
        </div>
      </section>

      {/* Rules of thumb and quick answers: the house voice, stated once on
          the front page and repeated in context on every page below it. */}
      <section className="section border-t border-border">
        <div className="grid gap-10 sm:grid-cols-2 sm:gap-12">
          <RulesOfThumb rules={PAGE_GUIDANCE.home.rules} className="" />
          <QuickAnswers answers={PAGE_GUIDANCE.home.answers} className="" />
        </div>
      </section>

      <AskAi url={site.url} className="section border-t border-border" />
    </div>
  );
}
