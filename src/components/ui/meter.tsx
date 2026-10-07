/**
 * A horizontal value bar for a share of something, 0–1.
 *
 * Used where a number needs a picture and the number itself stays on screen
 * beside it — a confidence figure, a fit score. The bar is `aria-hidden` and the
 * caller renders the number as text, so the figure is never only an image.
 *
 * Ticks, not a smooth fill: ten segments read as a reading on an instrument and
 * match the freshness meter's cells, so the site has one idea of a meter rather
 * than a progress bar here and a gauge there. The unfilled segments are outlined,
 * not greyed, so the full scale is visible and the bar never looks like it ends
 * at its value.
 */
export function Meter({
  value,
  segments = 10,
  className = "",
}: {
  /** 0–1. Clamped; NaN reads as empty rather than throwing. */
  value: number;
  segments?: number;
  className?: string;
}) {
  const v = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  const filled = Math.round(v * segments);
  return (
    <span aria-hidden="true" className={`inline-flex items-center gap-[3px] ${className}`.trim()}>
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          className={`h-2.5 w-[5px] rounded-[1px] ${
            i < filled ? "bg-fg-muted" : "border border-border-strong"
          }`}
        />
      ))}
    </span>
  );
}
