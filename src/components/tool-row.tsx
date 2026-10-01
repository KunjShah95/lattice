import Link from "next/link";
import type { Tool } from "@/lib/types";
import { layerStyle } from "@/lib/layer";

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
      <div className="group -mx-2 flex items-start gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-bg-sunken">
        <span
          aria-hidden="true"
          className="mt-1 h-8 w-[3px] shrink-0 rounded-full"
          style={layerStyle(layer)}
        />

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <a
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-[14px] font-medium underline decoration-transparent underline-offset-2 transition-colors hover:decoration-border-strong"
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
        <span className="mt-0.5 hidden shrink-0 font-mono text-[11px] text-fg-subtle sm:block">
          {tool.domain.replace(/^www\./, "")}
        </span>

        {detailsHref ? (
          <Link
            href={detailsHref}
            title={`More about ${tool.name} in this index`}
            className="mt-0.5 shrink-0 rounded p-0.5 text-fg-subtle opacity-0 transition-opacity hover:text-fg focus-visible:opacity-100 group-hover:opacity-100"
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
          className="mt-1 shrink-0 text-fg-subtle transition-transform"
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
            className="-translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
          >
            <path d="M7 17 17 7M9 7h8v8" />
          </svg>
        </a>
      </div>
    </li>
  );
}
