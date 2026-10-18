import Link from "next/link";
import { SearchTrigger } from "@/components/search-provider";
import { StatusArt } from "@/components/status-art";
import { categories, toolCount } from "@/lib/data";
import { layerStyle } from "@/lib/layer";
import { resolvedComparisons } from "@/lib/comparisons";
import { resolvedSymptoms } from "@/lib/symptoms";
import { site } from "@/lib/site";

/**
 * A 404 on a directory is usually a mistyped section or a stale link from a
 * search result, so this page tries to be useful rather than apologetic. In
 * order: what happened (one line), the fastest way out (search, which knows
 * every page), the three doors most readers want, then the whole index as
 * chips. A reader should never have to press back.
 */
const DOORS = [
  {
    href: "/stack-builder",
    label: "Stack Builder",
    title: "Build a stack for your workload",
    body: "Answer a few questions; get one pick per layer and a cost band.",
  },
  {
    href: "/fix",
    label: "Fix",
    title: "Start from what is wrong",
    body: `${resolvedSymptoms.length} symptoms, each an ordered checklist through the stack.`,
  },
  {
    href: "/compare",
    label: "Compare",
    title: "Pick between two tools",
    body: `${resolvedComparisons.length} head-to-heads, each ending in a verdict.`,
  },
];

export default function NotFound() {
  return (
    <div className="mx-auto max-w-4xl px-5 pb-20 pt-2 sm:px-6 sm:pt-4">
      <header className="hero-head text-center">
        <div className="flex justify-center">
          <StatusArt variant="missing" />
        </div>

        <p className="hero-pill mt-8 font-mono uppercase tracking-[0.14em] text-fg-muted">
          <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
          404 · Sheet not in set
        </p>

        <h1 className="mx-auto mt-5 max-w-2xl text-balance font-serif text-[36px] font-medium leading-[1.06] tracking-[-0.025em] sm:text-[52px]">
          This page isn&rsquo;t in the stack.
        </h1>

        <p className="mx-auto mt-5 max-w-[50ch] text-pretty text-[16px] leading-relaxed text-fg-muted sm:text-[17px]">
          It may have moved, or the link that brought you here was out of date.
          Nothing is broken on your side — the {toolCount}-tool index is still
          where you left it.
        </p>

        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link
            href="/"
            className="btn-ink group inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-[14px] font-medium"
          >
            <span
              aria-hidden="true"
              className="inline-block transition-transform duration-200 ease-[var(--ease-spring)] group-hover:-translate-x-0.5"
            >
              ←
            </span>
            Back to the index
          </Link>
          {/* The palette searches every page on the site, which is exactly
              what a reader who followed a dead link is trying to do. */}
          <SearchTrigger className="h-11 justify-center px-4 text-[14px]" />
        </div>
      </header>

      {/* Where most readers were trying to go. */}
      <section aria-labelledby="doors" className="border-t border-border pt-12">
        <h2
          id="doors"
          className="text-center font-mono text-[10.5px] uppercase tracking-[0.16em] text-fg-subtle"
        >
          Or start from one of these
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-3">
          {DOORS.map((d) => (
            <li key={d.href}>
              <Link
                href={d.href}
                data-spot=""
                className="crop group relative flex h-full flex-col rounded-2xl bg-bg-elevated/70 p-5 shadow-ink transition-shadow duration-300 [--crop-inset:-6px] hover:shadow-lift"
              >
                <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-fg-subtle">
                  {d.label}
                </span>
                <span className="mt-2.5 flex items-start justify-between gap-2 text-[16px] font-semibold leading-snug tracking-[-0.01em] transition-colors group-hover:text-accent">
                  {d.title}
                  <span aria-hidden="true" className="nudge text-fg-subtle">→</span>
                </span>
                <span className="mt-1.5 text-pretty text-[13.5px] leading-relaxed text-fg-muted">
                  {d.body}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Every section, so the whole index is one click away. Each chip
          carries its layer's colour, as everywhere else. */}
      <section aria-labelledby="sections" className="mt-14">
        <h2
          id="sections"
          className="text-center font-mono text-[10.5px] uppercase tracking-[0.16em] text-fg-subtle"
        >
          Every section
        </h2>
        <ul className="mt-5 flex flex-wrap justify-center gap-2">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/${c.slug}`}
                className="press inline-flex min-h-9 items-center gap-2 rounded-full bg-bg-elevated px-3 py-1.5 text-[13px] text-fg-muted shadow-ink hover:text-fg hover:shadow-lift"
              >
                <span aria-hidden="true" className="h-3 w-[2px] rounded-full" style={layerStyle(c.layer)} />
                <span className="font-mono text-[11px] text-fg-subtle">{c.index}</span>
                {c.short}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-14 text-center text-[13px] text-fg-subtle">
        Followed a link from this site that should work?{" "}
        <a
          href={site.contact.href}
          className="text-fg-muted underline decoration-border-strong underline-offset-4 hover:text-fg hover:decoration-accent"
        >
          Report the broken link
        </a>
        .
      </p>
    </div>
  );
}
