import { formatRolling, rollingColumns } from "@/lib/rolling";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * An integer whose digits roll to their new value instead of swapping.
 *
 * Borrowed mechanic: NumberFlow / Rolling Number, listed on designeer.xyz. The
 * reason it earns a place is specific to the Stack Builder: the cost band
 * recomputes on every answer, and a figure that silently changes is a figure the
 * reader does not notice changing. The roll is the cue that *this number moved
 * because of the thing you just touched*.
 *
 * CSS only — no state, no effect, no animation library. Each digit is a column of
 * 0–9 translated to its value; changing the prop changes the transform and the
 * browser interpolates it. `globals.css` already turns transitions off under
 * `prefers-reduced-motion`, so a reader who asked for no motion gets the number
 * without it and nothing here needs to know.
 *
 * Accessible as the plain figure: the visual columns are `aria-hidden` and the
 * wrapper carries the formatted number as its label, so a screen reader reads
 * "1,240", not ten stacked digits.
 *
 * Needs `tabular-nums`-width digits to line up; the columns are `1ch` wide and
 * centre their glyph, so a proportional face does not make the figure jitter as
 * it rolls.
 */
export function RollingNumber({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const cols = rollingColumns(value);

  return (
    <span
      role="img"
      aria-label={formatRolling(value)}
      className={`inline-flex h-[1.15em] items-center overflow-hidden align-baseline tabular-nums leading-none ${className}`.trim()}
    >
      {cols.map((c) =>
        c.kind === "sep" ? (
          <span key={c.key} aria-hidden="true" className="leading-none">
            {c.char}
          </span>
        ) : (
          <span
            key={c.key}
            aria-hidden="true"
            className="relative inline-block h-[1.15em] w-[1ch] overflow-hidden text-center"
          >
            <span
              className="flex flex-col transition-transform duration-500 ease-[var(--ease-out)]"
              style={{ transform: `translateY(-${c.digit * 1.15}em)` }}
            >
              {DIGITS.map((d) => (
                <span key={d} className="block h-[1.15em] leading-[1.15em]">
                  {d}
                </span>
              ))}
            </span>
          </span>
        ),
      )}
    </span>
  );
}
