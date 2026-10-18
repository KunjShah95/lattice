import Link from "next/link";
import {
  FAQ,
  TIERS,
  bookingHref,
  bookingIsExternal,
  isEarlyAccess,
  priceLabel,
  type Tier,
} from "@/lib/offer";

/**
 * Building blocks for the conversion surfaces (`/` and `/review`).
 *
 * All server components: a pricing table, an FAQ and a CTA band carry no
 * interaction that needs JavaScript, so none of this lands in a client bundle.
 * The FAQ is `<details>`, which the browser opens and closes on its own.
 */

/** Mono eyebrow + display heading + lede, the opening of every section. */
export function SectionHeading({
  eyebrow,
  title,
  lede,
  id,
  align = "left",
}: {
  eyebrow: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  id?: string;
  align?: "left" | "center";
}) {
  const center = align === "center";
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p
        className={`flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-fg-subtle ${
          center ? "justify-center" : ""
        }`}
      >
        <span aria-hidden="true" className="h-px w-5 bg-border-strong" />
        {eyebrow}
        {center ? <span aria-hidden="true" className="h-px w-5 bg-border-strong" /> : null}
      </p>
      <h2
        id={id}
        className="mt-4 text-balance font-serif text-[28px] font-medium leading-[1.1] tracking-[-0.02em] sm:text-[36px]"
      >
        {title}
      </h2>
      {lede ? (
        <p className="mt-4 text-pretty text-[15px] leading-relaxed text-fg-muted sm:text-[16px]">
          {lede}
        </p>
      ) : null}
    </div>
  );
}

