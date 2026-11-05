import Link from "next/link";
import type { Tool } from "@/lib/types";
import { layerColor } from "@/lib/layer-color";
import { layerStyle } from "@/lib/layer";

/**
 * One tool in a list.
 *
 * Three pieces of information, in descending order of weight: the name, what
 * the thing is (a chip, because "runtime" and "framework" are a fixed set and
 * should scan as a set), and one sentence. Everything else — the hostname, the
 * licence, the second home — is either a detail for the tool's own page or a
 * filter in the explorer. Printing it here made every row a paragraph.
 *
 * The row is a list item with two distinct links, deliberately not nested
 * (anchors cannot nest):
 *   - the name opens this index's page for the tool, which carries the
 *     comparisons and reading that justify listing it
 *   - the trailing arrow opens the tool's own site
 *
 * The name used to go straight off-site. That is the wrong default on a page
 * whose job is to help someone decide: a reader who does not recognise a name
 * wants the two sentences this index has, not a marketing page. The outbound
 * link is still one tap away, labelled for what it does.
 */
export function ToolRow({
  tool,
  layer = null,
  categorySlug,
  showDetails = false,
}: {
  tool: Tool;
  layer?: number | null;
  /** Section slug, required when showDetails is on. */
  categorySlug?: string;
  showDetails?: boolean;
}) {
  const detailsHref =
    showDetails && categorySlug ? `/${categorySlug}/${tool.slug}` : null;

  return (
    <li className="border-b border-border/70 last:border-b-0">
      <div
        data-spot=""
        style={{ "--spot": layerColor(layer) } as React.CSSProperties}
        className="group relative -mx-2 flex items-start gap-3 rounded-[var(--r-control)] px-2 py-3.5 transition-colors duration-200 hover:bg-bg-sunken"
      >
        {/* The swatch thickens on hover — the row "takes" its layer colour
            rather than the whole row lighting up. */}
        <span
          aria-hidden="true"
          className="mt-1.5 h-10 w-[3px] shrink-0 rounded-full transition-[width] duration-300 ease-[var(--ease-spring)] group-hover:w-[5px]"
          style={layerStyle(layer)}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <Link
              href={detailsHref ?? tool.url}
              {...(detailsHref
                ? {}
                : { target: "_blank", rel: "noopener noreferrer" })}
              className="link-draw text-[16.5px] font-medium leading-snug tracking-[-0.01em]"
            >
              {tool.name}
            </Link>
            {tool.kind ? (
              <span className="inline-flex items-center rounded-[var(--r-pill)] border border-border px-2 py-0.5 font-mono text-[12px] uppercase tracking-[0.06em] text-fg-muted">
                {tool.kind}
              </span>
            ) : null}
          </div>

          <p className="mt-1 line-clamp-2 text-[14.5px] leading-relaxed text-fg-muted">
            {tool.blurb}
          </p>
        </div>

        <a
          href={tool.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${tool.name} — visit the project (opens in a new tab)`}
          title={`Visit ${tool.name} (opens in a new tab)`}
          className="press mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-[var(--r-control)] text-fg-subtle transition-colors hover:bg-bg hover:text-fg sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
        >
          <svg
            width="15"
            height="15"
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
      </div>
    </li>
  );
}
