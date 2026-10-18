import { MARK_CELLS } from "@/lib/mark";

/**
 * The logo's 3×3 lattice, drawn large, for the 404 and error pages.
 *
 * The mark is five inked cells spelling an L, with the corner joint in the
 * accent. These pages reuse it rather than an illustration, so even the
 * failure states are drawn in the site's own vocabulary:
 *
 *   - `missing` (404): one inked cell is gone — a dashed outline where the
 *     sheet should be, with crop marks around the gap.
 *   - `fault` (error): every cell is present, but one has been knocked out
 *     of alignment — shifted and turned, outlined in the accent — the way a
 *     drawing marks the part that failed.
 *
 * Decorative only (`aria-hidden`); the page's heading says what happened.
 */
export function StatusArt({ variant }: { variant: "missing" | "fault" }) {
  const CELL = 40;
  const STEP = 52;
  // The cell this state is about: the top of the L's upright for a missing
  // sheet, the end of the base for a fault.
  const target = variant === "missing" ? { col: 0, row: 0 } : { col: 2, row: 2 };

  return (
    <svg
      aria-hidden="true"
      viewBox={`-14 -14 ${STEP * 2 + CELL + 28} ${STEP * 2 + CELL + 28}`}
      className="h-36 w-36 overflow-visible sm:h-44 sm:w-44"
    >
      {MARK_CELLS.map(({ col, row, kind }, i) => {
        const x = col * STEP;
        const y = row * STEP;
        const isTarget = col === target.col && row === target.row;

        if (kind === "dot") {
          return (
            <circle
              key={`${col}${row}`}
              cx={x + CELL / 2}
              cy={y + CELL / 2}
              r="3"
              className="fill-fg-subtle"
              opacity="0.45"
            />
          );
        }

        if (isTarget && variant === "missing") {
          return (
            <g key={`${col}${row}`}>
              <rect
                x={x + 0.75}
                y={y + 0.75}
                width={CELL - 1.5}
                height={CELL - 1.5}
                rx="5"
                fill="none"
                className="stroke-fg-subtle"
                strokeWidth="1.5"
                strokeDasharray="5 4"
              />
              {/* Crop marks around the gap. */}
              {[
                [x - 8, y - 8, 1, 1],
                [x + CELL + 8, y - 8, -1, 1],
                [x - 8, y + CELL + 8, 1, -1],
                [x + CELL + 8, y + CELL + 8, -1, -1],
              ].map(([cx, cy, dx, dy]) => (
                <path
                  key={`${cx}${cy}`}
                  d={`M${cx} ${cy + dy * 9}V${cy}H${cx + dx * 9}`}
                  fill="none"
                  className="stroke-accent"
                  strokeWidth="1.5"
                />
              ))}
            </g>
          );
        }

        const isJoint = kind === "joint";

        if (isTarget && variant === "fault") {
          return (
            <g key={`${col}${row}`}>
              {/* Where the cell belongs: a dashed ghost in its slot. */}
              <rect
                x={x + 0.75}
                y={y + 0.75}
                width={CELL - 1.5}
                height={CELL - 1.5}
                rx="5"
                fill="none"
                className="stroke-fg-subtle"
                strokeWidth="1.5"
                strokeDasharray="5 4"
              />
                <rect
              x={x}
              y={y}
              width={CELL}
              height={CELL}
              rx="5"
              className="fill-fg stroke-accent"
              strokeWidth="2.5"
              transform={`translate(9 11) rotate(11 ${x + CELL / 2} ${y + CELL / 2})`}
              />
            </g>
          );
        }

        return (
          <rect
            key={`${col}${row}`}
            x={x}
            y={y}
            width={CELL}
            height={CELL}
            rx="5"
            className={`draw-y ${isJoint ? "fill-accent" : "fill-fg"}`}
            style={{ "--i": i, transformBox: "fill-box", transformOrigin: "center bottom" } as React.CSSProperties}
          />
        );
      })}
    </svg>
  );
}
