import { allTools, STALE_AFTER_MONTHS, staleCutoff, toolCount } from "./data";
import { AS_OF, attributes } from "./attributes";
import { expiryMonth } from "./freshness";

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

/**
 * First month in which a build would refuse a check dated `asOf`. One
 * implementation, shared with the `/verification` page through `freshness.ts`,
 * so the human view and the JSON receipt cannot disagree about an expiry.
 */
const expiryOf = (asOf: string): string => expiryMonth(asOf, STALE_AFTER_MONTHS);

export function buildVerificationReport(now: Date) {
  const cutoff = staleCutoff(now);

  const entries = allTools.map((t) => ({
    name: t.name,
    section: t.category.slug,
    path: `/${t.category.slug}/${t.slug}`,
    asOf: t.asOf,
    /**
     * Whether this entry carries its own check date or inherits the dataset-wide
     * `AS_OF`. Published so a reader can tell "re-checked on its own schedule"
     * from "covered by the sweep", which are different claims with different
     * strengths. `data.ts` rejects a malformed `asOf` before this runs.
     */
    perTool: Boolean(attributes[t.name]?.asOf),
    expires: expiryOf(t.asOf),
  }));

  const stale = allTools
    .filter((t) => new Date(`${t.asOf}-01`) < cutoff)
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
    /**
     * The sweep every entry inherits unless it carries its own date, and how
     * many do. A reader can then tell the two cases apart rather than reading a
     * single number as if it described 112 independent checks.
     */
    datasetAsOf: AS_OF,
    perToolChecked: entries.filter((e) => e.perTool).length,
    nextRecheckBy: entries.reduce(
      (min, e) => (e.expires < min ? e.expires : min),
      entries[0]?.expires ?? "",
    ),
    stale,
    entries,
  };
}

export type VerificationReport = ReturnType<typeof buildVerificationReport>;
export type VerificationEntry = VerificationReport["entries"][number];

/** Entries that share a check month, and therefore a single expiry. */
export type CheckGroup = {
  /** `YYYY-MM` the entries in this group were last confirmed. */
  asOf: string;
  /** First month the build refuses them. */
  expires: string;
  entries: VerificationEntry[];
  /** How many of them carry their own date rather than inheriting the sweep. */
  perTool: number;
};

/**
 * Group the receipt by check month, soonest-to-expire first.
 *
 * 112 rows that almost all read the same date are not information; the
 * *distribution* is. Grouping answers the question a sceptical reader actually
 * has, "how much of this goes stale at once?", and puts the entries the next
 * forced re-check will hit at the top. Entries inside a group keep dataset order,
 * which is stack order, so the list reads the way the rest of the site does.
 */
export function groupByCheck(entries: VerificationEntry[]): CheckGroup[] {
  const byMonth = new Map<string, VerificationEntry[]>();
  for (const e of entries) {
    const bucket = byMonth.get(e.asOf);
    if (bucket) bucket.push(e);
    else byMonth.set(e.asOf, [e]);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([asOf, group]) => ({
      asOf,
      expires: group[0].expires,
      entries: group,
      perTool: group.filter((e) => e.perTool).length,
    }));
}
