import Link from "next/link";

/**
 * The opening of every interior page, in the same language as the landing
 * pages: a dot field and a soft wash behind, a mono eyebrow in a pill, a
 * display title, a lede, then actions and a meta row.
 *
 * `wash` tints the background with a page's own colour: a section or tool
 * page passes its layer colour, so the hero says where in the stack the reader
 * is before they read a word. The decoration sits inside the header box (no
 * negative insets), so it can never push the page wider than the viewport.
 *
 * Server component; nothing here needs JavaScript.
 */
export function PageHero({
  breadcrumb,
  eyebrow,
  dot,
  title,
  lede,
  actions,
  meta,
  wash,
  align = "left",
  size = "lg",
  children,
}: {
  /** Trail above the eyebrow. The last item is the current page. */
  breadcrumb?: Array<{ label: string; href?: string }>;
  eyebrow?: React.ReactNode;
  /** Colour of the dot in the eyebrow pill (a layer or band colour). */
  dot?: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  actions?: React.ReactNode;
  /** Small mono facts under the actions: counts, dates. */
  meta?: React.ReactNode;
  /** CSS colour for the background wash; defaults to the accent. */
  wash?: string;
  align?: "left" | "center";
  /** `md` for dense reference pages where the content, not the title, leads. */
  size?: "lg" | "md";
  children?: React.ReactNode;
}) {
  const center = align === "center";
  return (
    <header
      // `hero-head` draws the wash and dot field on pseudo-elements; see
      // globals.css. One implementation for every interior page.
      className={`hero-head ${center ? "text-center" : ""}`}
      style={wash ? ({ "--wash": wash } as React.CSSProperties) : undefined}
    >

      {breadcrumb?.length ? (
        <nav aria-label="Breadcrumb" className="mb-7 font-mono text-[11px]">
          <ol className={`flex flex-wrap items-center gap-1.5 text-fg-subtle ${center ? "justify-center" : ""}`}>
            {breadcrumb.map((b, i) => {
              const last = i === breadcrumb.length - 1;
              return (
                <li key={`${b.label}-${i}`} className="flex items-center gap-1.5">
                  {b.href && !last ? (
                    <Link href={b.href} className="transition-colors hover:text-fg-muted">
                      {b.label}
                    </Link>
                  ) : (
                    <span className={last ? "text-fg-muted" : undefined} aria-current={last ? "page" : undefined}>
                      {b.label}
                    </span>
                  )}
                  {last ? null : <span aria-hidden="true">/</span>}
                </li>
              );
            })}
          </ol>
        </nav>
      ) : null}

      {eyebrow ? (
        <p
          className={`inline-flex max-w-full items-center gap-2 rounded-full bg-bg-elevated px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-fg-muted shadow-ink`}
        >
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: dot ?? "var(--accent)" }}
          />
          <span className="truncate">{eyebrow}</span>
        </p>
      ) : null}

      <h1
        className={`${eyebrow ? "mt-5" : ""} text-balance font-display font-medium tracking-[-0.025em] ${
          size === "lg"
            ? "text-[36px] leading-[1.06] sm:text-[50px]"
            : "text-[32px] leading-[1.1] sm:text-[42px]"
        } ${center ? "mx-auto max-w-3xl" : "max-w-3xl"}`}
      >
        {title}
      </h1>

      {lede ? (
        <div
          className={`mt-5 max-w-[62ch] text-pretty text-[16px] leading-relaxed text-fg-muted sm:text-[17px] ${
            center ? "mx-auto" : ""
          }`}
        >
          {lede}
        </div>
      ) : null}

      {actions ? (
        <div
          className={`mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center ${center ? "sm:justify-center" : ""}`}
        >
          {actions}
        </div>
      ) : null}

      {meta ? (
        <div
          className={`mt-7 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[11px] text-fg-subtle ${
            center ? "justify-center" : ""
          }`}
        >
          {meta}
        </div>
      ) : null}

      {children}
    </header>
  );
}

/** Primary/secondary buttons sized for a hero, so every page's actions match. */
export function HeroButton({
  href,
  children,
  variant = "primary",
  external = false,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  external?: boolean;
}) {
  const cls = `${variant === "primary" ? "btn-ink" : "btn-paper"} group inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 text-[14px] font-medium`;
  const inner = (
    <>
      {children}
      {variant === "primary" ? <span aria-hidden="true" className="nudge">→</span> : null}
    </>
  );
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {inner}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  );
}
