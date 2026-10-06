"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { layerStyle } from "@/lib/layer";
import { buildIndex, searchTools, type SearchEntry } from "@/lib/search";

type SearchContextValue = {
  open: boolean;
  openPalette: () => void;
  closePalette: () => void;
  /** Start loading the corpus without opening the palette. Idempotent. */
  prefetch: () => void;
};

const SearchContext = createContext<SearchContextValue | null>(null);

/**
 * DOM id for the results list, shared by the input's `aria-controls` and the
 * `<ul>`, and prefixed onto each row's id for `aria-activedescendant`.
 *
 * A constant rather than `useId()` because the value has to be a valid CSS-safe
 * token in an `id`, and React's generated ids contain colons — which are legal
 * in HTML5 but need escaping in any `querySelector`. There is one palette in the
 * document, so a fixed id cannot collide.
 */
const LISTBOX_ID = "lattice-search-results";

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used inside <SearchProvider>");
  return ctx;
}

/** Where the palette fetches its corpus. Served prerendered and edge-cached. */
const INDEX_URL = "/search-index.json";

export function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  /**
   * The corpus is fetched on first open, not passed in as a prop.
   *
   * Serialising 129 entries into the RSC payload cost ~42 KB on every route,
   * including pages whose entire HTML is smaller than that. The palette is
   * opened by a fraction of readers, so almost all of that was weight shipped
   * to people who never searched.
   *
   * `null` is the "not loaded yet" state and is distinct from `[]`; a fetch
   * that fails leaves it `null` and reports the failure rather than looking
   * like a search that found nothing.
   */
  const [entries, setEntries] = useState<SearchEntry[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const loading = entries === null && !loadFailed;

  // Lowercasing and pre-splitting happen once per dataset, not per keystroke.
  const index = useMemo(() => buildIndex(entries ?? []), [entries]);

  /**
   * The result list is derived from a deferred copy of the query.
   *
   * Every keystroke is a discrete interaction, and INP is measured per
   * interaction — so the render that a keystroke triggers is counted against it.
   * Scoring the corpus is sub-millisecond, but reconciling the resulting rows
   * is not, and the browse case renders the entire index. Deferring lets the
   * input's own state land and paint at normal priority while the list catches
   * up in a background pass, which is what keeps a burst of typing responsive.
   *
   * Enter-navigate is guarded on the chosen row existing, so hitting it during
   * the brief window where `results` still reflects the previous query is a
   * no-op rather than a navigation to the wrong page.
   */
  const deferredQuery = useDeferredValue(query);

  const results = useMemo(
    () => searchTools(index, deferredQuery, 40),
    [index, deferredQuery],
  );

  /**
   * Guards against two concurrent fetches, which guarding on `entries` alone
   * does not do.
   *
   * `entries` stays null until the response arrives, so a reader who hovers the
   * trigger and then clicks before the request resolves passes the `entries`
   * check twice and starts a second download of the same 55 KB file. Hovering
   * the button is the fastest way to open the palette, which makes that a
   * likely path rather than a theoretical one. A ref is the right shape here
   * because it does not trigger a render.
   */
  const inFlight = useRef(false);

  // Kick the fetch off as a side effect of the first open, or of the first
  // intent to open it. Guarded so repeat calls reuse the loaded corpus.
  const load = useCallback(() => {
    if (entries !== null || loadFailed || inFlight.current) return;
    inFlight.current = true;
    fetch(INDEX_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<SearchEntry[]>;
      })
      .then(setEntries)
      .catch(() => setLoadFailed(true));
  }, [entries, loadFailed]);

  // Reset the query as part of opening, not in an effect — this keeps the
  // palette's transient state owned by the event that causes it.
  const openPalette = useCallback(() => {
    setQuery("");
    setActive(0);
    setOpen(true);
    load();
  }, [load]);

  const closePalette = useCallback(() => setOpen(false), []);

  // Move focus in once the dialog is mounted.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Lock background scroll while the dialog is up.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Global shortcut.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        // Toggle through the same two entry points the buttons use, rather
        // than setOpen directly. The shortcut has to trigger the corpus fetch
        // too — going straight to setOpen opened an empty palette.
        if (open) closePalette();
        else openPalette();
        return;
      }
      if (event.key === "Escape") closePalette();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closePalette, open, openPalette]);

  // Keep the active row scrolled into view during keyboard navigation.
  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.children[active] as HTMLElement | undefined;
    node?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const router = useRouter();

  const go = useCallback(
    (entry: SearchEntry) => {
      closePalette();
      // Every hit has an internal route — tools, essays and comparisons are
      // all on this site. The external site stays a secondary action on the
      // row, so the palette never dumps the reader out to a third party.
      router.push(entry.href);
    },
    [closePalette, router],
  );

  function onListKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) =>
        results.length ? (i - 1 + results.length) % results.length : 0,
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      const chosen = results[active];
      if (chosen) go(chosen);
    }
  }

  return (
    <SearchContext.Provider value={{ open, openPalette, closePalette, prefetch: load }}>
      {children}

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
          role="dialog"
          aria-modal="true"
          aria-label="Search the directory"
        >
          <button
            type="button"
            aria-label="Close search"
            onClick={closePalette}
            className="absolute inset-0 cursor-default bg-black/45 backdrop-blur-[2px] [animation:fade_160ms_var(--ease-out)_both]"
          />

          <div className="pop-in relative w-full max-w-xl overflow-hidden rounded-2xl bg-bg-elevated shadow-float">
            <div className="flex items-center gap-3 border-b border-border px-4">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-fg-subtle" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onListKeyDown}
                placeholder="Search tools, guides, comparisons…"
                aria-label="Search tools, guides and comparisons"
                // The combobox half of the pattern. Focus never leaves this
                // input — the arrow keys move a highlight rather than focus —
                // so `aria-activedescendant` is the only thing that tells a
                // screen reader which row is current. Without it the keyboard
                // navigation this palette has always had was purely visual.
                role="combobox"
                aria-expanded={!loading && !loadFailed && results.length > 0}
                aria-controls={LISTBOX_ID}
                aria-activedescendant={
                  loading || loadFailed || results.length === 0
                    ? undefined
                    : `${LISTBOX_ID}-${active}`
                }
                autoComplete="off"
                className="h-12 w-full bg-transparent text-[15px] outline-none placeholder:text-fg-subtle"
              />
              <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-fg-subtle sm:block">
                esc
              </kbd>
            </div>

            {/*
              A real listbox, not a `<ul>` of buttons.

              Keyboard navigation here moves `active` and styles the row — a
              visual highlight and nothing more. A screen-reader user arrowing
              through the list is told nothing about which row moved, because
              there is no selected state to announce and the input keeps focus
              throughout. `role="listbox"` + `role="option"` + `aria-selected` on
              the rows, and `aria-activedescendant` on the input, are what make
              the arrow keys mean anything.

              The three non-result states moved out of the list on purpose: a
              listbox may only contain options, and "Loading index…" is a status,
              not one. Rendering it as a `<li>` is also what made it match
              `getByRole("listitem")` in the browser tests — the placeholder row
              read as a result.
            */}
            {loading ? (
              // Skeleton rows in the shape of the results they stand in for —
              // swatch, name, kind pill, section — so nothing jumps when the
              // corpus lands. The status text stays for screen readers.
              <div role="status" className="p-1.5">
                <span className="sr-only">Loading index…</span>
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} aria-hidden="true" className="flex items-center gap-3 px-3 py-2.5">
                    <span className="skeleton h-6 w-[3px] rounded-full" style={{ "--i": i } as React.CSSProperties} />
                    <span className="flex flex-1 flex-col gap-1.5">
                      <span className="flex items-center gap-2">
                        <span className="skeleton h-3 rounded" style={{ width: `${[38, 52, 30, 46, 34][i]}%`, "--i": i } as React.CSSProperties} />
                        <span className="skeleton h-3 w-9 rounded-full" style={{ "--i": i } as React.CSSProperties} />
                      </span>
                      <span className="skeleton h-2.5 w-1/4 rounded" style={{ "--i": i } as React.CSSProperties} />
                    </span>
                  </div>
                ))}
              </div>
            ) : loadFailed || results.length === 0 ? (
              <div role="status" className="px-6 py-10 text-center">
                <svg width="56" height="44" viewBox="0 0 56 44" fill="none" aria-hidden="true" className="mx-auto text-fg-subtle">
                  {loadFailed ? (
                    <path d="M28 6v14M28 28h.01M24.2 4.2 8.4 32.4A3.2 3.2 0 0 0 11.2 37h33.6a3.2 3.2 0 0 0 2.8-4.6L31.8 4.2a3.2 3.2 0 0 0-5.6 0Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  ) : (
                    <>
                      <rect x="4" y="2" width="48" height="10" rx="2" fill="currentColor" opacity="0.18" />
                      <rect x="4.5" y="17.5" width="47" height="9" rx="2" stroke="currentColor" strokeDasharray="3 3" />
                      <rect x="4" y="32" width="48" height="10" rx="2" fill="currentColor" opacity="0.18" />
                    </>
                  )}
                </svg>
                <p className="mt-3 text-[14px] font-medium text-fg">
                  {loadFailed ? "Search is unavailable right now." : `Nothing matches “${query}”.`}
                </p>
                <p className="mx-auto mt-1.5 max-w-[34ch] text-pretty text-[12.5px] leading-relaxed text-fg-muted">
                  {loadFailed
                    ? "The index could not be fetched. Every tool is still one click away:"
                    : "Try the problem instead of the product — “slow”, “cost”, “hallucination” — or browse:"}
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <Link href="/all" onClick={closePalette} className="btn-paper inline-flex h-8 items-center rounded-lg px-3 text-[12.5px] font-medium">
                    All tools
                  </Link>
                  <Link href="/fix" onClick={closePalette} className="btn-paper inline-flex h-8 items-center rounded-lg px-3 text-[12.5px] font-medium">
                    Fix a symptom
                  </Link>
                </div>
              </div>
            ) : (
              <ul
                ref={listRef}
                id={LISTBOX_ID}
                role="listbox"
                aria-label="Search results"
                className="max-h-[52vh] overflow-y-auto p-1.5"
              >
                {results.map((entry, i) => (
                  <li
                    key={`${entry.kind}-${entry.href}`}
                    id={`${LISTBOX_ID}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    onClick={() => go(entry)}
                      // `onMouseEnter`, not `onMouseMove`. `mousemove` fires on
                      // every pixel of travel within the row, not once on entry,
                      // so sweeping the cursor down the list scheduled a
                      // `setActive` — and therefore a full re-render of the
                      // results, plus the `scrollIntoView` effect below it —
                      // dozens of times per second. The intent is "highlight the
                      // row under the cursor", which is exactly what `mouseenter`
                      // means; the extra events were pure main-thread cost on the
                      // one interaction this palette exists to serve.
                      onMouseEnter={() => setActive(i)}
                      className={`relative flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-100 ${
                        i === active ? "bg-bg-sunken" : ""
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 h-5 shrink-0 rounded-full transition-[width] duration-200 ease-[var(--ease-spring)] ${
                          i === active ? "w-[5px]" : "w-[3px]"
                        }`}
                        style={layerStyle(entry.categoryLayer)}
                      />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="flex min-w-0 items-baseline gap-2">
                          <span className="truncate text-sm font-medium">
                            {entry.name}
                          </span>
                          {/*
                            The corpus mixes five flavours (tools, essays, fix
                            guides, comparisons, alternatives) and the category
                            line alone does not always say which is which — a
                            fix guide reads like an essay. The pill names the
                            kind so a reader can tell before navigating.
                          */}
                          <span className="shrink-0 rounded-full border border-border px-1.5 py-px font-mono text-[9.5px] uppercase tracking-[0.08em] text-fg-subtle">
                            {entry.kind === "tool"
                              ? "Tool"
                              : entry.href.startsWith("/fix/")
                                ? "Guide"
                                : entry.kind === "glossary"
                                  ? "Term"
                                  : entry.kind === "comparison"
                                    ? entry.href.endsWith("/alternatives")
                                      ? "Alternatives"
                                      : "Compare"
                                    : "Essay"}
                          </span>
                        </span>
                        <span className="truncate text-xs text-fg-subtle">
                          {entry.categoryTitle}
                        </span>
                      </span>

                      {/* Secondary action: the tool's own site. Rendered
                          inside the row rather than as the primary target so
                          keyboard users stay on-site. */}
                      {entry.external ? (
                        <a
                          href={entry.external}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`${entry.name} on the web (opens in a new tab)`}
                          className="shrink-0 rounded p-0.5 text-fg-subtle hover:text-fg"
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M7 17 17 7M9 7h8v8" />
                          </svg>
                        </a>
                      ) : null}

                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className={`shrink-0 text-fg-subtle transition-[opacity,translate] duration-200 ${
                          i === active ? "translate-x-0 opacity-100" : "-translate-x-1 opacity-0"
                        }`}
                      >
                        <path d="M7 17 17 7M9 7h8v8" />
                        </svg>
                  </li>
                ))}
              </ul>
            )}

            {/* Keyboard legend. Hidden on touch, where there are no keys to
                teach. */}
            <div aria-hidden="true" className="hidden items-center gap-4 border-t border-border bg-bg-sunken/60 px-4 py-2 font-mono text-[10px] text-fg-subtle sm:flex">
              <span className="flex items-center gap-1.5">
                <kbd className="rounded border border-border bg-bg-elevated px-1 py-px shadow-ink">↑</kbd>
                <kbd className="rounded border border-border bg-bg-elevated px-1 py-px shadow-ink">↓</kbd>
                move
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded border border-border bg-bg-elevated px-1 py-px shadow-ink">↵</kbd>
                open
              </span>
              <span className="ml-auto flex items-center gap-1.5">
                <kbd className="rounded border border-border bg-bg-elevated px-1 py-px shadow-ink">esc</kbd>
                close
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </SearchContext.Provider>
  );
}

/**
 * Button that opens the palette. Used in the header and the hero.
 *
 * The `⌘K` hint is `hidden sm:inline` because it is a lie on a phone: there
 * is no keyboard shortcut to advertise, and the width it costs is the width
 * that makes the control too small to tap. The label collapses for the same
 * reason — at 375px the header already holds the wordmark, a theme toggle and
 * a menu button, and a text button between them does not fit.
 */
export function SearchTrigger({
  className = "",
  compact = false,
}: {
  className?: string;
  /** Icon-only below `sm`. Used in the header, where width is scarce. */
  compact?: boolean;
}) {
  const { openPalette, prefetch } = useSearch();
  return (
    <button
      type="button"
      onClick={openPalette}
      /*
        Intent-based prefetch, on hover and on focus.

        The corpus is 176 entries and about 55 KB raw, which the layout comment
        is explicit about not shipping to readers who never search. So it cannot
        be fetched eagerly on load. But measured on this machine, the first open
        cost ~109ms against ~40ms once the corpus was resident — the fetch, not
        the render, is the cold path, and it sits directly on the one click the
        palette exists to serve.

        Hover and focus are the signals that cost nothing and mean something.
        Reaching a button takes a few hundred milliseconds, which is enough for
        the request to land before the click lands, and a reader who never
        approaches the control never pays for it. This is the one moment on the
        site where paying for bandwidth up front is the cheaper trade.

        `focus` is not redundant to `hover`: it covers keyboard and switch users,
        who never generate a mouse event at all.
      */
      onMouseEnter={prefetch}
      onFocus={prefetch}
      aria-label="Search"
      className={`press group inline-flex h-9 items-center gap-2 rounded-lg bg-bg-elevated px-2.5 text-sm text-fg-subtle shadow-ink hover:text-fg-muted hover:shadow-lift ${
        compact ? "sm:h-auto sm:px-3 sm:py-1.5" : ""
      } ${className}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      {compact ? (
        <span className="hidden sm:inline">Search</span>
      ) : (
        <>
          <span>Search</span>
          <kbd className="ml-1 hidden rounded border border-border bg-bg px-1.5 py-0.5 font-mono text-[10px] transition-colors group-hover:border-border-strong sm:inline">
            ⌘K
          </kbd>
        </>
      )}
    </button>
  );
}
