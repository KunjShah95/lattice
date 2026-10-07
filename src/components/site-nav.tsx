"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * The header is deliberately short. The stack diagram on the index is a far
 * better layer navigator than a strip of ten links ever was, so the header only
 * carries what the diagram cannot: the top-level sections.
 *
 * `/methodology` earns a slot rather than living in the footer, because it is
 * the page a sceptical reader opens to decide whether to believe anything else
 * here — and it is the only route whose subject is the index itself rather than
 * an entry in it. Burying it would be self-defeating.
 */
const links = [
  { href: "/", label: "Index" },
  { href: "/stack-builder", label: "Stack Builder" },
  { href: "/fix", label: "Fix" },
  { href: "/all", label: "All tools" },
  { href: "/roles", label: "Roles" },
  { href: "/bands", label: "Bands" },
  { href: "/compare", label: "Compare" },
  { href: "/blog", label: "Essays" },
  { href: "/glossary", label: "Glossary" },
  { href: "/methodology", label: "Method" },
] as const;

function useIsActive() {
  const pathname = usePathname();
  return (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function DesktopNav() {
  const isActive = useIsActive();

  return (
    <nav aria-label="Sections" className="hidden items-center gap-1 lg:flex">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={isActive(l.href) ? "page" : undefined}
          className={`press group relative rounded-md px-2.5 py-1 text-[13px] ${
            isActive(l.href)
              ? "text-fg"
              : "text-fg-muted hover:bg-bg-sunken hover:text-fg"
          }`}
        >
          {l.label}
          {/* Underline is a drawn rule, not a pill — matches the rest of the
              page's hairline treatment. Inactive links draw a faint rule from
              the left on hover; the active one holds it in the accent. */}
          <span
            aria-hidden="true"
            className={`absolute inset-x-2.5 -bottom-px h-px origin-left transition-transform duration-300 ease-[var(--ease-out)] ${
              isActive(l.href)
                ? "scale-x-100 bg-accent"
                : "scale-x-0 bg-border-strong group-hover:scale-x-100"
            }`}
          />
        </Link>
      ))}
    </nav>
  );
}

/**
 * Mobile drawer. The header nav used to be `hidden` below lg, which left
 * phones with no navigation at all — the worst possible state for a site
 * whose whole value is browsing by section.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const isActive = useIsActive();

  // Closing is owned by the events that cause it — the link press and the
  // Escape key — rather than an effect watching the route. Same principle as
  // the search palette: transient UI state belongs to the interaction that
  // opened it, not to a subscription that fires after render.
  const close = () => setOpen(false);

  // Lock the page behind the panel and let Escape dismiss it.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "Close menu" : "Open menu"}
        className="press -mr-1 flex h-10 w-10 items-center justify-center rounded-md text-fg-muted hover:bg-bg-sunken hover:text-fg"
      >
        {/* Three rules that fold into a cross, rather than two icons
            swapped — the control visibly becomes its own opposite. */}
        <span aria-hidden="true" className="relative block h-3 w-4">
          <span
            className={`absolute left-0 h-[1.5px] w-4 rounded-full bg-current transition-all duration-300 ease-[var(--ease-out)] ${
              open ? "top-[5.25px] rotate-45" : "top-0"
            }`}
          />
          <span
            className={`absolute left-0 top-[5.25px] h-[1.5px] rounded-full bg-current transition-all duration-200 ease-[var(--ease-out)] ${
              open ? "w-0 opacity-0" : "w-3 opacity-100"
            }`}
          />
          <span
            className={`absolute left-0 h-[1.5px] w-4 rounded-full bg-current transition-all duration-300 ease-[var(--ease-out)] ${
              open ? "top-[5.25px] -rotate-45" : "top-[10.5px]"
            }`}
          />
        </span>
      </button>

      {open ? (
        <>
          {/* Tap-catcher closes on outside press. */}
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={close}
            className="fixed inset-0 top-[calc(3.5rem+env(safe-area-inset-top))] z-30 cursor-default bg-bg/40"
          />
          <nav
            id="mobile-nav"
            aria-label="Sections"
            // Solid, not `bg-bg/95 backdrop-blur-md` — at 95% the blur is
            // invisible, and a backdrop-filter has to be recomputed whenever
            // the content behind it changes. See the note on the site header.
            className="pop-in absolute inset-x-0 top-full z-40 max-h-[calc(100dvh-3.5rem-env(safe-area-inset-top))] overflow-y-auto overscroll-contain border-b border-border bg-bg pb-[env(safe-area-inset-bottom)] shadow-float"
          >
            <ul className="mx-auto max-w-5xl px-5 py-2 sm:px-6">
              {links.map((l, i) => (
                <li
                  key={l.href}
                  className="drop-in"
                  style={{ "--i": i } as React.CSSProperties}
                >
                  <Link
                    href={l.href}
                    onClick={close}
                    aria-current={isActive(l.href) ? "page" : undefined}
                    className={`group flex min-h-12 items-center gap-4 border-b border-border py-3 text-[16px] transition-colors active:bg-bg-sunken ${
                      isActive(l.href) ? "text-fg" : "text-fg-muted"
                    }`}
                  >
                    {/* Sheet numbers, the way a drawing set indexes its
                        pages — and a fixed-width gutter that keeps every
                        label on the same left edge. */}
                    <span
                      aria-hidden="true"
                      className={`w-5 font-mono text-[11px] ${
                        isActive(l.href) ? "text-fg" : "text-fg-subtle"
                      }`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1">{l.label}</span>
                    {isActive(l.href) ? (
                      <span aria-hidden="true" className="h-px w-5 bg-accent" />
                    ) : (
                      <span aria-hidden="true" className="nudge text-fg-subtle">
                        →
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </>
      ) : null}
    </div>
  );
}
