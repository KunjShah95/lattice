import type { StackPick } from "./stacks";

/**
 * What one answer changed in the recommended stack.
 *
 * The builder recomputes live, which is the right behaviour and a quiet one: flip
 * "self-hostable" and a vector store changes three screens down, and the reader
 * sees a different name with no idea which answer moved it. The reasons are already
 * in each pick's "why"; what was missing is the *edge* — this answer, that pick.
 *
 * Matched by section, not by position or by tool name: a layer can gain or lose a
 * pick (a constraint that rules out every candidate), and the same tool can appear
 * under a different section after the workload changes, so neither index nor name
 * identifies "the same slot". The section slug does.
 */

export type PickChange = {
  sectionSlug: string;
  section: string;
  /** Tool before, or null if the layer had no pick. */
  from: string | null;
  /** Tool after, or null if the layer lost its pick. */
  to: string | null;
};

export function diffPicks(prev: StackPick[], next: StackPick[]): PickChange[] {
  const before = new Map(prev.map((p) => [p.sectionSlug, p]));
  const after = new Map(next.map((p) => [p.sectionSlug, p]));
  const slugs = [...new Set([...before.keys(), ...after.keys()])];

  const changes: PickChange[] = [];
  for (const slug of slugs) {
    const a = before.get(slug);
    const b = after.get(slug);
    if ((a?.tool ?? null) === (b?.tool ?? null)) continue;
    changes.push({
      sectionSlug: slug,
      section: (b ?? a)!.section,
      from: a?.tool ?? null,
      to: b?.tool ?? null,
    });
  }
  return changes;
}

/** One line per change, for the live region and the copied report. */
export function describeChange(c: PickChange): string {
  if (c.from && c.to) return `${c.section}: ${c.from} → ${c.to}`;
  if (c.to) return `${c.section}: now ${c.to}`;
  return `${c.section}: ${c.from} no longer fits`;
}
