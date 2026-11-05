import type { ElementType } from "react";
import { Eyebrow } from "./eyebrow";

/**
 * The use-when / skip-when pair: this index's whole thesis, per tool.
 *
 * One object with two states — a *valve*, not two equal cards. Use is the active
 * half and sits in full ink; skip is the constraint and recedes. Equal weight
 * would imply the two are equally worth knowing, which is false, and the second
 * sentence is the reason to trust the first.
 *
 * Two shapes, one pair of marks:
 *
 * - `panel` is the tool page: a single bordered object, split by a hairline,
 *   with the skip half carrying a slightly darker paper so the eye reads the
 *   pair as one decision with a cost attached.
 * - `inline` is for dense lists: the same marks, order and weights in two
 *   lines instead of a box.
 *
 * Renders no hooks and no browser APIs, so it is safe inside a client component
 * and a server one alike.
 */

const USE_MARK =
  "inline-block shrink-0 border border-accent bg-accent h-2.5 w-2.5 rounded-[2px]";
const SKIP_MARK = "inline-block shrink-0 border border-fg-subtle h-2.5 w-2.5 rounded-full";

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
      <div className={`space-y-1 ${className}`.trim()}>
        <div className="flex items-baseline gap-2.5 text-pretty text-[14px] leading-relaxed">
          <span aria-hidden="true" className={`${USE_MARK} translate-y-[-1px]`} />
          <p>
            <span className="font-medium text-fg">Use when</span>{" "}
            <span className="text-fg-muted">{useWhen}</span>
          </p>
        </div>
        <div className="flex items-baseline gap-2.5 text-pretty text-[14px] leading-relaxed">
          <span aria-hidden="true" className={`${SKIP_MARK} translate-y-[-1px]`} />
          <p>
            <span className="font-medium text-fg-muted">Skip when</span>{" "}
            <span className="text-fg-muted">{skipWhen}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`grid overflow-hidden rounded-[var(--r-card)] border border-border bg-border sm:grid-cols-2 sm:gap-px ${className}`.trim()}
    >
      <div className="border-l-[3px] border-accent bg-bg-elevated p-5 sm:p-6">
        <Eyebrow as={heading} size="sm" tone="strong" className="flex items-center gap-2.5">
          <span aria-hidden="true" className={USE_MARK} />
          Use {toolName} when
        </Eyebrow>
        <p className="mt-3 text-pretty text-[16.5px] leading-relaxed tracking-[-0.006em] text-fg">
          {useWhen}
        </p>
      </div>
      <div className="bg-bg-sunken/70 p-5 sm:p-6">
        <Eyebrow as={heading} size="sm" className="flex items-center gap-2.5">
          <span aria-hidden="true" className={SKIP_MARK} />
          Skip {toolName} when
        </Eyebrow>
        <p className="mt-3 text-pretty text-[16.5px] leading-relaxed tracking-[-0.006em] text-fg-muted">
          {skipWhen}
        </p>
      </div>
    </div>
  );
}
