import Link from "next/link";
import { FAQ, bookingHref, bookingIsExternal } from "@/lib/offer";

/**
 * Building blocks for the conversion surfaces (`/` and `/review`).
 *
 * All server components: an FAQ and a CTA band carry no
 * interaction that needs JavaScript, so none of this lands in a client bundle.
 * The FAQ is `<details>`, which the browser opens and closes on its own.
 */

/**
 * Section opening: a left-aligned heading, an optional lede, and an optional
 * section number set in the margin like a chapter mark in a manual.
 *
 * Left-aligned rather than centred: a centred headline over a centred lede
 * is the stock landing-page section, and this site is a reference work. The
 * heading lines up with the content it introduces.
 */
export function SectionHeading({
  title,
  lede,
  id,
  index,
  className = "",
}: {
  title: React.ReactNode;
  lede?: React.ReactNode;
  id?: string;
  /** Section number, e.g. "03". Rendered in the left margin. */
  index?: string;
  className?: string;
}) {
  return (
    <div className={`grid gap-x-6 gap-y-3 border-t border-fg pt-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] ${className}`}>
      <h2
        id={id}
        className="flex items-baseline gap-4 text-balance font-display text-[26px] font-medium leading-[1.12] tracking-[-0.02em] text-fg sm:text-[32px]"
      >
        {index ? (
          <span aria-hidden="true" className="font-mono text-[13px] font-normal tracking-normal text-fg-subtle">
            {index}
          </span>
        ) : null}
        <span>{title}</span>
      </h2>
      {lede ? (
        <p className="max-w-[58ch] text-pretty text-[15px] leading-relaxed text-fg-muted md:pt-2">
          {lede}
        </p>
      ) : null}
    </div>
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

/** Questions answered before booking. Native disclosure, no JS. */
export function Faq({ items = FAQ }: { items?: Array<{ q: string; a: string }> }) {
  return (
    <div className="divide-y divide-border border-y border-border">
      {items.map((item) => (
        <details key={item.q} className="group [&_summary::-webkit-details-marker]:hidden">
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
 * all of it. A ruled block in the page's own ink, not an inverted promo card:
 * the ask should read as the end of the document, not as an advert inside it.
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
      className="grid gap-6 border-t border-fg pt-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-end"
    >
      <div className="max-w-2xl">
        <h2 className="text-balance font-display text-[26px] font-medium leading-[1.15] tracking-[-0.02em] sm:text-[30px]">
          {title}
        </h2>
        <p className="mt-3 max-w-[52ch] text-pretty text-[15px] leading-relaxed text-fg-muted">
          {lede}
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center md:justify-end md:gap-5">
        <Link
          href={bookingIsExternal ? bookingHref : "/review#request"}
          {...(bookingIsExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="btn-ink group inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-[14px] font-medium"
        >
          Book a free review
          <span aria-hidden="true" className="nudge">→</span>
        </Link>
        {secondary ? (
          <Link
            href={secondary.href}
            className="inline-flex min-h-11 items-center text-[14px] text-fg-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg"
          >
            {secondary.label}
          </Link>
        ) : null}
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
          Stack review · free
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
