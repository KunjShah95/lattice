/**
 * The column model behind a rolling number: each digit is its own column that
 * slides to its value, and separators sit still.
 *
 * Pure so it can be tested; `RollingNumber` only turns these into markup.
 *
 * ## Why columns are keyed from the right
 *
 * A number gaining a digit — 999 to 1,000 — must not remount the columns it
 * already has, or every digit would restart from zero and the whole figure would
 * spin instead of the one digit that changed. Aligning keys to the ones place
 * means the units column is always `c0`, tens `c1`, and so on, so a longer number
 * only adds a column on the left. The separator carries its position in its key
 * for the same reason.
 */

export type RollingColumn =
  | { key: string; kind: "digit"; digit: number }
  | { key: string; kind: "sep"; char: string };

const FORMAT = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** The text a screen reader should get: the plain formatted figure. */
export function formatRolling(n: number): string {
  return FORMAT.format(sanitise(n));
}

/** Non-finite or negative input reads as 0 rather than rendering "NaN" or a stray minus. */
function sanitise(n: number): number {
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

export function rollingColumns(n: number): RollingColumn[] {
  const text = formatRolling(n);
  const cols: RollingColumn[] = [];
  for (let i = 0; i < text.length; i += 1) {
    const fromRight = text.length - 1 - i;
    const ch = text[i];
    cols.push(
      /\d/.test(ch)
        ? { key: `c${fromRight}`, kind: "digit", digit: Number(ch) }
        : { key: `s${fromRight}`, kind: "sep", char: ch },
    );
  }
  return cols;
}
