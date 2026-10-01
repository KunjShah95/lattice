import Link from "next/link";
import { Logo } from "./logo";
import { categories, stackLayers, toolCount } from "@/lib/data";
import { glossary } from "@/lib/glossary";
import { site } from "@/lib/site";

/**
 * Site-wide navigation.
 *
 * Every top-level page is listed here. The footer is the only place a reader
 * can reach everything without using the header, so a route that exists but is
 * not linked from here is effectively invisible to anyone not already on it —
 * which is how the glossary ended up reachable only by typing the URL.
 *
 * Columns are grouped by what a reader is looking for, not by internal type:
 *   - Layers: the 9 numbered stack layers, in stack order
 *   - Sections: off-stack material, which has no layer number
 *   - Index: cross-cutting pages that cut across the stack
 */
export function SiteFooter() {
  const layers = stackLayers;
  const offStack = categories.filter((c) => c.layer === null);

  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto max-w-5xl px-5 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-3 max-w-[30ch] text-pretty text-[13px] leading-relaxed text-fg-subtle">
              {site.tagline}
            </p>
            <p className="mt-4 font-mono text-[11px] text-fg-subtle">
              {toolCount} tools · {layers.length} layers · {glossary.length} terms
            </p>
          </div>

          <FooterColumn title="Layers">
            {layers.map((c) => (
              <FooterLink key={c.slug} href={`/${c.slug}`}>
                <span className="font-mono text-[11px] tabular-nums text-fg-subtle">
                  {c.index}
                </span>
                <span className="truncate">{c.short}</span>
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="Sections">
            {offStack.map((c) => (
              <FooterLink key={c.slug} href={`/${c.slug}`}>
                {c.title}
              </FooterLink>
            ))}
            <FooterLink href="/glossary">Glossary</FooterLink>
          </FooterColumn>

          <FooterColumn title="Index">
            <FooterLink href="/">Home</FooterLink>
            <FooterLink href="/all">All tools</FooterLink>
            <FooterLink href="/compare">Comparisons</FooterLink>
            <FooterLink href="/blog">Essays</FooterLink>
            <FooterLink href="/feed.xml">RSS</FooterLink>
            <FooterLink href="/sitemap.xml">Sitemap</FooterLink>
          </FooterColumn>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[11px] text-fg-subtle">
            © {site.copyrightYear} {site.copyrightHolder}
          </p>
          <p className="font-mono text-[11px] text-fg-subtle">
            <a
              href={`mailto:${site.contact.email}`}
              className="transition-colors hover:text-fg-muted"
            >
              {site.contact.email}
            </a>
            <span className="px-2" aria-hidden="true">
              ·
            </span>
            <a
              href={site.contact.x}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-fg-muted"
            >
              X / Twitter
            </a>
          </p>
        </div>
        <p className="mt-3 font-mono text-[11px] text-fg-subtle">
          A curated index. All tools belong to their respective authors.
        </p>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <nav aria-label={title}>
      <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-subtle">
        {title}
      </h2>
      <ul className="mt-3 space-y-2">{children}</ul>
    </nav>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-baseline gap-2 text-[13px] text-fg-muted transition-colors hover:text-fg"
      >
        {children}
      </Link>
    </li>
  );
}
