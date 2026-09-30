import type { Tool } from "@/lib/types";
import { layerStyle } from "@/lib/layer";

/**
 * One tool in a list. Hairline-separated rather than boxed — the reference
 * pattern that keeps a long index scannable instead of card-heavy.
 *
 * No favicon: a third-party icon service on every row is both a privacy
 * leak and a visual lie (nine of these projects have no site of their own).
 * The layer swatch carries the identity instead.
 */
export function ToolRow({
  tool,
  layer = null,
}: {
  tool: Tool;
  layer?: number | null;
}) {
  return (
    <li>
      <a
        href={tool.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group -mx-2 flex items-start gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-bg-sunken"
      >
        <span
          aria-hidden="true"
          className="mt-1 h-8 w-[3px] shrink-0 rounded-full"
          style={layerStyle(layer)}
        />

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="truncate text-[14px] font-medium">{tool.name}</span>
            {tool.tag ? (
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                {tool.tag}
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
          className="mt-1.5 shrink-0 -translate-x-1 text-fg-subtle opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
        >
          <path d="M7 17 17 7M9 7h8v8" />
        </svg>
      </a>
    </li>
  );
}
