/**
 * The cells of the mark, on a 3x3 lattice. Shared with the OG card
 * (`lib/og.tsx`) and the generated icons so every rendering of the mark is
 * drawn from one definition.
 *
 * Five cells are inked and spell an L; the four that are not are left as
 * registration dots, the way intersections are marked on drafting paper. The
 * corner cell — where the upright meets the base — is the only one in the
 * accent: it is the joint the rest of the letter bears on, which is the site's
 * argument about the substrate in one square.
 */
export const MARK_CELLS: ReadonlyArray<{ col: number; row: number; kind: "ink" | "joint" | "dot" }> = [
  { col: 0, row: 0, kind: "ink" },
  { col: 1, row: 0, kind: "dot" },
  { col: 2, row: 0, kind: "dot" },
  { col: 0, row: 1, kind: "ink" },
  { col: 1, row: 1, kind: "dot" },
  { col: 2, row: 1, kind: "dot" },
  { col: 0, row: 2, kind: "joint" },
  { col: 1, row: 2, kind: "ink" },
  { col: 2, row: 2, kind: "ink" },
];
