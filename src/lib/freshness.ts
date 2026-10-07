/**
 * How old an entry's checked facts are, measured against the build gate.
 *
 * `data.ts` throws at module load when an entry's `asOf` is older than
 * `STALE_AFTER_MONTHS`. That is the strongest true claim the index makes and,
 * until this module, the reader could not see it: a date said *when* a check
 * happened, never *how much of its life was left*. This turns the date into the
 * thing the guard actually enforces, so a reader and the build agree on what
 * "stale" means.
 *
 * ## Why the window is a parameter
 *
 * `STALE_AFTER_MONTHS` lives in `data.ts`, which pulls in the whole dataset.
 * Importing it here would drag that into any client component that merely wants
 * to draw a meter. Callers pass the window instead; the one place it is read is
 * the server page, next to the data it describes. The tests pin this module to
 * the real constant so the two cannot drift.
 *
 * ## Month arithmetic matches the guard
 *
 * The guard's cutoff is the first of the month, `window` months back, and an
 * entry fails when its month is *before* the cutoff. In whole months that is
 * `age > window`, where age is the difference between the build's month and the
 * entry's month. Everything below is derived from that one inequality so the
 * meter cannot show an entry as healthy that the build would refuse.
 */

/** `YYYY-MM`, as stored on every entry. */
const AS_OF = /^(\d{4})-(0[1-9]|1[0-2])$/;

export type FreshnessState =
  /** Less than half the window used. */
  | "fresh"
  /** Half the window or more used; still comfortably inside it. */
  | "aging"
  /** One month or less of validity left: the build refuses it within two months. */
  | "due"
  /** Past the window. A deployed site never shows this; it exists so the type is total. */
  | "expired";

export type Freshness = {
  /** Whole months between the check and the build. */
  ageMonths: number;
  /** The gate, in months. Echoed so a consumer needs only this object. */
  windowMonths: number;
  /** Months of validity left; 0 means this is the last month the build accepts it. Negative once expired. */
  remainingMonths: number;
  /** Share of the window consumed, clamped to 0–1. */
  used: number;
  /** First month a build would refuse this entry, `YYYY-MM`. */
  expires: string;
  state: FreshnessState;
};

/** Months since year 0, so two `YYYY-MM` values subtract cleanly. */
function monthIndex(year: number, month1: number): number {
  return year * 12 + (month1 - 1);
}

function parse(asOf: string): { year: number; month: number } {
  const m = AS_OF.exec(asOf);
  if (!m) throw new Error(`freshness: "${asOf}" is not a YYYY-MM month`);
  return { year: Number(m[1]), month: Number(m[2]) };
}

/**
 * First month a build refuses an entry checked in `asOf`: the check month plus
 * the window plus one. Shared with the published receipt so `/verification` and
 * `/verification.json` cannot disagree about an expiry.
 */
export function expiryMonth(asOf: string, windowMonths: number): string {
  const { year, month } = parse(asOf);
  const idx = monthIndex(year, month) + windowMonths + 1;
  const y = Math.floor(idx / 12);
  const m = (idx % 12) + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

/** Where an entry sits against the gate on a given build date. */
export function freshnessOf(asOf: string, now: Date, windowMonths: number): Freshness {
  const { year, month } = parse(asOf);
  const ageMonths =
    monthIndex(now.getUTCFullYear(), now.getUTCMonth() + 1) - monthIndex(year, month);
  const remainingMonths = windowMonths - ageMonths;
  const used = Math.min(1, Math.max(0, ageMonths / windowMonths));

  let state: FreshnessState;
  if (remainingMonths < 0) state = "expired";
  else if (remainingMonths <= 1) state = "due";
  else if (used >= 0.5) state = "aging";
  else state = "fresh";

  return {
    ageMonths,
    windowMonths,
    remainingMonths,
    used,
    expires: expiryMonth(asOf, windowMonths),
    state,
  };
}

/**
 * The meter as cells: one per month the build still accepts the entry.
 *
 * `windowMonths + 1` cells, not `windowMonths`, because the guard accepts ages
 * 0 through `window` inclusive — a six-month window is seven good months. Cells
 * *drain* as the entry ages (full the month it is checked, one cell left in its
 * last accepted month, none once expired) rather than fill, so a freshly checked
 * entry looks full and an entry in its last month does not look empty — an empty
 * bar would read as already expired, which is a different and worse claim.
 */
export function meterCells(f: Freshness): { total: number; filled: number } {
  const total = f.windowMonths + 1;
  return { total, filled: Math.max(0, Math.min(total, f.remainingMonths + 1)) };
}

/** Plain-language sentence for the meter, for screen readers and `title`. */
export function describeFreshness(f: Freshness): string {
  if (f.state === "expired") {
    return `Past the ${f.windowMonths}-month limit; a build would refuse this entry.`;
  }
  if (f.remainingMonths === 0) {
    return `Checked ${f.ageMonths} months ago. Last month the build accepts it; it must be re-checked before ${f.expires}.`;
  }
  const left = f.remainingMonths === 1 ? "1 month" : `${f.remainingMonths} months`;
  const age =
    f.ageMonths === 0
      ? "Checked this month"
      : f.ageMonths === 1
        ? "Checked 1 month ago"
        : `Checked ${f.ageMonths} months ago`;
  return `${age}. ${left} left before the build refuses it (${f.expires}).`;
}
