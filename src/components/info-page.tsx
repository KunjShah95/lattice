import Link from "next/link";

/**
 * Breadcrumb and header shared by every page that is *about* the index rather
 * than an entry in it: the trust pages, `/methodology` and `/submit`. One
 * component so the eyebrow, title scale and lede measure cannot drift apart
 * page by page — they had, by a few pixels each, before this existed.
 */
export function InfoPageHeader({
  breadcrumb,
  eyebrow,
  title,
  lede,
}: {
  breadcrumb: string;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  lede: React.ReactNode;
}) {
  return (
    <>
      <nav aria-label="Breadcrumb" className="font-mono text-[11px]">
        <ol className="flex flex-wrap items-center gap-1.5 text-fg-subtle">
          <li>
            <Link href="/" className="transition-colors hover:text-fg-muted">
              Index
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-fg-muted" aria-current="page">{breadcrumb}</li>
        </ol>
      </nav>

      <header className="mt-6">
        {eyebrow ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
            {eyebrow}
          </p>
        ) : null}
        <h1
          className={`${eyebrow ? "mt-4 " : ""}text-balance font-serif text-[34px] font-medium leading-[1.1] tracking-[-0.02em] sm:text-[42px]`}
        >
          {title}
        </h1>
        <p className="editorial-justify mt-4 max-w-[60ch] text-pretty text-[16px] leading-relaxed text-fg-muted">
          {lede}
        </p>
      </header>
    </>
  );
}

/** Page wrapper for the trust pages (contact, about, privacy, returns). */
export function InfoPageLayout({
  breadcrumb,
  eyebrow,
  title,
  lede,
  children,
}: {
  breadcrumb: string;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  lede: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-5 pt-14 sm:px-6 sm:pt-16">
      <InfoPageHeader breadcrumb={breadcrumb} eyebrow={eyebrow} title={title} lede={lede} />
      {children}
    </div>
  );
}

export function InfoSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12 border-t border-border pt-7">
      <h2 className="font-serif text-[22px] font-medium leading-snug tracking-[-0.015em]">
        {title}
      </h2>
      <div className="prose-lattice mt-4 max-w-[62ch]">{children}</div>
    </section>
  );
}

/** Bordered channel row — pattern borrowed from footer.design / designeer.xyz contact blocks. */
export function InfoChannel({
  href,
  label,
  detail,
  external,
}: {
  href: string;
  label: string;
  detail: string;
  external?: boolean;
}) {
  const className =
    "group flex min-h-[3.25rem] flex-col justify-center rounded-lg border border-border bg-bg-elevated px-4 py-3 transition-colors hover:border-border-strong";

  const inner = (
    <>
      <span className="text-[14px] font-medium text-fg transition-colors group-hover:text-accent">
        {label}
      </span>
      <span className="mt-0.5 font-mono text-[11px] text-fg-subtle">{detail}</span>
    </>
  );

  if (external || href.startsWith("mailto:")) {
    return (
      <a href={href} className={className} rel={external ? "noopener noreferrer" : undefined} target={external ? "_blank" : undefined}>
        {inner}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}

export function MaintainerNote({ children }: { children: React.ReactNode }) {
  return (
    <aside
      className="mt-10 rounded-lg border border-dashed border-border-strong bg-bg-elevated/60 px-4 py-3.5"
      aria-label="Maintainer note"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
        Maintainer
      </p>
      <p className="mt-2 text-pretty text-[14px] leading-relaxed text-fg-muted">
        {children}
      </p>
    </aside>
  );
}
