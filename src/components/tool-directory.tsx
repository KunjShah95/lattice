import Link from "next/link";
import { ToolCard } from "./tool-card";
import { layerColor } from "@/lib/layer";
import type { Category } from "@/lib/types";

/**
 * The index as a directory: every section as a centred heading over a grid of
 * cards, one card per tool. The whole card is the link: one click anywhere on
 * it opens that tool's page, where the use/skip verdict, alternatives and the
 * outbound link live.
 *
 * Borrowed from the directory grids of design-resource sites (designeer.xyz),
 * minus their favicons: a third-party icon service on every card is a privacy
 * leak, and nine of these projects have no site of their own. Each card gets a
 * monogram tile in its layer's colour instead, so the grid still reads by
 * position in the stack.
 *
 * A server component: 112 links, no JavaScript.
 */
export function ToolDirectory({ categories }: { categories: Category[] }) {
  return (
    <div>
      {/* Jump row: every section, one click away. */}
      <nav aria-label="Jump to a section" className="flex flex-wrap justify-center gap-2">
        {categories.map((c) => (
          <a
            key={c.slug}
            href={`#${c.slug}`}
            className="press inline-flex min-h-9 items-center gap-2 rounded-full bg-bg-elevated px-3 py-1.5 text-[13px] text-fg-muted shadow-ink hover:text-fg hover:shadow-lift"
          >
            <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: layerColor(c.layer) }} />
            {c.short}
            <span className="font-mono text-[11px] text-fg-subtle">{c.tools.length}</span>
          </a>
        ))}
      </nav>

      {categories.map((c) => (
        <section key={c.slug} id={c.slug} aria-labelledby={`${c.slug}-h`} className="scroll-mt-24 pt-20">
          <div className="mx-auto max-w-2xl text-center">
            <h3
              id={`${c.slug}-h`}
              className="text-balance font-serif text-[28px] font-medium leading-[1.1] tracking-[-0.02em] sm:text-[36px]"
            >
              <Link href={`/${c.slug}`} className="transition-colors hover:text-accent">
                {c.title}
              </Link>
            </h3>
            <p className="mx-auto mt-3 max-w-[52ch] text-pretty text-[15px] leading-relaxed text-fg-muted">
              {c.responsibility}
            </p>
          </div>

          <ul className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {c.tools.map((t) => (
              <li key={t.slug}>
                <ToolCard
                  href={`/${c.slug}/${t.slug}`}
                  name={t.name}
                  layer={c.layer}
                  blurb={t.blurb}
                  kind={t.kind}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
