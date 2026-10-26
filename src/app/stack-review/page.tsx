import type { Metadata } from "next";
import Link from "next/link";
import { Bento, MovingBorder, ShinyText, TextGenerate } from "@/components/acetate/motion-primitives";
import { Magnetic } from "@/components/acetate/pointer-effects";
import { reviewOffer } from "@/lib/review-offer";
import { site } from "@/lib/site";
import { absolute } from "@/lib/seo";
import { toJsonLd } from "@/lib/jsonld";

const HEADLINE = [
  "Someone",
  "reads",
  "your",
  "stack",
  "and",
  "tells",
  "you",
  "what",
  "it",
  "costs",
  "you.",
] as const;

/**
 * One accent word per headline, picked by index rather than by string match.
 *
 * `includes()` on a word array is the version of this that breaks the first
 * time the copy is edited — "what it costs you" appears as a word and inside
 * another phrase, and the accent silently lands twice. An index is checked by
 * the compiler and cannot drift when someone rewrites the line.
 */
const ACCENT_INDEX = HEADLINE.indexOf("costs");

/**
 * A pre-addressed request rather than a form.
 *
 * A form needs a backend, a spam trap, a sending provider and a place for the
 * replies to land — four new failure modes for an offer whose hardest part is
 * not the transaction. A mailto with the questions already in the body costs
 * nothing, cannot silently drop a submission, and starts the reply thread with
 * the intake already half-written. The reader who would rather type into a form
 * can still use the address on `/contact`.
 */
function bookingHref() {
  const body = [
    "Stack review request",
    "",
    "What we are building:",
    "",
    "What we run today:",
    "",
    "Rough monthly spend:",
    "",
    "What prompted this:",
  ].join("\n");
  return `mailto:${site.contact.email}?subject=${encodeURIComponent(
    "Stack review",
  )}&body=${encodeURIComponent(body)}`;
}

export const metadata: Metadata = {
  title: "Stack Review — a free read of your AI stack, by the index's author",
  description:
    "A dated written review of one team's AI stack: what to keep, what to change, what to delete, and what it costs to delay each one. Free. The index itself stays free and unsponsored.",
  alternates: { canonical: "/stack-review" },
  openGraph: {
    url: absolute("/stack-review"),
    title: "Stack Review — the index's author reads your stack",
    description: `Every layer you run, checked against the index. Three changes ranked by cost of delay. Free, delivered in ${reviewOffer.deliveryDays} working days.`,
  },
};

