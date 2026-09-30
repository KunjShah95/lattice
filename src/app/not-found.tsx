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
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
        404
      </p>

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
          className="inline-flex items-center gap-2 rounded-lg border border-border-strong bg-bg-elevated px-4 py-2 text-[14px] font-medium transition-colors hover:border-accent hover:text-accent"
        >
          Back to the index
        </Link>
        <Link
          href="/all"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-[14px] text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
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
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[13px] text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
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
