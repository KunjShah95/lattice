import Link from "next/link";
import { Logo } from "./logo";
import { categories, stackLayers, toolCount } from "@/lib/data";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto max-w-5xl px-5 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-[30ch] text-pretty text-[13px] leading-relaxed text-fg-subtle">
              {site.tagline}
            </p>
            <p className="mt-4 font-mono text-[11px] text-fg-subtle">
              {toolCount} tools · {stackLayers.length} layers
            </p>
          </div>

          {/* Layers only — off-stack material gets its own line below. */}
          <nav aria-label="Stack layers">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-subtle">
              Layers
            </h2>
            <ul className="mt-3 space-y-2">
              {stackLayers.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/${c.slug}`}
                    className="flex items-baseline gap-2 text-[13px] text-fg-muted transition-colors hover:text-fg"
                  >
                    <span className="font-mono text-[11px] tabular-nums text-fg-subtle">
                      {c.index}
                    </span>
                    <span className="truncate">{c.short}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-subtle">
              Elsewhere
            </h2>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  href="/blog"
                  className="text-[13px] text-fg-muted transition-colors hover:text-fg"
                >
                  Essays
                </Link>
              </li>
              <li>
                <Link
                  href="/all"
                  className="text-[13px] text-fg-muted transition-colors hover:text-fg"
                >
                  All tools
                </Link>
              </li>
              <li>
                <Link
                  href="/compare"
                  className="text-[13px] text-fg-muted transition-colors hover:text-fg"
                >
                  Comparisons
                </Link>
              </li>
              <li>
                <a
                  href="/feed.xml"
                  className="text-[13px] text-fg-muted transition-colors hover:text-fg"
                >
                  RSS
                </a>
              </li>
              {categories
                .filter((c) => c.layer === null)
                .map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/${c.slug}`}
                      className="text-[13px] text-fg-muted transition-colors hover:text-fg"
                    >
                      {c.title}
                    </Link>
                  </li>
                ))}
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
