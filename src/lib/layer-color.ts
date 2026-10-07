/**
 * Maps a stack depth to its colour stop in the ramp defined in globals.css.
 * Kept as a plain CSS-var reference so light/dark switching stays free —
 * the browser resolves `--layer-N` per theme without any JS.
 *
 * Lives in its own module, with no imports, because `lib/layer.ts` imports the whole
 * dataset: a client component that only wants a colour and imported it from there
 * would ship every tool to the browser. `layer.ts` re-exports this, so existing
 * imports are unchanged and there is still exactly one definition.
 */
export function layerColor(layer: number | null | undefined): string {
  if (!layer || layer < 1) return "var(--fg-subtle)";
  const clamped = Math.min(Math.round(layer), 9);
  return `var(--layer-${clamped})`;
}