export default function StackReviewPage() {
  return (
    <div data-canvas="aurora" className="relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd({
            "@context": "https://schema.org",
            "@type": "Service",
            name: reviewOffer.name,
            description: reviewOffer.promise,
            url: absolute("/stack-review"),
            provider: { "@type": "Organization", name: site.name },
          }),
        }}
      />

      {/* =================================================================
          Hero.

          No ambient effects: no blooms, beams or pointer wash. The selling page
          is set in the same plain ink as the index, so it reads as the same
          product.
          ================================================================= */}
      <section className="relative isolate overflow-hidden border-b border-border">

        <div className="relative z-10 mx-auto max-w-5xl px-5 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-24">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center lg:gap-16">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
                <span className="ac-shiny inline-block h-1.5 w-1.5 rounded-full" />
                Free
                <span aria-hidden="true" className="text-border-strong">/</span>
                {reviewOffer.slots} slots per month
              </p>

              <h1 className="mt-5 text-balance font-display text-[34px] font-medium leading-[1.05] tracking-[-0.025em] sm:text-[46px] lg:text-[52px]">
                <TextGenerate words={HEADLINE} accentIndex={ACCENT_INDEX} />
              </h1>

              <p className="mt-6 max-w-[52ch] text-pretty text-[15px] leading-relaxed text-fg-muted">
                {reviewOffer.promise}
              </p>

              <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-5">
                <Magnetic>
                  <Link href="#book" className="ac-cta inline-flex h-12 items-center justify-center gap-2 px-6 text-[14px]">
                    <span className="inline-flex items-center gap-2">
                      Book the review
                      <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-0.5">→</span>
                    </span>
                  </Link>
                </Magnetic>
                <a
                  href="#what-you-get"
                  className="link-draw inline-flex min-h-11 items-center gap-1 text-[14px] text-fg-muted transition-colors hover:text-fg"
                >
                  what you get
                  <span aria-hidden="true" className="inline-block">↓</span>
                </a>
              </div>

              {/* Disclosure sits directly under the CTA, on the page carrying
                  the link. `strategy/04` §6 is explicit that a disclosure the
                  reader has to go looking for is no disclosure at all. */}
              <p className="mt-7 max-w-[54ch] border-l-2 border-border-strong pl-3 text-[12px] leading-relaxed text-fg-subtle">
                {reviewOffer.disclosure}
              </p>
            </div>

            {/* What arrives, on the loudest surface on the page. */}
            <div className="relative">
              <MovingBorder radius="1.25rem" className="bg-bg-elevated/70 backdrop-blur-sm">
                <div className="rounded-[1.25rem] p-7 sm:p-8">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
                    Stack Review
                  </p>
                  <p className="mt-4 font-display text-[40px] font-medium leading-none tracking-tight">
                    {reviewOffer.deliveryDays} working days
                  </p>
                  <p className="mt-3 text-[13px] leading-relaxed text-fg-muted">
                    One team, one workload, from context to a dated document.
                  </p>

                  <ul className="mt-6 space-y-2.5 border-t border-border pt-5 text-[13px] text-fg-muted">
                    {[
                      "Every layer you run, reviewed",
                      "Three changes ranked by cost of delay",
                      "The tools to delete",
                      "A migration order that names what breaks",
                    ].map((line) => (
                      <li key={line} className="flex gap-2.5">
                        <span aria-hidden="true" className="mt-[3px] shrink-0 text-accent">✓</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>

                  <Link href="#book" className="btn-ink mt-7 flex h-11 w-full items-center justify-center rounded-lg text-[14px] font-medium">
                    Start with the intake →
                  </Link>
                  <p className="mt-3 text-center text-[11px] text-fg-subtle">
                    Free. Ask a question first if you are not sure.
                  </p>
                </div>
              </MovingBorder>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================
          What you get.

          Six things that only come out of reading a specific stack end to
          end, which the index on its own cannot tell you.
          ================================================================= */}
      <section id="what-you-get" className="relative scroll-mt-20 border-b border-border py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-5 sm:px-6">
          <header className="max-w-[62ch]">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
              What you get
            </p>
            <h2 className="mt-3 text-balance font-display text-[26px] font-medium leading-tight tracking-[-0.02em] sm:text-[32px]">
              The index tells you what exists. This tells you{" "}
              <ShinyText>what your choices cost.</ShinyText>
            </h2>
            <p className="editorial-justify mt-4 max-w-[60ch] text-pretty text-[14px] leading-relaxed text-fg-muted">
              These are not feature bullets, they are the six things that only
              come out of reading a specific stack end to end — the reasons the
              entry says &ldquo;skip it&rdquo; are usually about a constraint you have, and
              that is exactly what a generic list cannot see.
            </p>
          </header>

          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {reviewOffer.deliverables.map((d, i) => (
              <Bento
                as="li"
                key={d.title}
                className={`${d.span} p-6`}
              >
                <span
                  aria-hidden="true"
                  className="ac-rule mb-4 block h-px w-10"
                  style={{ background: "var(--aurora-grad)", animationDelay: `${i * 70}ms` }}
                />
                <h3 className="text-[15px] font-medium">{d.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">{d.body}</p>
              </Bento>
            ))}
          </ul>
        </div>
      </section>

      {/* =================================================================
          Process.

          Four steps with a beam that fills as you scroll past them. The beam is
          scroll-*driven*, not scroll-*listened* — so it costs the main thread
          nothing, and where scroll timelines are unsupported it is simply a
          static rule rather than a broken animation.
          ================================================================= */}
      <section className="relative border-b border-border py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-5 sm:px-6">
          <header className="max-w-[58ch]">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
              How it runs
            </p>
            <h2 className="mt-3 text-balance font-display text-[26px] font-medium leading-tight tracking-[-0.02em] sm:text-[32px]">
              Five working days. Thirty minutes of yours.
            </h2>
          </header>

          <ol className="ac-timeline relative mt-12 space-y-10 pl-12 sm:pl-16">
            {reviewOffer.steps.map((s) => (
              <li key={s.n} className="relative">
                <span
                  aria-hidden="true"
                  className="absolute -left-12 top-0 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-bg-elevated font-mono text-[11px] text-fg-subtle sm:-left-16"
                >
                  {s.n}
                </span>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-[16px] font-medium">{s.title}</h3>
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-fg-subtle">
                    {s.meta}
                  </span>
                </div>
                <p className="editorial-justify mt-2 max-w-[62ch] text-pretty text-[14px] leading-relaxed text-fg-muted">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* =================================================================
          Booking.

          Not a form. See `bookingHref` for why.
          ================================================================= */}
      <section id="book" className="relative scroll-mt-20 border-b border-border py-16 sm:py-20">
        <div className="relative z-10 mx-auto max-w-3xl px-5 text-center sm:px-6">
          <h2 className="text-balance font-display text-[26px] font-medium leading-tight tracking-[-0.02em] sm:text-[34px]">
            Ask a question first. It is the same email.
          </h2>
          <p className="editorial-justify mx-auto mt-4 max-w-[54ch] text-pretty text-[14px] leading-relaxed text-fg-muted">
            If the answer is that your stack is fine, that is the answer you get
            and nobody is going to pretend otherwise. A neutral index that
            oversells is not a neutral index.
          </p>

          <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Magnetic>
              <Link href={bookingHref()} className="ac-cta inline-flex h-12 items-center justify-center gap-2 px-7 text-[14px]">
                <span className="inline-flex items-center gap-2">
                  Request a review
                  <span aria-hidden="true">→</span>
                </span>
              </Link>
            </Magnetic>
            <Link
              href="/methodology"
              className="link-draw inline-flex min-h-11 items-center justify-center text-[14px] text-fg-muted hover:text-fg"
            >
              How the index is verified
            </Link>
          </div>

          <p className="mt-6 font-mono text-[11px] text-fg-subtle">
            {reviewOffer.slots} slots per month · {reviewOffer.deliveryDays} working days ·{" "}
            {site.contact.email}
          </p>
        </div>
      </section>

      {/* =================================================================
          FAQ.

          Native `<details>`. An accordion here needs no JavaScript, works
          before hydration, is keyboard- and screen-reader-correct for free, and
          its contents stay in the HTML for the crawlers that read this page.
          ================================================================= */}
      <section className="relative py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-6">
          <h2 className="font-display text-[26px] font-medium leading-tight tracking-[-0.02em] sm:text-[32px]">
            The questions that stop people
          </h2>

          <div className="mt-8 divide-y divide-border border-y border-border">
            {reviewOffer.faq.map((item) => (
              <details key={item.q} className="group">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-[15px] font-medium marker:content-none">
                  {item.q}
                  <span
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-fg-subtle transition-transform duration-300 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="editorial-justify max-w-[62ch] pb-5 text-pretty text-[14px] leading-relaxed text-fg-muted">
                  {item.a}
                </p>
              </details>
            ))}
          </div>

          <p className="mt-10 text-[13px] text-fg-subtle">
            Something not answered here?{" "}
            <a href={`mailto:${site.contact.email}`} className="link-draw text-fg-muted hover:text-fg">
              Ask directly
            </a>{" "}
            — it is the same person who writes the entries.
          </p>
        </div>
      </section>
    </div>
  );
}


