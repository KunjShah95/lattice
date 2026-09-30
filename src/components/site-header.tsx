import Link from "next/link";
import { Logo } from "./logo";
import { SearchTrigger } from "./search-provider";
import { ThemeToggle } from "./theme-toggle";
import { layerStyle } from "@/lib/layer";
import { stackLayers } from "@/lib/data";

// Nav follows the stack, so the header doubles as a depth indicator.
const navCategories = [...stackLayers].sort(
  (a, b) => (b.layer ?? 0) - (a.layer ?? 0),
);

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-5 sm:px-6">
        <Link
          href="/"
          className="shrink-0 text-[15px] transition-opacity hover:opacity-70"
        >
          <Logo />
        </Link>

        {/* Horizontally scrollable on narrow screens rather than a hamburger:
            the nav is short enough that a drawer would cost more than it saves.
            Counts are the first thing to go as space tightens — the colour rule
            still carries layer identity without them. */}
        <nav
          aria-label="Stack layers"
          className="no-scrollbar hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto lg:flex"
        >
          {navCategories.map((c) => (
            <Link
              key={c.slug}
              href={`/${c.slug}`}
              className="group flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[13px] text-fg-muted transition-colors hover:bg-bg-sunken hover:text-fg"
            >
              <span
                aria-hidden="true"
                className="h-2.5 w-[2px] rounded-full opacity-60 transition-opacity group-hover:opacity-100"
                style={layerStyle(c.layer)}
              />
              {c.short}
              <span className="hidden font-mono text-[11px] text-fg-subtle xl:inline">
                {c.tools.length}
              </span>
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <SearchTrigger className="hidden sm:inline-flex" />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
