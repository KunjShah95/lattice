"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { askLinks, askPrompt } from "@/lib/ask-ai";

/**
 * The header's "Copy / Ask AI" menu: copy this page, or open it in an
 * assistant with a question already filled in.
 *
 * In the sticky header so it is on every page without scrolling; the same
 * links are also rendered, server-side, at the foot of each page for crawlers
 * and for readers who reach the end. The canonical origin comes in as a prop
 * from the server header rather than from `lib/site`, so this island does not
 * pull the site config into the client bundle.
 */
export function PageActions({ origin }: { origin: string }) {
  const pathname = usePathname() || "/";
  const url = origin + (pathname === "/" ? "" : pathname);
  // The path the menu was opened on: navigating elsewhere closes it without
  // an effect, because `open` stops matching the new path.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (next: boolean) => setOpenOn(next ? pathname : null);
  const [copied, setCopied] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);

  // Close on a click outside and on Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function copy(kind: "page" | "link") {
    const main = document.getElementById("main");
    const value =
      kind === "link"
        ? url
        : `# ${document.title}\n\nSource: ${url}\n\n${main?.innerText.trim() ?? ""}\n\n${askPrompt(url)}`;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // No Clipboard API on insecure origins and in some embeds.
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 2000);
  }

  const item =
    "flex w-full items-center justify-between gap-3 rounded-[var(--r-control)] px-3 py-2 text-left text-[14px] text-fg-muted hover:bg-bg-sunken hover:text-fg";

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Copy page or ask an AI"
        title="Copy page or ask an AI"
        onClick={() => setOpen(!open)}
        className="press inline-flex h-11 items-center gap-1.5 rounded-[var(--r-control)] border border-border bg-bg-elevated px-3 text-[14px] text-fg-muted shadow-ink hover:border-border-strong hover:text-fg"
      >
        <span aria-hidden="true">✦</span>
        <span className="hidden 2xl:inline">Copy · Ask AI</span>
        <span className="2xl:hidden">AI</span>
        <span aria-hidden="true" className="text-[11px] text-fg-subtle">▾</span>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Copy this page or ask an AI about it"
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-[var(--r-card)] border border-border bg-bg-elevated p-1.5 shadow-lift"
        >
          {/* Live regions only while the menu is open: the confirmation is
              announced where it happens, and the header carries no
              permanent live region on every page. */}
          <button type="button" role="menuitem" className={item} onClick={() => void copy("page")}>
            <span aria-live="polite">{copied === "page" ? "✓ Page copied" : "Copy page"}</span>
            <span className="text-[12px] text-fg-subtle">for any AI</span>
          </button>
          <button type="button" role="menuitem" className={item} onClick={() => void copy("link")}>
            <span aria-live="polite">{copied === "link" ? "✓ Link copied" : "Copy link"}</span>
          </button>
          <div role="separator" className="my-1 h-px bg-border" />
          {askLinks(url).map((a) => (
            <a
              key={a.name}
              role="menuitem"
              href={a.href}
              target="_blank"
              rel="noopener"
              className={`${item} no-underline hover:no-underline`}
              onClick={() => setOpen(false)}
            >
              <span>Open in {a.name}</span>
              <span aria-hidden="true" className="text-fg-subtle">↗</span>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
