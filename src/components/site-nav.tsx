"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * The header is deliberately short. The stack diagram on the index is a far
 * better layer navigator than a strip of ten links ever was, so the header only
 * carries what the diagram cannot: the top-level sections.
 *
 * Six primary destinations, plus one "More" popover. The four secondary pages
 * (Roles, Bands, Glossary, Method) are not rare — they are just not the reason
 * anyone arrives, and putting them in the same row as "All tools" flattened the
 * one decision the header exists to make. A popover keeps them one tap away
 * without giving them the same weight, and it lets the primary labels grow to a
 * readable size.
 *
 * `/methodology` still earns a slot rather than living only in the footer: it is
 * the page a sceptical reader opens to decide whether to believe anything else
 * here, so it sits in the More menu rather than being buried at the page bottom.
 */
const primary = [
  { href: "/", label: "Index" },
  { href: "/all", label: "All tools" },
  { href: "/stack-builder", label: "Stack Builder" },
  { href: "/compare", label: "Compare" },
  { href: "/fix", label: "Fix" },
  { href: "/blog", label: "Essays" },
] as const;

const secondary = [
  { href: "/roles", label: "By role" },
  { href: "/bands", label: "By band" },
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
  const [moreOpen, setMoreOpen] = useState(false);

  const secondaryActive = secondary.some((l) => isActive(l.href));

  // Escape dismisses the menu, and a route-aware listener closes it on any
  // outside decision. Transient UI state belongs to the interaction that opened
  // it, not to a subscription that fires after render.
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  return (
    <nav aria-label="Sections" className="hidden items-center gap-0.5 lg:flex">
      {primary.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={isActive(l.href) ? "page" : undefined}
          className={`press group relative rounded-[var(--r-control)] px-3 py-2 text-[14px] transition-colors ${
            isActive(l.href)
              ? "text-fg"
              : "text-fg-muted hover:bg-bg-sunken hover:text-fg"
          }`}
        >
          {l.label}
          <span
            aria-hidden="true"
            className={`absolute inset-x-3 bottom-0.5 h-[2px] origin-left rounded-full transition-transform duration-300 ease-[var(--ease-out)] ${
              isActive(l.href)
                ? "scale-x-100 bg-accent"
                : "scale-x-0 bg-border-strong group-hover:scale-x-100"
            }`}
          />
        </Link>
      ))}

      <div className="relative">
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
          aria-controls="more-menu"
          className={`press flex items-center gap-1.5 rounded-[var(--r-control)] px-3 py-2 text-[14px] transition-colors ${
            secondaryActive ? "text-fg" : "text-fg-muted hover:bg-bg-sunken hover:text-fg"
          }`}
        >
          More
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={`transition-transform duration-200 ${moreOpen ? "rotate-180" : ""}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
          {secondaryActive ? (
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
          ) : null}
        </button>

        {moreOpen ? (
          <>
            <button
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              onClick={() => setMoreOpen(false)}
              className="fixed inset-0 z-30 cursor-default"
            />
            <div
              id="more-menu"
              className="pop-in absolute left-0 top-[calc(100%+0.6rem)] z-40 w-56 overflow-hidden rounded-[var(--r-card)] border border-border-strong bg-bg-elevated p-1.5 shadow-float"
            >
              <p className="px-2.5 pb-1.5 pt-1.5 text-[12px] font-mono uppercase tracking-[0.1em] text-fg-subtle">
                Browse another way
              </p>
              {secondary.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMoreOpen(false)}
                  aria-current={isActive(l.href) ? "page" : undefined}
                  className={`flex min-h-10 items-center justify-between gap-3 rounded-[var(--r-control)] px-2.5 text-[14px] transition-colors ${
                    isActive(l.href)
                      ? "bg-bg-sunken text-fg"
                      : "text-fg-muted hover:bg-bg-sunken hover:text-fg"
                  }`}
                >
                  {l.label}
                  <span aria-hidden="true" className="text-fg-subtle">
                    {isActive(l.href) ? "•" : "→"}
                  </span>
                </Link>
              ))}
            </div>
          </>
        ) : null}
      </div>
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

  // Lock the page behind the panel and let Escape dismiss it.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
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
        className="press -mr-1 flex h-11 w-11 items-center justify-center rounded-[var(--r-control)] text-fg-muted hover:bg-bg-sunken hover:text-fg"
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
            onClick={() => setOpen(false)}
            className="fixed inset-0 top-[calc(4rem+env(safe-area-inset-top))] z-30 cursor-default bg-bg/40"
          />
          <nav
            id="mobile-nav"
            aria-label="Sections"
            className="pop-in absolute inset-x-0 top-full z-40 max-h-[calc(100dvh-4rem-env(safe-area-inset-top))] overflow-y-auto overscroll-contain border-b border-border bg-bg pb-[env(safe-area-inset-bottom)] shadow-float"
          >
            <ul className="page-shell py-3">
              <li className="pb-1.5">
                <p className="t-label px-1 pb-2 pt-2">Browse</p>
              </li>
              {primary.map((l, i) => (
                <li
                  key={l.href}
                  className="drop-in"
                  style={{ "--i": i } as React.CSSProperties}
                >
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive(l.href) ? "page" : undefined}
                    className={`group flex min-h-13 items-center gap-4 border-b border-border py-3.5 text-[17px] transition-colors active:bg-bg-sunken ${
                      isActive(l.href) ? "text-fg" : "text-fg-muted"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`w-5 font-mono text-[13px] tabular-nums ${
                        isActive(l.href) ? "text-fg" : "text-fg-subtle"
                      }`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1">{l.label}</span>
                    {isActive(l.href) ? (
                      <span aria-hidden="true" className="h-[2px] w-6 rounded-full bg-accent" />
                    ) : (
                      <span aria-hidden="true" className="nudge text-fg-subtle">
                        →
                      </span>
                    )}
                  </Link>
                </li>
              ))}

              <li className="pt-5">
                <p className="t-label px-1 pb-2">Browse another way</p>
              </li>
              <li className="grid grid-cols-2 gap-2">
                {secondary.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive(l.href) ? "page" : undefined}
                    className={`chip min-h-11 justify-between px-3.5 text-[15px] ${
                      isActive(l.href) ? "is-active" : ""
                    }`}
                  >
                    {l.label}
                    <span aria-hidden="true">→</span>
                  </Link>
                ))}
              </li>
            </ul>
          </nav>
        </>
      ) : null}
    </div>
  );
}
