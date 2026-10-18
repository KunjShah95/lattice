import Link from "next/link";
import { DecisionValve } from "@/components/ui/decision-valve";
import { layerColor } from "@/lib/layer";

/**
 * The tile that stands in for a favicon: the tool's initial on a wash of its
 * layer's colour. Shared by the home directory and the /all explorer, so the
 * two grids read as one object.
 */
export function ToolMonogram({ name, layer }: { name: string; layer: number | null }) {
  return (
    <span
      aria-hidden="true"
      className="grid h-10 w-10 shrink-0 place-items-center rounded-lg font-mono text-[15px] font-medium text-fg"
      style={{ backgroundColor: `color-mix(in oklch, ${layerColor(layer)} 18%, var(--bg-elevated))` }}
    >
      {name.replace(/[^A-Za-z0-9]/g, "").slice(0, 1).toUpperCase()}
    </span>
  );
}

/**
 * One directory card. The whole card is the link; nothing inside it is
 * interactive, so it can be (anchors cannot nest).
 *
 *   - `compact` (home directory): name, blurb, kind. Three to a row.
 *   - `full` (/all, section pages): adds licence and section, and both halves
 *     of the verdict — use when and skip when — because a listing that
 *     printed only the flattering half would be a directory like any other.
 *
 * No hooks and no server-only imports, so the client-side /all explorer can
 * render it too.
 */
export function ToolCard({
  href,
  name,
  layer,
  blurb,
  kind,
  variant = "compact",
  license,
  section,
  useWhen,
  skipWhen,
  alsoIn,
}: {
  href: string;
  name: string;
  layer: number | null;
  blurb: string;
  kind: string;
  variant?: "compact" | "full";
  license?: string | null;
  /** Section name, shown in `full` when the grid mixes sections. */
  section?: string;
  useWhen?: string;
  skipWhen?: string;
  /** Other sections this tool also belongs to. */
  alsoIn?: string[];
}) {
  const full = variant === "full";
  return (
    <Link
      href={href}
      data-spot=""
      style={{ "--spot": layerColor(layer) } as React.CSSProperties}
      className="group relative flex h-full items-start gap-3.5 rounded-xl bg-bg-elevated/80 p-4 shadow-ink transition-[box-shadow,transform] duration-300 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:shadow-lift"
    >
      <ToolMonogram name={name} layer={layer} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-[15px] font-semibold tracking-[-0.01em] transition-colors group-hover:text-accent">
            {name}
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="nudge nudge-up-right shrink-0 text-fg-subtle transition-colors group-hover:text-accent"
          >
            <path d="M7 17 17 7M9 7h8v8" />
          </svg>
        </span>

        {full ? (
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-fg-subtle">
            <span>{kind}</span>
            {license ? <span className="normal-case">{license}</span> : null}
            {section ? (
              <span className="inline-flex items-center gap-1.5 normal-case">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: layerColor(layer) }} />
                {section}
              </span>
            ) : null}
          </span>
        ) : null}

        <span
          className={`block text-pretty text-[13px] leading-relaxed text-fg-muted ${
            full ? "mt-2" : "mt-1 line-clamp-2"
          }`}
        >
          {blurb}
        </span>

        {full && useWhen && skipWhen ? (
          <DecisionValve variant="inline" className="mt-2.5" toolName={name} useWhen={useWhen} skipWhen={skipWhen} />
        ) : null}

        {full && alsoIn?.length ? (
          <span className="mt-2 block font-mono text-[10.5px] text-fg-subtle">also in {alsoIn.join(", ")}</span>
        ) : null}

        {full ? null : (
          <span className="mt-2 block font-mono text-[10.5px] uppercase tracking-[0.1em] text-fg-subtle">{kind}</span>
        )}
      </span>
    </Link>
  );
}
