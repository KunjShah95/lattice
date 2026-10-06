import { stackLayers } from "./data";

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

/**
 * Which of the three bands a layer belongs to.
 *
 * The nine layers collapse into three families, which is what makes the
 * palette information rather than ornament:
 *
 *   I  compute  — 01 inference, 02 routing.       failure: slow or expensive
 *   II state    — 03 retrieval, 04 fine-tuning.   failure: wrong answers
 *   III control — 05–09 agents through evals.    failure: unreliable
 *
 * A reader almost always arrives with a symptom rather than a layer, and
 * the band is the shortest path from "it is slow" to the two sections
 * worth reading. Exported so the nav, the filters and the spine all agree.
 */
export type Band = "compute" | "state" | "control";

export const BANDS: ReadonlyArray<{
  id: Band;
  roman: string;
  title: string;
  layers: number[];
  /** How a failure in this band usually presents, in the reader's words. */
  sounds: string;
}> = [
  {
    id: "compute",
    roman: "I",
    title: "Compute",
    layers: [1, 2],
    sounds: "too slow, too expensive",
  },
  {
    id: "state",
    roman: "II",
    title: "State",
    layers: [3, 4],
    sounds: "wrong answers",
  },
  {
    id: "control",
    roman: "III",
    title: "Control",
    layers: [5, 6, 7, 8, 9],
    sounds: "unreliable, unmeasured",
  },
] as const;

export function bandOf(layer: number | null | undefined): Band | null {
  if (!layer || layer < 1) return null;
  const found = BANDS.find((b) => b.layers.includes(Math.round(layer)));
  return found ? found.id : null;
}

export function bandMeta(band: Band | null | undefined) {
  if (!band) return undefined;
  return BANDS.find((b) => b.id === band);
}

/**
 * The in-stack sections a band owns, substrate first.
 *
 * Off-stack material is excluded deliberately: a band is a position in the
 * stack, so reading material belongs to none of them. `stackLayers` is already
 * the in-stack list in stack order, so this is a filter on it rather than a
 * second ordering to keep in step.
 */
export function bandLayers(band: Band) {
  return stackLayers.filter((c) => bandOf(c.layer) === band);
}

/** CSS variable for a band's identity colour. */
export function bandColor(band: Band | null | undefined): string {
  return band ? `var(--band-${band})` : "var(--fg-subtle)";
}

/**
 * Section-drawing hatch, which encodes position in the stack rather than
 * colour. Solid means the layer occupies a place in the stack; dashed means
 * it spans the stack; off-stack material gets no hatch and is drawn
 * detached. Requires the element to set `color` to its layer colour.
 */
export function hatchClass(
  layer: number | null | undefined,
  role: "layer" | "crosscutting" | "offstack",
): string {
  if (role === "offstack") return "";
  return role === "crosscutting" ? "hatch hatch-span" : "hatch hatch-stack";
}

/** Inline style for a swatch/dot/rule in a given layer's colour. */
export function layerStyle(
  layer: number | null | undefined,
): React.CSSProperties {
  return { backgroundColor: layerColor(layer) };
}
