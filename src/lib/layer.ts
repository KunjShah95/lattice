/**
 * Maps a stack depth to its colour stop in the ramp defined in globals.css.
 * Kept as a plain CSS-var reference so light/dark switching stays free —
 * the browser resolves `--layer-N` per theme without any JS.
 */
export function layerColor(layer: number | null | undefined): string {
  if (!layer || layer < 1) return "var(--fg-subtle)";
  const clamped = Math.min(Math.round(layer), 9);
  return `var(--layer-${clamped})`;
}

/** Inline style for a swatch/dot/rule in a given layer's colour. */
export function layerStyle(
  layer: number | null | undefined,
): React.CSSProperties {
  return { backgroundColor: layerColor(layer) };
}
