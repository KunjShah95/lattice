import type { Heading } from "@/lib/headings";
import { Eyebrow } from "@/components/ui/eyebrow";

/**
 * An essay's contents as a disclosure, for screens too narrow for the side rail.
 *
 * Server-rendered, no JavaScript: a native `<details>` is the whole behaviour. A
 * long essay is where a reader most wants to know the shape of the argument before
 * committing to it, and on a phone there is no margin to put a rail in.
 *
 * Closed by default. Open, it would push the first paragraph below the fold on a
 * small screen, and the essay's opening is the thing the reader came for. The
 * summary names how many sections there are, so closed still says something.
 *
 * Hidden from `xl` up (`xl:hidden` is `display: none`, which also removes it from
 * the accessibility tree), where `ReadingRail` takes over. Two contents lists are
 * never both exposed to a screen reader.
 */
export function EssayContents({ headings }: { headings: Heading[] }) {
  if (headings.length < 3) return null;

  return (
    <details className="mb-10 border-l-2 border-border-strong pl-4 xl:hidden">
      <summary className="cursor-pointer list-none">
        <Eyebrow as="span" className="transition-colors hover:text-fg-muted">
          In this essay · {headings.length} sections
        </Eyebrow>
      </summary>
      <nav aria-label="In this essay">
        <ol className="mt-3 space-y-1.5">
          {headings.map((h, i) => (
            <li key={h.id} className="flex gap-3 text-[14px] leading-snug">
              <span aria-hidden="true" className="w-4 shrink-0 text-right font-mono text-[11px] tabular-nums text-fg-subtle">
                {String(i + 1).padStart(2, "0")}
              </span>
              <a
                href={`#${h.id}`}
                className="text-fg-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-accent"
              >
                {h.text}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </details>
  );
}
