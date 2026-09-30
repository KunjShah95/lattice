import Link from "next/link";
import { Logo } from "./logo";
import { DesktopNav, MobileNav } from "./site-nav";
import { SearchTrigger } from "./search-provider";
import { ThemeToggle } from "./theme-toggle";

/**
 * Three links, not ten. The nine layer links that used to live here were the
 * loudest generic-template signal on the page, and the stack diagram on the
 * index already navigates layers better than a header strip can — it shows
 * depth, colour and density that a flat list of links threw away.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-md">
      {/* `relative` anchors the mobile drawer, which is absolutely
          positioned at top-full of this bar. */}
      <div className="relative mx-auto flex h-14 max-w-5xl items-center gap-4 px-5 sm:px-6">
        <Link
          href="/"
          className="shrink-0 text-[15px] transition-opacity hover:opacity-70"
        >
          <Logo />
        </Link>

        <DesktopNav />

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <SearchTrigger className="hidden sm:inline-flex" />
          <ThemeToggle />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