/** The pill that says the offer is currently free. Renders nothing once priced. */
export function EarlyAccessPill({ className = "" }: { className?: string }) {
  if (!isEarlyAccess) return null;
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full bg-bg-elevated px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-fg-muted shadow-ink ${className}`}
    >
      <span aria-hidden="true" className="pulse-dot h-1.5 w-1.5 rounded-full bg-band-state" />
      Free during early access
    </span>
  );
}

/** Primary booking button. External scheduler when configured, else the request section. */
export function BookButton({
  children = "Book a free review",
  className = "",
  size = "lg",
}: {
  children?: React.ReactNode;
  className?: string;
  size?: "md" | "lg";
}) {
  const sizing = size === "lg" ? "h-12 px-5 text-[15px]" : "h-10 px-4 text-[14px]";
  const cls = `btn-ink group inline-flex items-center justify-center gap-2 rounded-lg font-medium ${sizing} ${className}`;
  const inner = (
    <>
      {children}
      <span aria-hidden="true" className="nudge">→</span>
    </>
  );
  return bookingIsExternal ? (
    <a href={bookingHref} target="_blank" rel="noopener noreferrer" className={cls}>
      {inner}
    </a>
  ) : (
    <Link href={bookingHref} className={cls}>
      {inner}
    </Link>
  );
}

function Check() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="mt-[3px] shrink-0 text-band-state"
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function TierCard({ tier }: { tier: Tier }) {
  const featured = Boolean(tier.featured);
  return (
    <li
      className={`relative flex flex-col rounded-2xl p-6 sm:p-7 ${
        featured ? "border-beam bg-bg-elevated shadow-lift" : "bg-bg-elevated/70 shadow-ink"
      }`}
    >
      {featured ? (
        <span className="absolute -top-3 left-6 rounded-full bg-fg px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-bg">
          Recommended
        </span>
      ) : null}
      <h3 className="text-[16px] font-semibold tracking-[-0.01em]">{tier.name}</h3>
      <p className="mt-1.5 min-h-[3em] text-pretty text-[13.5px] leading-relaxed text-fg-muted">
        {tier.forWho}
      </p>

      <p className="mt-5 flex items-baseline gap-2">
        <span className="font-serif text-[40px] font-medium leading-none tracking-[-0.02em]">
          {priceLabel(tier)}
        </span>
        {tier.price === null ? (
          <span className="text-[13px] text-fg-subtle">during early access</span>
        ) : (
          <span className="text-[13px] text-fg-subtle">{tier.cadence}</span>
        )}
      </p>
      <p className="mt-1.5 font-mono text-[11px] text-fg-subtle">{tier.turnaround}</p>

      <ul className="mt-6 space-y-2.5 border-t border-border pt-5">
        {tier.includes.map((line) => (
          <li key={line} className="flex gap-2.5 text-[13.5px] leading-snug text-fg">
            <Check />
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-7">
        {featured ? (
          <BookButton size="md" className="w-full">
            {tier.cta}
          </BookButton>
        ) : (
          <Link
            href={bookingIsExternal ? bookingHref : "/review#request"}
            {...(bookingIsExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="btn-paper group inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg px-4 text-[14px] font-medium"
          >
            {tier.cta}
            <span aria-hidden="true" className="nudge">→</span>
          </Link>
        )}
      </div>
    </li>
  );
}

/** The three tiers, featured one in the middle. */
export function PricingTiers() {
  return (
    <ul className="grid gap-5 pt-3 md:grid-cols-3 md:gap-4 lg:gap-5">
      {TIERS.map((t) => (
        <TierCard key={t.id} tier={t} />
      ))}
    </ul>
  );
}

/** Questions answered before booking. Native disclosure, no JS. */
export function Faq({ items = FAQ }: { items?: Array<{ q: string; a: string }> }) {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-2xl bg-bg-elevated/70 shadow-ink">
      {items.map((item) => (
        <details key={item.q} className="group px-5 sm:px-6 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-medium">
            {item.q}
            <span
              aria-hidden="true"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-border text-fg-subtle transition-transform duration-300 ease-[var(--ease-spring)] group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <p className="-mt-1 pb-5 pr-10 text-pretty text-[14px] leading-relaxed text-fg-muted">{item.a}</p>
        </details>
      ))}
    </div>
  );
}

/**
 * Closing call to action: the last thing on a page, for the reader who read
 * all of it. Dark panel in both themes (ink on paper inverts), so it reads as
 * the end of the document rather than another section.
 */
export function CtaBand({
  title = "Get a second pair of eyes on your AI stack.",
  lede = "Describe what you are building. You get back a written review of every layer: what to keep, what to swap, what it will cost and where it will break.",
  secondary = { href: "/stack-builder", label: "Or build it yourself" },
}: {
  title?: string;
  lede?: string;
  secondary?: { href: string; label: string } | null;
}) {
  return (
    <section
      aria-label="Book a stack review"
      className="relative overflow-hidden rounded-3xl bg-fg px-6 py-12 text-bg sm:px-12 sm:py-16"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_70%_80%_at_80%_20%,#000,transparent)]"
      />
      <div className="relative max-w-2xl">
        {isEarlyAccess ? (
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] opacity-70">
            Free during early access
          </p>
        ) : null}
        <h2 className="mt-3 text-balance font-serif text-[28px] font-medium leading-[1.12] tracking-[-0.02em] sm:text-[38px]">
          {title}
        </h2>
        <p className="mt-4 max-w-[52ch] text-pretty text-[15px] leading-relaxed opacity-75">{lede}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          {/* Inverted: paper on ink. */}
          <Link
            href={bookingIsExternal ? bookingHref : "/review#request"}
            {...(bookingIsExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-bg px-5 text-[15px] font-medium text-fg shadow-[inset_0_1px_0_oklch(1_0_0/0.4)] transition-transform duration-150 ease-[var(--ease-spring)] hover:-translate-y-px active:scale-[0.975]"
          >
            Book a free review
            <span aria-hidden="true" className="nudge">→</span>
          </Link>
          {secondary ? (
            <Link
              href={secondary.href}
              className="inline-flex min-h-11 items-center text-[14px] underline underline-offset-4 opacity-80 transition-opacity hover:opacity-100"
            >
              {secondary.label}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/**
 * A compact offer card for the end of a content page (a tool, a comparison,
 * an essay, a Stack Builder result). `context` names what the reader was just
 * looking at, so the ask follows from it rather than interrupting it.
 */
export function ReviewCta({ context }: { context: string }) {
  return (
    <aside
      aria-label="Stack review"
      className="crop relative mt-12 flex flex-col gap-5 rounded-2xl bg-bg-elevated p-6 shadow-ink [--crop-inset:-6px] sm:flex-row sm:items-center sm:justify-between sm:p-7"
    >
      <div className="max-w-[52ch]">
        <p className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-fg-subtle">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
          {isEarlyAccess ? "Stack review · free during early access" : "Stack review"}
        </p>
        <p className="mt-2 text-pretty text-[16px] font-medium leading-snug">{context}</p>
        <p className="mt-1.5 text-pretty text-[13.5px] leading-relaxed text-fg-muted">
          Send your setup and get a written, layer-by-layer review back. Reviews never change
          where a tool sits in this index.
        </p>
      </div>
      <Link
        href="/review"
        className="btn-ink group inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-4 text-[14px] font-medium"
      >
        See how it works
        <span aria-hidden="true" className="nudge">→</span>
      </Link>
    </aside>
  );
}
