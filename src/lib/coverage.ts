import { stackLayers } from "./data";

/**
 * How many entries each stack layer carries.
 *
 * `/methodology` states, as a limitation, that coverage is uneven. A limitation
 * that cannot be checked is a caveat rather than a disclosure, and this one
 * *could* not be: the prose named the thinnest layers and nothing on the page let
 * a reader count. Deriving the rows here means the chart and the sentence beside
 * it both read from the dataset, so neither can drift from the other or from the
 * data.
 *
 * The count is a crude proxy and is labelled as one where it is shown. More
 * entries is not better entries; it is the one measure of coverage that is
 * mechanical, and a stated crude measure beats an unstated confident one.
 *
 * In-stack layers only, in stack order. Off-stack material (reading) belongs to
 * no layer, so including it would put a bar in the chart that claims a position
 * the entries do not have.
 */

export type CoverageRow = {
  slug: string;
  /** `01`…`09`, as rendered in section headers. */
  index: string;
  short: string;
  layer: number;
  count: number;
  /** Count relative to the fullest layer, 0–1. Drives bar width. */
  share: number;
};

export function layerCoverage(): CoverageRow[] {
  const max = Math.max(...stackLayers.map((c) => c.tools.length));
  return stackLayers.map((c) => ({
    slug: c.slug,
    index: c.index,
    short: c.short,
    layer: c.layer as number,
    count: c.tools.length,
    share: max === 0 ? 0 : c.tools.length / max,
  }));
}

/**
 * The layers at one extreme, ties included.
 *
 * Returns *every* layer sharing the extreme count rather than slicing to a fixed
 * number: "the thinnest two" is a false statement when a third layer ties for
 * second, and a sentence that silently drops the tie is wrong in exactly the way
 * this page exists to avoid.
 */
export function extremeLayers(rows: CoverageRow[], which: "fullest" | "thinnest"): CoverageRow[] {
  if (rows.length === 0) return [];
  const target =
    which === "fullest"
      ? Math.max(...rows.map((r) => r.count))
      : Math.min(...rows.map((r) => r.count));
  return rows.filter((r) => r.count === target);
}

/** "Guardrails" · "Guardrails and Prompts" · "A, B and C". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
