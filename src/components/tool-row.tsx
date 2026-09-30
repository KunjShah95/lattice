import Image from "next/image";
import type { Tool } from "@/lib/types";

/**
 * One tool in a list. Hairline-separated rather than boxed — the reference
 * pattern that keeps a long index scannable instead of card-heavy.
 */
export function ToolRow({ tool }: { tool: Tool }) {
  return (
    <li>
      <a
        href={tool.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group -mx-2 flex items-start gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-bg-sunken"
      >
        <Image
          src={`https://www.google.com/s2/favicons?domain=${tool.domain}&sz=64`}
          alt=""
          width={20}
          height={20}
          unoptimized
          className="mt-0.5 h-5 w-5 shrink-0 rounded"
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
