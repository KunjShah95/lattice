"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { askLinks, askPrompt } from "@/lib/ask-ai";
import { announcePopup, onOtherPopup } from "@/lib/popups";

type CopyKind = "page" | "link";
type CopyState = { kind: CopyKind; ok: boolean } | null;

/**
 * The header's "Copy / Ask AI" menu: copy this page, or open it in an
 * assistant with a question already filled in.
 *
 * In the sticky header so it is on every page without scrolling; the same
 * links are also rendered, server-side, at the foot of each page for crawlers
 * and for readers who reach the end. The canonical origin comes in as a prop
 * from the server header rather than from `lib/site`, so this island does not
 * pull the site config into the client bundle.
 *
 * Keyboard behaviour follows the WAI-ARIA menu button pattern: opening moves
 * focus to the first item (ArrowUp on the trigger, to the last), arrows,
 * Home and End move between items, Escape closes and returns focus to the
 * trigger, and Tab closes and lets focus move on.
 */
export function PageActions({ origin }: { origin: string }) {
  const pathname = usePathname() || "/";
  // Canonical: what the AI prompts cite. Copy link adds the live query string
  // at click time, so a built comparison or a filtered list survives the copy.
  const url = origin + (pathname === "/" ? "" : pathname);

  const [open, setOpen] = useState(false);
  // Close on navigation by adjusting state during render, React's pattern for
  // state derived from a changing value. Clearing it (rather than only hiding
  // the menu while the path differs) is what stops Back/Forward to the same
  // path from reopening it.
  const [path, setPath] = useState(pathname);
  if (path !== pathname) {
    setPath(pathname);
    setOpen(false);
  }

  const [copied, setCopied] = useState<CopyState>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  // Which item to focus once the menu has rendered: first or last.
  const focusOnOpen = useRef<"first" | "last">("first");

  const items = () =>
    Array.from(menu.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? []);

  function openMenu(at: "first" | "last") {
    focusOnOpen.current = at;
    setOpen(true);
    // One popup at a time: the mobile drawer closes when this opens.
    announcePopup("ask-ai");
  }

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) trigger.current?.focus();
  }

  // Close when another header popup (the mobile drawer) opens.
  useEffect(() => onOtherPopup("ask-ai", () => setOpen(false)), []);

  useEffect(() => {
    if (!open) return;
    const list = items();
    (focusOnOpen.current === "last" ? list[list.length - 1] : list[0])?.focus();

    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Focus returns to the trigger only if it was inside the menu; an Escape
      // pressed elsewhere on the page should not pull focus into the header.
      const inside = root.current?.contains(document.activeElement);
      setOpen(false);
      if (inside) trigger.current?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function onTriggerKey(e: ReactKeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      openMenu(e.key === "ArrowUp" ? "last" : "first");
    }
  }

  function onMenuKey(e: ReactKeyboardEvent) {
    const list = items();
    const at = list.indexOf(document.activeElement as HTMLElement);
    const go = (i: number) => {
      e.preventDefault();
      list[(i + list.length) % list.length]?.focus();
    };
    if (e.key === "ArrowDown") go(at + 1);
    else if (e.key === "ArrowUp") go(at - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(list.length - 1);
    else if (e.key === "Tab") setOpen(false);
  }

  async function copy(kind: CopyKind) {
    const main = document.getElementById("main");
    const value =
      kind === "link"
        ? url + window.location.search
        : `# ${document.title}\n\nSource: ${url}\n\n${main?.innerText.trim() ?? ""}\n\n${askPrompt(url)}`;
    let ok = false;
    try {
      await navigator.clipboard.writeText(value);
      ok = true;
    } catch {
      // No Clipboard API on insecure origins and in some embeds. The legacy
      // command reports failure by returning false rather than throwing, so
      // its result decides what the menu says.
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      try {
        ta.select();
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      } finally {
        ta.remove();
      }
    }
    setCopied({ kind, ok });
    window.setTimeout(() => setCopied(null), 2500);
  }

  const label = (kind: CopyKind, idle: string, done: string) =>
    copied?.kind === kind ? (copied.ok ? `✓ ${done}` : "Copy failed: select and copy manually") : idle;

  const item =
    "flex w-full items-center justify-between gap-3 rounded-[var(--r-control)] px-3 py-2 text-left text-[14px] text-fg-muted outline-none hover:bg-bg-sunken hover:text-fg focus-visible:bg-bg-sunken focus-visible:text-fg";

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? "ask-ai-menu" : undefined}
        aria-label="Copy page or ask an AI"
        title="Copy page or ask an AI"
        onClick={() => (open ? close(false) : openMenu("first"))}
        onKeyDown={onTriggerKey}
        // Icon-only below 380px, where the header has no room for a label: on
        // a 320px phone the labelled button pushed the row 28px off-screen.
        className="press inline-flex h-11 w-11 items-center justify-center gap-1.5 rounded-[var(--r-control)] border border-border bg-bg-elevated text-[14px] text-fg-muted shadow-ink hover:border-border-strong hover:text-fg min-[380px]:w-auto min-[380px]:px-3"
      >
        <span aria-hidden="true">✦</span>
        <span className="hidden 2xl:inline">Copy · Ask AI</span>
        <span className="hidden min-[380px]:inline 2xl:hidden">AI</span>
        <span aria-hidden="true" className="hidden text-[11px] text-fg-subtle min-[380px]:inline">
          ▾
        </span>
      </button>

      {open ? (
        <div
          ref={menu}
          id="ask-ai-menu"
          role="menu"
          aria-label="Copy this page or ask an AI about it"
          onKeyDown={onMenuKey}
          // Below `sm` the panel spans the viewport with a 16px gutter, under
          // the bar: anchored to the trigger, which sits left of the theme
          // toggle and the drawer button, it started 48px off a 320px phone.
          className="fixed inset-x-4 top-[calc(4rem+env(safe-area-inset-top))] z-50 mt-2 rounded-[var(--r-card)] border border-border bg-bg-elevated p-1.5 shadow-lift sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:w-64"
        >
          {/* Live regions only while the menu is open: the confirmation is
              announced where it happens, and the header carries no
              permanent live region on every page. */}
          <button type="button" role="menuitem" tabIndex={-1} className={item} onClick={() => void copy("page")}>
            <span aria-live="polite">{label("page", "Copy page", "Page copied")}</span>
            <span className="shrink-0 text-[12px] text-fg-subtle">for any AI</span>
          </button>
          <button type="button" role="menuitem" tabIndex={-1} className={item} onClick={() => void copy("link")}>
            <span aria-live="polite">{label("link", "Copy link", "Link copied")}</span>
          </button>
          <div role="separator" className="my-1 h-px bg-border" />
          {askLinks(url).map((a) => (
            <a
              key={a.name}
              role="menuitem"
              tabIndex={-1}
              href={a.href}
              target="_blank"
              rel="noopener"
              className={`${item} no-underline hover:no-underline`}
              onClick={() => close(false)}
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
