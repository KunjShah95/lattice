import Link from "next/link";
import { Logo } from "./logo";
import { SearchTrigger } from "./search-provider";
import { ThemeToggle } from "./theme-toggle";
import { categories } from "@/lib/data";
import { site } from "@/lib/site";

const countFor = (key: string) =>
  categories.find((c) => c.slug === key)?.tools.length ?? 0;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-5 sm:px-6">
        <Link
          href="/"
          className="shrink-0 text-[15px] transition-opacity hover:opacity-70"
        >
          <Logo />
        </Link>

        {/* Horizontally scrollable on narrow screens rather than a hamburger:
            the nav is short enough that a drawer would cost more than it saves. */}
        <nav
          aria-label="Categories"
          className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto md:flex"
        >
          {site.navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex shrink-0 items-baseline gap-1.5 rounded-md px-2 py-1 text-[13px] text-fg-muted transition-colors hover:bg-bg-sunken hover:text-fg"
            >
              {item.label}
              <span className="font-mono text-[11px] text-fg-subtle">
                {countFor(item.countKey)}
              </span>
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <SearchTrigger className="hidden sm:inline-flex" />
          <Link
            href="/#all"
            className="hidden text-[13px] text-fg-muted transition-colors hover:text-fg lg:block"
          >
            All {categories.length} sections
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
