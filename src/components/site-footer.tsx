import Link from "next/link";
import { Logo } from "./logo";
import { categories, toolCount } from "@/lib/data";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto max-w-5xl px-5 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Logo />
            <p className="mt-3 max-w-[28ch] text-pretty text-[13px] leading-relaxed text-fg-subtle">
              {site.tagline}
            </p>
          </div>

          <div>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-subtle">
              Sections
            </h2>
            <ul className="mt-3 space-y-2">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/${c.slug}`}
                    className="text-[13px] text-fg-muted transition-colors hover:text-fg"
                  >
                    {c.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-subtle">
              About
            </h2>
            <ul className="mt-3 space-y-2">
              <li>
                <span className="text-[13px] text-fg-muted">
                  {toolCount} tools indexed
                </span>
              </li>
              <li>
                <span className="text-[13px] text-fg-muted">
                  {categories.length} categories
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-subtle">
              Contact
            </h2>
            <ul className="mt-3 space-y-2">
              <li>
                <a
                  href={`mailto:${site.contact.email}`}
                  className="text-[13px] text-fg-muted transition-colors hover:text-fg"
                >
                  {site.contact.email}
                </a>
              </li>
              <li>
                <a
                  href={site.contact.x}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] text-fg-muted transition-colors hover:text-fg"
                >
                  X / Twitter
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[11px] text-fg-subtle">
            © {site.copyrightYear} {site.copyrightHolder}
          </p>
          <p className="font-mono text-[11px] text-fg-subtle">
            A curated index. All tools belong to their respective authors.
          </p>
        </div>
      </div>
    </footer>
  );
}
