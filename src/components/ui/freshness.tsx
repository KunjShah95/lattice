import {
  describeFreshness,
  freshnessOf,
  meterCells,
  type Freshness,
} from "@/lib/freshness";

/**
 * The staleness guard, drawn.
 *
 * A date says when a check happened; it does not say how much of the check's
 * life is left, which is the number the build actually enforces. This draws
 * that number.
 *
 * Server components, no state, no timers. `now` is a prop, not read inside,
 * because the page is prerendered: the meter shows the state *at build time*,
 * which is exactly what the guard checked and what `/verification.json` states.
 *
 * Colour is a second channel, never the only one: the cell count and the
 * `aria-label` both carry the state.
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
          className={`h-3 w-[6px] rounded-[2px] ${
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
      className={`inline-flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-fg-muted ${className}`.trim()}
    >
      <span className="inline-flex items-center gap-2">
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: "var(--band-control)" }}
        />
        Verified{" "}
        <span className="font-mono tabular-nums text-fg">{asOf}</span>
      </span>
      <FreshnessMeter freshness={f} />
      <span className="text-fg-subtle" title="The build fails after this month">
        rebuild due{" "}
        <span className="font-mono tabular-nums">{f.expires}</span>
      </span>
    </span>
  );
}
