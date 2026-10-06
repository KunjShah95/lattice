import Link from "next/link";
import { Logo } from "./logo";
import { ProductHuntBadge } from "./product-hunt-badge";
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
    <footer className="mt-24 border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-5xl px-5 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div>
            <Logo />
            <p className="mt-3 max-w-[30ch] text-pretty text-[13px] leading-relaxed text-fg-subtle">
              {site.tagline}
            </p>
            <p className="mt-4 font-mono text-[11px] text-fg-subtle">
              {toolCount} tools · {layers.length} layers · {glossary.length} terms
            </p>
            <ProductHuntBadge className="mt-4" />
            <a
              href="https://usefulshelf.co/apps/lattice?utm_source=lattice.kkshah2005.workers.dev&utm_medium=referral&utm_campaign=badge&utm_content=light"
              target="_blank"
              rel="noopener"
              className="mt-4 inline-block"
            >
              <img
                src="https://usefulshelf.co/badge/lattice.svg"
                alt="Featured on UsefulShelf"
                width={248}
                height={66}
              />
            </a>
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
            <FooterLink href="/fix">Fix a symptom</FooterLink>
            <FooterLink href="/all">All tools</FooterLink>
            <FooterLink href="/compare">Comparisons</FooterLink>
            <FooterLink href="/blog">Essays</FooterLink>
            <FooterLink href="/roles">By role</FooterLink>
            <FooterLink href="/bands">By band</FooterLink>
            <FooterLink href="/methodology">Methodology</FooterLink>
            {/* Next to methodology rather than under "Submit", because it is the
                evidence for the claim methodology makes rather than a way to
                challenge it. */}
            <FooterLink href="/corrections">Corrections</FooterLink>
            {/* Beside methodology rather than under "Corrections" because it is
                how you challenge a selection, not how you report a broken
                link — and methodology is what defines the bar it is judged
                against. */}
            <FooterLink href="/submit">Submit a tool</FooterLink>
            <FooterLink href="https://github.com/KunjShah95/awesome-ai-infrastructure">The list on GitHub</FooterLink>
          </FooterColumn>

          <FooterColumn title="Site">
            <FooterLink href="/contact">Contact</FooterLink>
            <FooterLink href="/about">About</FooterLink>
            <FooterLink href="/returns">Returns &amp; refunds</FooterLink>
            <FooterLink href="/privacy">Privacy</FooterLink>
            <FooterLink href="/feed.xml">feed.xml</FooterLink>
            <FooterLink href="/llms.txt">llms.txt</FooterLink>
            <FooterLink href="/mcp.json">mcp.json</FooterLink>
          </FooterColumn>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[11px] text-fg-subtle">
            © {site.copyrightYear} {site.copyrightHolder}
            <span className="px-2" aria-hidden="true">·</span>
            <Link href="/contact" className="transition-colors hover:text-fg-muted">
              Contact
            </Link>
            <span className="px-2" aria-hidden="true">·</span>
            <Link href="/about" className="transition-colors hover:text-fg-muted">
              About
            </Link>
            <span className="px-2" aria-hidden="true">·</span>
            <Link href="/privacy" className="transition-colors hover:text-fg-muted">
              Privacy
            </Link>
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
        className="group flex min-h-7 items-baseline gap-2 text-[13px] text-fg-muted transition-colors hover:text-fg"
      >
        {/* A short lead rule draws in ahead of the label on hover, so the
            link being pointed at is marked without a colour shift alone. */}
        <span
          aria-hidden="true"
          className="h-px w-0 shrink-0 self-center bg-accent transition-[width] duration-300 ease-[var(--ease-out)] group-hover:w-2.5"
        />
        {children}
      </Link>
    </li>
  );
}
