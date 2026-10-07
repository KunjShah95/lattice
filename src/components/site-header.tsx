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
    // Opaque rather than `bg-bg/85 backdrop-blur-md`. At 85% opacity the blur
    // was contributing a fraction of a percent of visible difference while
    // costing a full backdrop read-back, blur and re-composite every time the
    // page scrolled underneath it. `backdrop-filter` cannot be cached across
    // scroll frames — the region beneath it changes — so on a header that is on
    // screen for the entire session it is a per-frame main-thread charge for
    // an effect nobody would notice missing.
    //
    // `header-elevate` adds a shadow once content scrolls beneath the bar. It is
    // a scroll-driven CSS animation, so it costs the main thread nothing — the
    // compositor owns it, unlike the blur this replaced.
    <header className="header-elevate sticky top-0 z-40 border-b border-border bg-bg pt-[env(safe-area-inset-top)]">
      {/* `relative` anchors the mobile drawer, which is absolutely
          positioned at top-full of this bar. */}
      <div className="relative mx-auto flex h-14 max-w-5xl items-center gap-4 px-5 sm:px-6">
        <Link
          href="/"
          className="press group -ml-1.5 shrink-0 rounded-md px-1.5 py-1 text-[15px] hover:bg-bg-sunken"
        >
          <Logo />
        </Link>

        <DesktopNav />

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {/* `compact` collapses to an icon below `sm`. This used to be
              `hidden sm:inline-flex`, which left the palette — the fastest way
              to find anything on a 113-tool index — completely unreachable on
              a phone. */}
          <SearchTrigger compact />
          <ThemeToggle />
          <MobileNav />
        </div>
      </div>
      {/* Reading progress: a hairline in the accent that draws across the
          bottom edge of the bar as the page scrolls. Scroll-driven, so it is
          absent where scroll timelines are unsupported rather than janky. */}
      <span
        aria-hidden="true"
        className="scroll-progress pointer-events-none absolute inset-x-0 -bottom-px h-px bg-accent/70"
      />
    </header>
  );
}
