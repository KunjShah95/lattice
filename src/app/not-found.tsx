import Link from "next/link";
import { categories, toolCount } from "@/lib/data";

/**
 * A 404 on a directory is usually a mistyped section or a stale link from a
 * search result, so this page tries to be useful rather than apologetic: it
 * offers the whole index rather than making the reader press back.
 */
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col justify-center px-5 py-20 sm:px-6">
      {/* A sheet reference that points nowhere — the drawing-set version
          of a 404. The empty frame is the missing sheet. */}
      <div className="flex items-center gap-4">
        <div
          aria-hidden="true"
          className="crop crop-static grid h-16 w-16 shrink-0 place-items-center rounded-md border border-dashed border-border-strong [--crop-inset:-5px]"
        >
          <span className="font-mono text-[11px] text-fg-subtle">?</span>
        </div>
        <p className="font-mono text-[11px] uppercase leading-relaxed tracking-[0.16em] text-fg-subtle">
          404
          <br />
          Sheet not in set
        </p>
      </div>

      <h1 className="mt-5 text-balance font-serif text-[34px] font-medium leading-[1.12] tracking-[-0.02em] sm:text-[44px]">
        Nothing at this address.
      </h1>

      <p className="mt-4 max-w-[48ch] text-pretty text-[15px] leading-relaxed text-fg-muted">
        The page may have moved, or the link that brought you here was out of
        date. Nothing is broken on your side — the {toolCount}-tool index is
        still where you left it.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        <Link
          href="/"
          className="btn-ink group inline-flex h-11 items-center gap-2 rounded-lg px-4 text-[14px] font-medium"
        >
          <span aria-hidden="true" className="inline-block transition-transform duration-200 ease-[var(--ease-spring)] group-hover:-translate-x-0.5">←</span>
          Back to the index
        </Link>
        <Link
          href="/all"
          className="btn-paper inline-flex h-11 items-center gap-2 rounded-lg px-4 text-[14px] text-fg-muted hover:text-fg"
        >
          Search all {toolCount} tools
        </Link>
      </div>

      <div className="mt-12 border-t border-border pt-6">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
          Sections
        </h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/${c.slug}`}
                className="press inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[13px] text-fg-muted hover:border-border-strong hover:bg-bg-elevated hover:text-fg"
              >
                <span className="font-mono text-[11px] text-fg-subtle">
                  {c.index}
                </span>
                {c.short}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
