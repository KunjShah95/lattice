import type { ElementType } from "react";
import { Eyebrow } from "./eyebrow";

/**
 * The use-when / skip-when pair: this index's whole thesis, per tool.
 *
 * It lived inline on the tool page as the only place the reader saw the second
 * half, while the explorer showed `useWhen` alone and the stack builder rendered
 * both as prose. `strategy/02` §2 is explicit that `skipWhen` is the claim no
 * competitor can make ("not one competitor has the second half"), and showing it
 * on one page in 112 is hiding it. One component, so every surface that names a
 * tool can state the condition under which not to pick it.
 *
 * Two shapes, one pair of marks:
 *
 * - `panel` is the original: one object with two states, a *valve*, not two
 *   equal cards. Use is the active half and sits in full ink; skip is the
 *   constraint and recedes. Equal weight would imply the two are equally worth
 *   knowing, which is false, and the second sentence is the reason to trust the
 *   first.
 * - `inline` is for dense lists. Same marks, same order, same weights, in two
 *   lines instead of a box, so a row in `/all` reads as a small version of the
 *   tool page rather than a different idea.
 *
 * Renders no hooks and no browser APIs, so it is safe inside a client component
 * (the explorer) and a server one (the tool page) alike, at no bundle cost beyond
 * its markup.
 */

const USE_MARK =
  "inline-block shrink-0 border border-accent bg-accent h-2 w-2 rounded-[1px]";
const SKIP_MARK = "inline-block shrink-0 border border-fg-subtle h-2 w-2 rounded-full";

export function DecisionValve({
  toolName,
  useWhen,
  skipWhen,
  variant = "panel",
  heading = "h2",
  className = "",
}: {
  toolName: string;
  useWhen: string;
  skipWhen: string;
  variant?: "panel" | "inline";
  /**
   * The element for the two panel headings. Defaults to `h2` for the tool page,
   * where they are the page's section headings; a caller that nests the valve
   * under its own `h2` should pass `h3`. Ignored by `inline`, which has none.
   */
  heading?: ElementType;
  className?: string;
}) {
  if (variant === "inline") {
    return (
      <span className={`block ${className}`.trim()}>
        <span className="flex items-baseline gap-2 text-pretty text-[12.5px] leading-relaxed">
          <span aria-hidden="true" className={`${USE_MARK} translate-y-[-1px]`} />
          <span>
            <span className="text-fg">Use when</span>{" "}
            <span className="text-fg-muted">{useWhen}</span>
          </span>
        </span>
        <span className="mt-1 flex items-baseline gap-2 text-pretty text-[12.5px] leading-relaxed">
          <span aria-hidden="true" className={`${SKIP_MARK} translate-y-[-1px]`} />
          <span>
            <span className="text-fg-muted">Skip when</span>{" "}
            <span className="text-fg-subtle">{skipWhen}</span>
          </span>
        </span>
      </span>
    );
  }

  return (
    <div
      className={`grid gap-px border border-border bg-border sm:grid-cols-2 ${className}`.trim()}
    >
      <div className="bg-bg-elevated p-3.5">
        <Eyebrow as={heading} size="xs" tone="strong" className="flex items-center gap-2">
          <span aria-hidden="true" className={USE_MARK} />
          Use {toolName} when
        </Eyebrow>
        <p className="mt-2 text-pretty text-[14px] leading-relaxed text-fg">{useWhen}</p>
      </div>
      <div className="bg-bg-elevated p-3.5">
        <Eyebrow as={heading} size="xs" className="flex items-center gap-2">
          <span aria-hidden="true" className={SKIP_MARK} />
          Skip {toolName} when
        </Eyebrow>
        <p className="mt-2 text-pretty text-[14px] leading-relaxed text-fg-muted">
          {skipWhen}
        </p>
      </div>
    </div>
  );
}
