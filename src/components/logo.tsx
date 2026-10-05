import { site } from "@/lib/site";

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

/** 5px cells and 1.5px gutters fill an 18px box exactly. */
const CELL = 5;
const STEP = 6.5;

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      {MARK_CELLS.map(({ col, row, kind }) => {
        const x = col * STEP;
        const y = row * STEP;
        return kind === "dot" ? (
          <circle
            key={`${col}${row}`}
            cx={x + CELL / 2}
            cy={y + CELL / 2}
            r="0.8"
            fill="currentColor"
            opacity="0.4"
          />
        ) : (
          <rect
            key={`${col}${row}`}
            x={x}
            y={y}
            width={CELL}
            height={CELL}
            rx="0.75"
            fill="currentColor"
            className={kind === "joint" ? "text-accent" : undefined}
          />
        );
      })}
    </svg>
  );
}

/** Wordmark: the mark in ink with its accent joint, then the name. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className="font-medium tracking-[-0.01em]">{site.name}</span>
    </span>
  );
}
