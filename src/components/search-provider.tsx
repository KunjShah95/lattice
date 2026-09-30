"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
};

const SearchContext = createContext<SearchContextValue | null>(null);

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used inside <SearchProvider>");
  return ctx;
}

export function SearchProvider({
  entries,
  children,
}: {
  entries: SearchEntry[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Lowercasing and pre-splitting happen once per dataset, not per keystroke.
  const index = useMemo(() => buildIndex(entries), [entries]);

  const results = useMemo(
    () => searchTools(index, query, 40),
    [index, query],
  );

  // Reset the query as part of opening, not in an effect — this keeps the
  // palette's transient state owned by the event that causes it.
  const openPalette = useCallback(() => {
    setQuery("");
    setActive(0);
    setOpen(true);
  }, []);

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
        setOpen((v) => !v);
        return;
      }
      if (event.key === "Escape") closePalette();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closePalette]);

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
    <SearchContext.Provider value={{ open, openPalette, closePalette }}>
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
            className="absolute inset-0 cursor-default bg-black/45 backdrop-blur-[2px]"
          />

          <div className="relative w-full max-w-xl overflow-hidden rounded-xl border border-border-strong bg-bg-elevated shadow-2xl shadow-black/20">
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
                placeholder="Search tools…"
                aria-label="Search tools"
                className="h-12 w-full bg-transparent text-[15px] outline-none placeholder:text-fg-subtle"
              />
              <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-fg-subtle sm:block">
                esc
              </kbd>
            </div>

            <ul ref={listRef} className="max-h-[52vh] overflow-y-auto p-1.5">
              {results.length === 0 ? (
                <li className="px-3 py-8 text-center text-sm text-fg-subtle">
                  Nothing matches “{query}”.
                </li>
              ) : (
                results.map((entry, i) => (
                  <li key={`${entry.kind}-${entry.href}`}>
                    <button
                      type="button"
                      onClick={() => go(entry)}
                      onMouseMove={() => setActive(i)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                        i === active ? "bg-bg-sunken" : ""
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="mt-0.5 h-5 w-[3px] shrink-0 rounded-full"
                        style={layerStyle(entry.categoryLayer)}
                      />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium">
                          {entry.name}
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
                        className={`shrink-0 text-fg-subtle transition-opacity ${
                          i === active ? "opacity-100" : "opacity-0"
                        }`}
                      >
                        <path d="M7 17 17 7M9 7h8v8" />
                      </svg>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </SearchContext.Provider>
  );
}

/** Button that opens the palette. Used in the header and the hero. */
export function SearchTrigger({ className = "" }: { className?: string }) {
  const { openPalette } = useSearch();
  return (
    <button
      type="button"
      onClick={openPalette}
      className={`group inline-flex items-center gap-2 rounded-lg border border-border bg-bg-elevated px-3 py-1.5 text-sm text-fg-subtle transition-colors hover:border-border-strong hover:text-fg-muted ${className}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <span>Search</span>
      <kbd className="ml-1 rounded border border-border px-1.5 py-0.5 font-mono text-[10px]">
        ⌘K
      </kbd>
    </button>
  );
}
