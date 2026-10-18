import type { Metadata } from "next";
import Link from "next/link";
import {
  BookButton,
  CtaBand,
  EarlyAccessPill,
  Faq,
  PricingTiers,
  SectionHeading,
} from "@/components/marketing";
import { categories, toolCount } from "@/lib/data";
import { toJsonLd } from "@/lib/jsonld";
import { bookingIsExternal, FAQ, isEarlyAccess, TIERS } from "@/lib/offer";
import { posts } from "@/lib/posts";
import { resolvedComparisons } from "@/lib/comparisons";
import { absolute, breadcrumbNode, graph, ids } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Stack review: an engineer's second opinion on your AI stack",
  description:
    "Send your AI system's design and get a written, layer-by-layer review: what to keep, what to swap, what it costs, where it breaks. Free during early access.",
  alternates: { canonical: "/review" },
  openGraph: { url: absolute("/review") },
};

/**
 * Where a request goes when no scheduler is configured. Email when set, with
 * the subject and the questions pre-filled so a request arrives complete;
 * otherwise a GitHub issue, which is public: the copy says so.
 */
function requestHref(): { href: string; viaEmail: boolean } {
  const subject = "Stack review request";
  const body = [
    "What are you building?",
    "",
    "Rough traffic (requests / month):",
    "",
    "Tools you run or are considering:",
    "",
    "What worries you most about it:",
  ].join("\n");
  if (site.contact.email) {
    return {
      href: `mailto:${site.contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
      viaEmail: true,
    };
  }
  return {
    href: `${site.repo}/issues/new?title=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    viaEmail: false,
  };
}

const STEPS = [
  {
    n: "01",
    title: "Tell us what you are building",
    body: "A paragraph, rough traffic and the tools you run or are weighing. A diagram helps; nothing confidential is needed.",
  },
  {
    n: "02",
    title: "Every layer gets checked",
    body: "Inference, routing, retrieval, agents, guardrails, evals: each against the same use/skip criteria the index publishes.",
  },
  {
    n: "03",
    title: "You get a document you can act on",
    body: "Keep, swap or add, with the trade-off behind each call, a cost band for your traffic, and the risk most likely to bite first.",
  },
];

export default function ReviewPage() {
  const pageUrl = `${site.url}/review`;
  const req = requestHref();
  const jsonLd = toJsonLd(
    graph(
      {
        "@type": "Service",
        "@id": `${pageUrl}#service`,
        name: "AI stack review",
        serviceType: "AI infrastructure architecture review",
        url: pageUrl,
        description: metadata.description as string,
        provider: { "@id": ids.organization },
        areaServed: "Worldwide",
        offers: TIERS.map((t) => ({
          "@type": "Offer",
          name: t.name,
          description: t.forWho,
          price: t.price ?? 0,
          priceCurrency: "USD",
          url: pageUrl,
        })),
      },
      {
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
        mainEntity: FAQ.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      breadcrumbNode(pageUrl, [
        { name: site.name, path: "" },
        { name: "Stack review", path: "/review" },
      ]),
    ),
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="wash pointer-events-none absolute inset-0" />
        <div aria-hidden="true" className="bg-dots pointer-events-none absolute inset-0 opacity-70" />
        <div className="relative mx-auto max-w-5xl px-5 pb-16 pt-16 text-center sm:px-6 sm:pb-20 sm:pt-24">
          <EarlyAccessPill />
          <h1 className="mx-auto mt-6 max-w-3xl text-balance font-serif text-[38px] font-medium leading-[1.04] tracking-[-0.03em] sm:text-[56px]">
            A second opinion on your AI stack, from the engineer who mapped all of it.
          </h1>
          <p className="mx-auto mt-6 max-w-[56ch] text-pretty text-[16px] leading-relaxed text-fg-muted sm:text-[17px]">
            Send what you are building. Get back a written, layer-by-layer review
            (what to keep, what to swap, what it will cost and where it will
            break) from the maintainer of a {toolCount}-tool index that publishes when{" "}
            <em>not</em> to use each one.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-5">
            <BookButton className="w-full sm:w-auto">
              {isEarlyAccess ? "Book a free review" : "Book a review"}
            </BookButton>
            <a
              href="#pricing"
              className="group inline-flex min-h-11 items-center gap-1 text-[14px] text-fg-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-accent"
            >
              Compare the three options
              <span aria-hidden="true" className="nudge nudge-down inline-block">↓</span>
            </a>
          </div>
          <p className="mt-8 font-mono text-[11px] text-fg-subtle">
            {toolCount} tools mapped · re-verified every six months · no vendor money
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-5 sm:px-6">
        {/* ── The neutrality line, above the fold of the offer ───────── */}
        <p className="mx-auto -mt-2 max-w-3xl rounded-xl border border-border bg-bg-elevated/70 px-5 py-4 text-center text-pretty text-[13.5px] leading-relaxed text-fg-muted">
          <span className="font-medium text-fg">What a review is not:</span> it never changes
          where a tool sits in the index, a ranking or a comparison verdict, and vendors cannot
          book one about their own product. You are paying for judgement about your system: the
          index stays free and neutral.{" "}
          <Link
            href="/methodology"
            className="text-fg underline decoration-border-strong underline-offset-4 hover:decoration-accent"
          >
            How the index is kept
          </Link>
          .
        </p>

        {/* ── What you receive ──────────────────────────────────────── */}
        <section aria-labelledby="deliverable" className="py-20">
          <SectionHeading
            id="deliverable"
            title="A decision document, not a call you have to take notes on."
            lede="Every review is written down, dated and yours to keep. Each recommendation carries the trade-off behind it, so the reasoning survives the person who read it."
          />
          {/* An excerpt in the shape a review arrives in. Labelled as an
              example; it is not a client's review. */}
          <figure className="crop crop-static relative mx-auto mt-12 max-w-2xl rounded-2xl bg-bg-elevated p-6 shadow-lift [--crop-inset:-8px] sm:p-7">
            <figcaption className="flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.14em] text-fg-subtle">
              <span>Example excerpt</span>
              <span>RAG support assistant · 400k req/mo</span>
            </figcaption>
            <div className="mt-5 space-y-4 text-[13.5px] leading-relaxed">
              {[
                ["Keep", "band-state", "pgvector on your existing Postgres. At 2M chunks with tenant filters, a dedicated vector DB buys you an extra system to run, not recall."],
                ["Swap", "accent", "Direct OpenAI calls → a gateway. You have three providers in the roadmap and no fallback today; one outage takes the product down."],
                ["Add", "band-control", "An eval set before the next prompt change. You cannot tell whether last week's prompt edit helped, and neither can anyone else."],
              ].map(([verb, color, text]) => (
                <div key={verb} className="flex gap-3">
                  <span
                    className="mt-0.5 h-fit shrink-0 rounded-md px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-fg"
                    style={{ backgroundColor: `color-mix(in oklch, var(--${color}) 18%, transparent)` }}
                  >
                    {verb}
                  </span>
                  <p className="text-fg-muted">{text}</p>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-border pt-4 font-mono text-[11px] text-fg-subtle">
                <span>Est. cost band · $1.1k–$1.6k / mo</span>
                <span>Biggest risk · no fallback</span>
              </div>
            </div>
          </figure>
        </section>

        {/* ── How it works ──────────────────────────────────────────── */}
        <section aria-labelledby="how" className="border-t border-border py-20">
          <SectionHeading id="how" title="Three steps, no meetings required." />
          <ol className="mt-12 grid gap-4 md:grid-cols-3">
            {STEPS.map((s) => (
              <li
                key={s.n}
                data-spot
                className="relative rounded-2xl bg-bg-elevated/70 p-6 shadow-ink"
              >
                <span className="font-mono text-[12px] text-fg-subtle">{s.n}</span>
                <h3 className="mt-4 text-[16px] font-semibold tracking-[-0.01em]">{s.title}</h3>
                <p className="mt-2 text-pretty text-[14px] leading-relaxed text-fg-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Pricing ───────────────────────────────────────────────── */}
        <section id="pricing" aria-labelledby="pricing-h" className="scroll-mt-24 border-t border-border py-20">
          <SectionHeading
            id="pricing-h"
            title={isEarlyAccess ? "Pick a depth. All three are free right now." : "Pick a depth."}
            lede={
              isEarlyAccess
                ? "Early access: the first reviews shape the format, so they cost nothing in exchange for honest feedback. Prices will be published here before that changes."
                : "Every option is written, dated and yours to keep."
            }
          />
          <div className="mt-14">
            <PricingTiers />
          </div>
        </section>

        {/* ── Why trust it ──────────────────────────────────────────── */}
        <section aria-labelledby="proof" className="border-t border-border py-20">
          <SectionHeading
            id="proof"
            title="The review uses the same rulebook the index publishes."
            lede="You can read the criteria before you book. Every tool's use-when and skip-when, every comparison verdict and every correction are public."
          />
          <dl className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border shadow-ink md:grid-cols-4">
            {[
              [String(toolCount), "tools mapped across", `${categories.length} sections`],
              [String(resolvedComparisons.length), "head-to-head", "comparisons with a verdict"],
              [String(posts.length), "essays on the", "decisions behind a stack"],
              ["6 mo", "maximum age", "of any fact, or the build fails"],
            ].map(([figure, a, b]) => (
              <div key={a} className="bg-bg p-6">
                <dt className="sr-only">{`${a} ${b}`}</dt>
                <dd>
                  <span className="block font-serif text-[34px] font-medium leading-none tracking-[-0.02em]">{figure}</span>
                  <span className="mt-3 block text-[13px] leading-snug text-fg-muted">
                    {a} {b}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-center text-[13.5px] text-fg-muted">
            Reviewed by {site.maintainer ?? "the maintainer"}
            {site.author?.url ? (
              <>
                {" "}·{" "}
                <a
                  href={site.author.url}
                  className="text-fg underline decoration-border-strong underline-offset-4 hover:decoration-accent"
                >
                  {site.author.url.replace(/^https?:\/\//, "")}
                </a>
              </>
            ) : null}
          </p>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────── */}
        <section aria-labelledby="faq" className="border-t border-border py-20">
          <SectionHeading id="faq" title="Before you book." />
          <div className="mx-auto mt-12 max-w-3xl">
            <Faq />
          </div>
        </section>

        {/* ── Request (the fallback when no scheduler is configured) ── */}
        <section id="request" aria-labelledby="request-h" className="scroll-mt-24 border-t border-border py-20">
          <div className="flex flex-col items-center gap-8">
            <SectionHeading
              id="request-h"
              title="Start with four answers."
              lede="What you are building, rough traffic, the tools in play, and what worries you most. That is enough for a useful first pass."
            />
            <div className="flex flex-col items-center gap-2">
              {bookingIsExternal ? (
                <BookButton>Pick a time</BookButton>
              ) : (
                <a
                  href={req.href}
                  {...(req.viaEmail ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                  className="btn-ink group inline-flex h-12 items-center justify-center gap-2 rounded-lg px-5 text-[15px] font-medium"
                >
                  {req.viaEmail ? "Email your request" : "Open a request on GitHub"}
                  <span aria-hidden="true" className="nudge">→</span>
                </a>
              )}
              {!bookingIsExternal && !req.viaEmail ? (
                <p className="max-w-[44ch] text-center text-[12px] leading-relaxed text-fg-subtle">
                  GitHub issues are public. Leave out anything you would not post publicly, or use{" "}
                  <Link href="/contact" className="underline underline-offset-4 hover:text-fg">
                    another channel
                  </Link>
                  .
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <div className="pb-8">
          <CtaBand
            title="Ship the stack you would choose with all the facts."
            secondary={{ href: "/stack-builder", label: "Try the free Stack Builder first" }}
          />
        </div>
      </div>
    </>
  );
}
