import { allTools, STALE_AFTER_MONTHS, staleCutoff, toolCount } from "./data";

/**
 * The public receipt for the build's staleness guard.
 *
 * `data.ts` throws at module load when any entry's licence/cost check is older
 * than the cutoff, so a deployed site has by construction passed. That is
 * the strongest true claim this index makes, and on its own it is invisible —
 * a `throw` nobody sees. This report publishes the rule, the date it was
 * enforced, and every entry's check and expiry, so the claim can be audited
 * rather than taken on trust.
 *
 * Pure in `now` so tests can move the clock; the route passes the build date.
 */

const month = (d: Date) => d.toISOString().slice(0, 7);

/** First month in which a build would refuse a check dated `asOf`. */
function expiryOf(asOf: string): string {
  const [y, m] = asOf.split("-").map(Number);
  // Stale once the cutoff passes the check: asOf + STALE_AFTER_MONTHS + 1.
  return month(new Date(Date.UTC(y, m - 1 + STALE_AFTER_MONTHS + 1, 1)));
}

export function buildVerificationReport(now: Date) {
  const cutoff = staleCutoff(now);

  const entries = allTools.map((t) => ({
    name: t.name,
    section: t.category.slug,
    path: `/${t.category.slug}/${t.slug}`,
    asOf: t.asOf,
    expires: expiryOf(t.asOf),
  }));

  const stale = allTools
    .filter((t) => new Date(t.asOf) < cutoff)
    .map((t) => t.name);

  return {
    generatedAt: now.toISOString().slice(0, 10),
    status: stale.length ? ("fail" as const) : ("pass" as const),
    rule: {
      staleAfterMonths: STALE_AFTER_MONTHS,
      cutoff: month(cutoff),
      checks: ["license", "cost", "deployment"],
      enforcement:
        "The build fails if any entry was last confirmed before the cutoff. A failing build cannot deploy.",
    },
    toolCount,
    nextRecheckBy: entries.reduce(
      (min, e) => (e.expires < min ? e.expires : min),
      entries[0]?.expires ?? "",
    ),
    stale,
    entries,
  };
}

export type VerificationReport = ReturnType<typeof buildVerificationReport>;
