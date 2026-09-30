"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * The header is deliberately three items. The stack diagram on the index is a
 * far better layer navigator than a strip of ten links ever was, so the
 * header only carries what the diagram cannot: the top-level sections.
 */
const links = [
  { href: "/", label: "Index" },
  { href: "/compare", label: "Compare" },
  { href: "/blog", label: "Essays" },
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
          className={`relative rounded-md px-2.5 py-1 text-[13px] transition-colors ${
            isActive(l.href)
              ? "text-fg"
              : "text-fg-muted hover:bg-bg-sunken hover:text-fg"
          }`}
        >
          {l.label}
          {/* Underline is a drawn rule, not a pill — matches the rest of the
              page's hairline treatment. */}
          <span
            aria-hidden="true"
            className={`absolute inset-x-2.5 -bottom-px h-px transition-opacity ${
              isActive(l.href) ? "bg-accent opacity-100" : "opacity-0"
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
        className="-mr-1 flex h-9 w-9 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-bg-sunken hover:text-fg"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          aria-hidden="true"
        >
          {open ? (
            <>
              <path d="M6 6l12 12" />
              <path d="M18 6L6 18" />
            </>
          ) : (
            <>
              <path d="M4 7h16" />
              <path d="M4 12h16" />
              <path d="M4 17h16" />
            </>
          )}
        </svg>
      </button>

      {open ? (
        <>
          {/* Tap-catcher closes on outside press. */}
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={close}
            className="fixed inset-0 top-14 z-30 cursor-default"
          />
          <nav
            id="mobile-nav"
            aria-label="Sections"
            className="absolute inset-x-0 top-full z-40 border-b border-border bg-bg/95 backdrop-blur-md"
          >
            <ul className="mx-auto max-w-5xl px-5 py-2 sm:px-6">
              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={close}
                    aria-current={isActive(l.href) ? "page" : undefined}
                    className={`flex items-center justify-between border-b border-border py-3 text-[15px] last:border-b-0 ${
                      isActive(l.href) ? "text-fg" : "text-fg-muted"
                    }`}
                  >
                    {l.label}
                    {isActive(l.href) ? (
                      <span aria-hidden="true" className="h-px w-5 bg-accent" />
                    ) : null}
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
