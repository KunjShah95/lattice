import Link from "next/link";
import type { Tool } from "@/lib/types";
import { layerColor, layerStyle } from "@/lib/layer";

/**
 * One tool in a list. Hairline-separated rather than boxed — the reference
 * pattern that keeps a long index scannable instead of card-heavy.
 *
 * No favicon: a third-party icon service on every row is both a privacy
 * leak and a visual lie (nine of these projects have no site of their own).
 * The layer swatch carries the identity instead.
 *
 * Two distinct links, deliberately not nested (anchors cannot nest):
 *   - the name goes to the tool's own site, which is what a reader came for
 *   - the trailing "details" link goes to this index's page for the tool,
 *     which carries the comparisons and reading that justify listing it
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
    <li>
      <div
        data-spot=""
        style={{ "--spot": layerColor(layer) } as React.CSSProperties}
        className="group relative -mx-2 flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors duration-200 hover:bg-bg-sunken"
      >
        {/* The swatch thickens on hover — the row "takes" its layer colour
            rather than the whole row lighting up. */}
        <span
          aria-hidden="true"
          className="mt-1 h-8 w-[3px] shrink-0 rounded-full transition-[width] duration-300 ease-[var(--ease-spring)] group-hover:w-[5px]"
          style={layerStyle(layer)}
        />

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <a
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              className="link-draw truncate text-[14px] font-medium"
            >
              {tool.name}
            </a>
            {tool.kind ? (
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                {tool.kind}
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block text-pretty text-[13px] leading-relaxed text-fg-muted">
            {tool.blurb}
          </span>
        </span>

        {/* Host is de-emphasised: it tells you what kind of thing this is
            (own site vs. a repo) without competing with the name. */}
        <span className="mt-0.5 hidden shrink-0 font-mono text-[11px] text-fg-subtle transition-colors group-hover:text-fg-muted sm:block">
          {tool.domain.replace(/^www\./, "")}
        </span>

        {detailsHref ? (
          <Link
            href={detailsHref}
            title={`More about ${tool.name} in this index`}
            // `opacity-0 group-hover:opacity-100` alone is a desktop-only
            // affordance: on touch there is no hover, so this rendered as an
            // invisible link that still swallowed taps aimed past it. Always
            // visible below `sm`, revealed on hover above it. `p-1.5` rather
            // than `p-0.5` because a 13px glyph with 2px of padding is a ~18px
            // target, well under the 44px minimum.
            className="press mt-0.5 shrink-0 rounded p-1.5 text-fg-subtle hover:bg-bg hover:text-fg focus-visible:opacity-100 sm:p-0.5 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <span className="sr-only">More about {tool.name} in this index</span>
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
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 16v-4.5M12 8h.01" />
            </svg>
          </Link>
        ) : null}

        <a
          href={tool.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${tool.name} (opens in a new tab)`}
          className="mt-0.5 shrink-0 rounded p-1.5 text-fg-subtle transition-transform sm:mt-1 sm:p-0.5"
        >
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
            className="transition-all duration-300 ease-[var(--ease-out)] sm:-translate-x-1 sm:translate-y-1 sm:opacity-0 sm:group-hover:translate-x-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100"
          >
            <path d="M7 17 17 7M9 7h8v8" />
          </svg>
        </a>
      </div>
    </li>
  );
}
