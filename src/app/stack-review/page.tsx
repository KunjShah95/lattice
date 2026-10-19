import type { Metadata } from "next";
import Link from "next/link";
import { Aurora, Beams, Bento, CtaButton, MovingBorder, ShinyText, TextGenerate } from "@/components/acetate/motion-primitives";
import { Magnetic, Spotlight } from "@/components/acetate/pointer-effects";
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

function money(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: reviewOffer.currency,
    maximumFractionDigits: 0,
  });
}

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
function bookingHref(tier: string) {
  const body = [
    "Stack review request",
    "",
    `Tier: ${tier}`,
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
    `Stack review — ${tier}`,
  )}&body=${encodeURIComponent(body)}`;
}

export const metadata: Metadata = {
  title: "Stack Review — a paid read of your AI stack, by the index's author",
  description: `A dated written review of one team's AI stack: what to keep, what to change, what to delete, and what it costs to delay each one. ${money(
    reviewOffer.priceUsd,
  )}. The index itself stays free and unsponsored.`,
  alternates: { canonical: "/stack-review" },
  openGraph: {
    url: absolute("/stack-review"),
    title: "Stack Review — the index's author reads your stack",
    description: `Every layer you run, checked against the index. Three changes ranked by cost of delay. ${money(
      reviewOffer.priceUsd,
    )}, delivered in ${reviewOffer.deliveryDays} working days.`,
  },
};

export default function StackReviewPage() {
  const featured = reviewOffer.tiers[1];

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
            offers: reviewOffer.tiers
              .filter((t) => t.priceUsd > 0)
              .map((t) => ({
                "@type": "Offer",
                name: t.name,
                price: t.priceUsd,
                priceCurrency: reviewOffer.currency,
                availability: "https://schema.org/LimitedAvailability",
                url: absolute("/stack-review"),
              })),
          }),
        }}
      />

      {/* =================================================================
          Hero.

          One signature idea: the spotlight. Everything else here — the aurora
          blooms, the beams, the text reveal — is deliberately low-contrast
          enough to read as atmosphere rather than as a second effect competing
          with it. The one thing that is meant to be looked at is the price.
          ================================================================= */}
      <section className="relative isolate overflow-hidden border-b border-border">
        <Aurora />
        <Beams count={4} />
        <Spotlight />

        <div className="relative z-10 mx-auto max-w-5xl px-5 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-24">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center lg:gap-16">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
                <span className="ac-shiny inline-block h-1.5 w-1.5 rounded-full" />
                Paid service
                <span aria-hidden="true" className="text-border-strong">/</span>
                {reviewOffer.slots} slots per month
              </p>

              <h1 className="mt-5 text-balance font-serif text-[34px] font-medium leading-[1.05] tracking-[-0.025em] sm:text-[46px] lg:text-[52px]">
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

            {/* The price, given the loudest surface on the page. */}
            <div className="relative">
              <MovingBorder radius="1.25rem" className="bg-bg-elevated/70 backdrop-blur-sm">
                <div className="rounded-[1.25rem] p-7 sm:p-8">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
                    Stack Review
                  </p>
                  <p className="mt-4 flex items-baseline gap-2">
                    <span className="font-serif text-[54px] leading-none tracking-tight">
                      {money(featured.priceUsd)}
                    </span>
                    <span className="text-[13px] text-fg-subtle">one-off</span>
                  </p>
                  <p className="mt-3 text-[13px] leading-relaxed text-fg-muted">
                    One team, one workload.{" "}
                    <ShinyText className="font-medium">
                      {reviewOffer.deliveryDays} working days
                    </ShinyText>{" "}
                    from context to document.
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
                    No card needed to ask a question first.
                  </p>
                </div>
              </MovingBorder>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================
          Free vs paid.

          This section is the conversion argument, and it is built as a
          comparison rather than a feature list — because the objection is not
          "what is in the box", it is "why would I pay for an opinion when this
          site is free". Answering it means being explicit that the free
          product is not a trial of the paid one.
          ================================================================= */}
      <section id="what-you-get" className="relative scroll-mt-20 border-b border-border py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-5 sm:px-6">
          <header className="max-w-[62ch]">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
              What you are buying
            </p>
            <h2 className="mt-3 text-balance font-serif text-[26px] font-medium leading-tight tracking-[-0.02em] sm:text-[32px]">
              The index tells you what exists. This tells you{" "}
              <ShinyText>what your choices cost.</ShinyText>
            </h2>
            <p className="editorial-justify mt-4 max-w-[60ch] text-pretty text-[14px] leading-relaxed text-fg-muted">
              These are not feature bullets, they are the six things that only
              come out of reading a specific stack end to end — the reasons the
              entry says "skip it" are usually about a constraint you have, and
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
                <Spotlight />
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
            <h2 className="mt-3 text-balance font-serif text-[26px] font-medium leading-tight tracking-[-0.02em] sm:text-[32px]">
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
          Pricing.
          ================================================================= */}
      <section className="relative border-b border-border py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-5 sm:px-6">
          <header className="max-w-[62ch]">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
              Pricing
            </p>
            <h2 className="mt-3 text-balance font-serif text-[26px] font-medium leading-tight tracking-[-0.02em] sm:text-[32px]">
              The free one is not a trial of the paid one.
            </h2>
            <p className="editorial-justify mt-4 max-w-[60ch] text-pretty text-[14px] leading-relaxed text-fg-muted">
              It is the product. Everything below the free tier buys is depth
              and a conversation, not access — there is nothing on this site
              held back behind the first tier.
            </p>
          </header>

          <ul className="mt-10 grid gap-4 lg:grid-cols-3 lg:items-start">
            {reviewOffer.tiers.map((tier) => {
              const card = (
                <div
                  className={`flex h-full flex-col rounded-[1.25rem] p-6 ${
                    tier.featured
                      ? "bg-bg-elevated/80 backdrop-blur-sm"
                      : "bg-bg-elevated/40"
                  }`}
                >
                  {tier.featured ? (
                    <span
                      className="mb-4 inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em]"
                      style={{ background: "var(--aurora-grad)", color: "#06060a" }}
                    >
                      Most chosen
                    </span>
                  ) : (
                    <span className="mb-4 inline-flex h-[26px] items-center text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
                      {tier.priceUsd === 0 ? "Always free" : "Add-on"}
                    </span>
                  )}

                  <h3 className="text-[15px] font-medium">{tier.name}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">{tier.pitch}</p>

                  <p className="mt-6 flex items-baseline gap-2">
                    <span className="font-serif text-[40px] leading-none tracking-tight">
                      {money(tier.priceUsd)}
                    </span>
                    {tier.priceUsd > 0 ? (
                      <span className="text-[12px] text-fg-subtle">one-off</span>
                    ) : null}
                  </p>

                  <ul className="mt-6 flex-1 space-y-2.5 border-t border-border pt-5 text-[13px] text-fg-muted">
                    {tier.features.map((f) => (
                      <li key={f} className="flex gap-2.5">
                        <span
                          aria-hidden="true"
                          className={`mt-[3px] shrink-0 ${
                            tier.featured ? "text-accent" : "text-fg-subtle"
                          }`}
                        >
                          ✓
                        </span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-7">
                    {tier.priceUsd === 0 ? (
                      <Link
                        href={tier.cta.href}
                        className="btn-paper flex h-11 w-full items-center justify-center rounded-lg text-[14px] font-medium"
                      >
                        {tier.cta.label} →
                      </Link>
                    ) : (
                      <CtaButton className="h-11 w-full">
                        <a href={bookingHref(tier.name)}>{tier.cta.label} →</a>
                      </CtaButton>
                    )}
                  </div>
                </div>
              );

              return (
                <li key={tier.id} className="h-full">
                  {tier.featured ? <MovingBorder radius="1.25rem">{card}</MovingBorder> : card}
                </li>
              );
            })}
          </ul>

          {/* Risk reversal. Placed immediately under the price, not in the FAQ,
              because the objection it answers arrives at the price. */}
          <div className="mt-8 rounded-[1.25rem] border border-border bg-bg-elevated/40 p-6 sm:p-7">
            <p className="text-[15px] font-medium">
              <ShinyText>{reviewOffer.guarantee.headline}</ShinyText>
            </p>
            <p className="editorial-justify mt-2 max-w-[68ch] text-pretty text-[13px] leading-relaxed text-fg-muted">
              {reviewOffer.guarantee.detail}
            </p>
          </div>
        </div>
      </section>

      {/* =================================================================
          Booking.

          Not a form. See `bookingHref` for why.
          ================================================================= */}
      <section id="book" className="relative scroll-mt-20 border-b border-border py-16 sm:py-20">
        <Aurora />
        <div className="relative z-10 mx-auto max-w-3xl px-5 text-center sm:px-6">
          <h2 className="text-balance font-serif text-[26px] font-medium leading-tight tracking-[-0.02em] sm:text-[34px]">
            Ask a question first. It is free and it is the same email.
          </h2>
          <p className="editorial-justify mx-auto mt-4 max-w-[54ch] text-pretty text-[14px] leading-relaxed text-fg-muted">
            If the answer is that your stack is fine, that is the answer you get
            and it costs nothing. Nobody is going to pretend otherwise to make
            the sale — a neutral index that oversells is not a neutral index.
          </p>

          <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Magnetic>
              <Link href={bookingHref(featured.name)} className="ac-cta inline-flex h-12 items-center justify-center gap-2 px-7 text-[14px]">
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
          <h2 className="font-serif text-[26px] font-medium leading-tight tracking-[-0.02em] sm:text-[32px]">
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


