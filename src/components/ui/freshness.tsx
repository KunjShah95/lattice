import {
  describeFreshness,
  freshnessOf,
  meterCells,
  type Freshness,
} from "@/lib/freshness";

/**
 * The staleness guard, drawn.
 *
 * `strategy/02` §3 calls the build gate the strongest true thing about the site
 * and the biggest gap between what it *is* and what it *shows*: it lives in
 * `data.ts` as a `throw` nobody sees. A date says when a check happened; it does
 * not say how much of the check's life is left, which is the number the build
 * actually enforces. This draws that number.
 *
 * Server components, no state, no timers. `now` is a prop, not read inside,
 * because the page is prerendered: the meter shows the state *at build time*,
 * which is exactly what the guard checked and what `/verification.json` states.
 * Reading the clock at render would let a cached page and the receipt disagree.
 *
 * Colour is a second channel, never the only one: the cell count and the
 * `aria-label` both carry the state, and `due` is the accent only because the
 * accent is already the site's "this needs attention" colour.
 */

/** One cell per month the build still accepts the entry. */
export function FreshnessMeter({
  freshness,
  className = "",
}: {
  freshness: Freshness;
  className?: string;
}) {
  const { total, filled } = meterCells(freshness);
  const label = describeFreshness(freshness);
  const on = freshness.state === "due" || freshness.state === "expired" ? "bg-accent" : "bg-fg-muted";

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`inline-flex items-center gap-[3px] ${className}`.trim()}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`h-2.5 w-[5px] rounded-[1px] ${
            i < filled ? on : "border border-border-strong"
          }`}
        />
      ))}
    </span>
  );
}

/**
 * The stamp for one entry: when it was checked, how much of the window is left,
 * and the month the build starts refusing it.
 *
 * Replaces a bare "Verified 2026-09". The extra clause is the part a reader
 * cannot get anywhere else: it turns "a date somebody typed" into "a date a
 * build will fail over".
 */
export function FreshnessStamp({
  asOf,
  now,
  windowMonths,
  className = "",
}: {
  asOf: string;
  now: Date;
  windowMonths: number;
  className?: string;
}) {
  const f = freshnessOf(asOf, now, windowMonths);
  return (
    <span
      className={`inline-flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle ${className}`.trim()}
    >
      <span className="inline-flex items-center gap-2">
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: "var(--band-control)" }}
        />
        Verified {asOf}
      </span>
      <FreshnessMeter freshness={f} />
      <span className="normal-case tracking-normal">
        build refuses it from {f.expires}
      </span>
    </span>
  );
}
