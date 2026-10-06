/**
 * Scoring for the citation tracker.
 *
 * Extracted from `scripts/cite-check.mjs` so it can be tested without an API key
 * and so the position logic is written once. The script owns the network calls
 * and the files; this owns the arithmetic.
 *
 * Two decisions here are worth stating, because both change the numbers:
 *
 * **Position counts distinct hosts, not URLs.** Engines return the same domain
 * several times when a page is cited under multiple headings, and a deep site
 * would otherwise look better-placed than a shallow one for free. Deduplicating
 * by host means position 1 means "the first *source*", which is the thing a
 * reader would call first.
 *
 * **A run with no citations is a zero, not a gap.** A tracker that treats "not
 * cited" as missing data cannot distinguish "never mentioned" from "not
 * measured", and those are the two findings worth acting on.
 */

/** Normalise a URL to a comparable host, or null if it will not parse. */
export function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/**
 * 1-based position of the first citation to this site, or null.
 *
 * Host-prefix rather than equality: a citation to
 * `/inference-serving/vllm?utm_source=perplexity` is still a citation, and the
 * tracking parameter is the engine's, not ours.
 */
export function latticePosition(sources, siteHost) {
  const host = String(siteHost).replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
  const seen = new Set();

  for (const raw of sources ?? []) {
    const h = hostOf(raw);
    if (!h || seen.has(h)) continue;
    seen.add(h);
    if (h === host || h.endsWith(`.${host}`)) return seen.size;
  }
  return null;
}

/** The top `n` distinct hosts, for the log's "what did it cite instead" column. */
export function topSources(sources, n = 3) {
  const hosts = [];
  for (const raw of sources ?? []) {
    const h = hostOf(raw);
    if (h && !hosts.includes(h)) hosts.push(h);
  }
  return hosts.slice(0, n);
}

/**
 * Median, rounded. Returns null for an empty set so callers can print an em dash.
 *
 * The coercion is deliberately two-step. `Number("")` is `0` and `Number(null)`
 * is `0`, both of which are finite, so a single `.map(Number).filter(isFinite)`
 * would turn a blank position column — which is what an uncited query writes to
 * the CSV — into a citation at position 0, the best possible position, pulling
 * every median it appears in down by one. A tracker that reports "position 0" is
 * worse than one that reports nothing.
 */
export function median(values) {
  const nums = (values ?? [])
    // Blank, whitespace-only and literal null/undefined are all "no position".
    .filter((v) => v !== null && v !== undefined && String(v).trim() !== "")
    .map(Number)
    .filter((n) => Number.isFinite(n));

  if (!nums.length) return null;
  const sorted = nums.sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/**
 * Aggregate rows into per-claim rates.
 *
 * This is the number the tracker's own instructions asked for and never had: a
 * rate per *claim*, so "double down on the tactic it maps to" is an instruction
 * someone can follow rather than a sentiment.
 */
export function claimSummary(rows, claimIds) {
  const buckets = new Map();

  for (const row of rows ?? []) {
    const entry = buckets.get(row.claim) ?? { runs: 0, cited: 0, positions: [] };
    entry.runs += 1;
    if (row.cited) {
      entry.cited += 1;
      entry.positions.push(Number(row.position));
    }
    buckets.set(row.claim, entry);
  }

  return (claimIds ?? [...buckets.keys()])
    .filter((claim) => buckets.has(claim))
    .map((claim) => {
      const e = buckets.get(claim);
      return {
        claim,
        runs: e.runs,
        cited: e.cited,
        // A zero, not a gap: "not cited" is a finding.
        rate: e.runs ? e.cited / e.runs : 0,
        median: median(e.positions),
      };
    })
    .sort((a, b) => b.rate - a.rate || a.claim.localeCompare(b.claim));
}

/**
 * Content gaps: tracked queries with no page on this site to be cited from.
 *
 * A query with an empty `target` is a missing page, not a weak ranking, and the
 * fix is writing copy rather than improving something that already exists. The
 * tracker reports these separately for exactly that reason — lumping them in with
 * "not cited" produces a to-do list of things to rewrite, when the actual gap is
 * a thing that does not exist yet.
 */
export function contentGaps(queries, rows) {
  const citedIds = new Set((rows ?? []).filter((r) => r.cited).map((r) => r.query_id));
  return (queries ?? [])
    .filter((q) => q.target === "" && !citedIds.has(q.id))
    .map((q) => ({ id: q.id, query: q.query, claim: q.claim }));
}

/**
 * Movement against a previous run of the same queries.
 *
 * Returns the delta in median position per query, signed so a *positive* number
 * means the page moved closer to the top. Queries absent from `previous` are
 * omitted rather than counted as a loss of infinity, because a new query has no
 * history to lose.
 */
export function movement(rows, previousRows) {
  const before = new Map();
  for (const row of previousRows ?? []) {
    if (!row.cited) continue;
    const entry = before.get(row.query_id) ?? [];
    entry.push(Number(row.position));
    before.set(row.query_id, entry);
  }

  const now = new Map();
  for (const row of rows ?? []) {
    if (!row.cited) continue;
    const entry = now.get(row.query_id) ?? [];
    entry.push(Number(row.position));
    now.set(row.query_id, entry);
  }

  const out = [];
  for (const [queryId, positions] of now) {
    if (!before.has(queryId)) continue;
    const delta = median(before.get(queryId)) - median(positions);
    out.push({ queryId, from: median(before.get(queryId)), to: median(positions), delta });
  }
  return out.sort((a, b) => b.delta - a.delta);
}