import { site } from "@/lib/site";

// The cell layout lives in `lib/mark.ts`, a dependency-free module, so the
// error page (a client component on every route) can draw the mark without
// pulling this file's `site` import into every bundle.
import { MARK_CELLS } from "@/lib/mark";
export { MARK_CELLS };

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
            // Registration dots swell on hover, rippling out from the joint:
            // the mark "plots" the rest of its lattice. Only reacts inside a
            // `.group` (the header link); everywhere else it is static.
            className="opacity-40 [transform-box:fill-box] [transform-origin:center] transition-[translate,scale,rotate,opacity] duration-300 ease-[var(--ease-spring)] group-hover:scale-[1.9] group-hover:opacity-70"
            style={{ transitionDelay: `${(col + (2 - row)) * 45}ms` }}
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
