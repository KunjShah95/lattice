import type { ElementType, ReactNode } from "react";

/**
 * The small mono, uppercase, tracked label that heads every block on the site:
 * "Quick answers", "Compared in", "Also belongs in".
 *
 * It was spelled out by hand in more than a hundred places, in three sizes and
 * two trackings that drifted apart by accident. One component means a change to
 * the label voice is one edit, and the choice between `h2` and `p` is made in
 * the open at the call site rather than inherited from whichever copy was pasted.
 *
 * The floor is 12px. `xs` was 10px, which is below the size at which uppercase
 * mono is comfortably readable on a laptop and well below it on a phone; the
 * difference between the two sizes is now 0.5px and a tracking step, not a
 * legibility step.
 *
 * `as` is required in spirit: a label that names a section of the page is a
 * heading and should be an `h2`; one that is a caption on a number is a `p` or
 * `span`. The default is `p` because a wrong heading is an accessibility bug and
 * a wrong paragraph is not.
 */
export function Eyebrow({
  as: Tag = "p",
  size = "sm",
  tone = "subtle",
  className = "",
  children,
}: {
  as?: ElementType;
  /** `xs` is the label inside a dense box; `sm` heads a page section. */
  size?: "xs" | "sm";
  /** `strong` is full ink: the active half of a pair, not a louder label. */
  tone?: "subtle" | "strong";
  className?: string;
  children: ReactNode;
}) {
  const scale =
    size === "xs"
      ? "text-[12px] tracking-[0.08em]"
      : "text-[13px] tracking-[0.08em]";
  const colour = tone === "strong" ? "text-fg" : "text-fg-muted";
  return (
    <Tag className={`font-mono uppercase ${scale} ${colour} ${className}`.trim()}>
      {children}
    </Tag>
  );
}
