import Link from "next/link";
import { layerColor } from "@/lib/layer";
import type { Category } from "@/lib/types";

/**
 * The index, set like the index at the back of a reference manual: one
 * hairline row per tool, grouped under numbered section heads. Dense on
 * purpose: 112 entries should read as a surveyed list, not as 112 product
 * tiles competing for attention.
 *
 * The layer colour survives as a single rule beside each section head, so
 * the index still reads by position in the stack without painting every row.
 *
 * A server component: 112 links, no JavaScript.
 */
export function ToolDirectory({ categories }: { categories: Category[] }) {
  return (
    <div>
      {/* Jump row: every section, one click away, as a plain contents line. */}
      <nav
        aria-label="Jump to a section"
        className="flex flex-wrap gap-x-5 gap-y-2 border-y border-border py-3 font-mono text-[11.5px] text-fg-muted"
      >
        {categories.map((c) => (
          <a key={c.slug} href={`#${c.slug}`} className="inline-flex min-h-7 items-center gap-1.5 transition-colors hover:text-fg">
            <span className="text-fg-subtle">{c.index}</span>
            {c.short}
            <span className="text-fg-subtle">({c.tools.length})</span>
          </a>
        ))}
      </nav>

      {categories.map((c) => (
        <section key={c.slug} id={c.slug} aria-labelledby={`${c.slug}-h`} className="scroll-mt-24 pt-14">
          <div className="grid gap-x-8 gap-y-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:items-end">
            <div className="flex items-baseline gap-3">
              <span aria-hidden="true" className="h-4 w-[3px] shrink-0 self-center rounded-full" style={{ backgroundColor: layerColor(c.layer) }} />
              <span className="font-mono text-[12px] text-fg-subtle">{c.index}</span>
              <h3 id={`${c.slug}-h`} className="font-display text-[22px] font-medium leading-tight tracking-[-0.015em]">
                <Link href={`/${c.slug}`} className="transition-colors hover:text-accent">
                  {c.title}
                </Link>
              </h3>
            </div>
            <p className="text-pretty text-[13.5px] leading-relaxed text-fg-muted md:text-right">
              {c.responsibility}
            </p>
          </div>

          <ul className="mt-5 border-t border-border-strong">
            {c.tools.map((t) => (
              <li key={t.slug} className="border-b border-border">
                <Link
                  href={`/${c.slug}/${t.slug}`}
                  className="group -mx-2 flex min-h-11 flex-col gap-0.5 rounded px-2 py-2.5 sm:flex-row sm:items-baseline sm:gap-6 transition-colors hover:bg-bg-sunken"
                >
                  <span className="shrink-0 truncate text-[14px] font-medium transition-colors group-hover:text-accent sm:w-[12rem]">
                    {t.name}
                  </span>
                  <span className="min-w-0 flex-1 text-[13px] text-fg-muted sm:truncate">{t.blurb}</span>
                  <span className="hidden shrink-0 font-mono text-[10.5px] text-fg-subtle lg:inline">{t.kind}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
