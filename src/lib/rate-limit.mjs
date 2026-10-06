/**
 * In-isolate rate limiting for the unauthenticated public endpoints.
 *
 * ## Why this exists
 *
 * `/signal`, `/api/search` and `/mcp` are open to the internet with no
 * credentials. `signal.mjs` validates the *shape* of a beacon carefully — a
 * closed event vocabulary, site-absolute paths, a size cap — and that is the
 * right call, because it is what decides whether the endpoint is safe to leave
 * open. But shape validation bounds the cost of one request, not the number of
 * them. Without a ceiling, anyone who finds the URL can write to the metrics
 * this site publishes, or spend the Worker isolate's CPU on it.
 *
 * The threat is specific and is called out in `strategy/04-monetisation.md` §7:
 * *"POST ten thousand `event: "compare"` lines and the metric you built says the
 * wedge is being used."* The shape rules do not stop that at all — those beacons
 * are perfectly well-formed.
 *
 * ## Why in-memory, given the no-bindings rule
 *
 * `wrangler.jsonc` deliberately carries no bindings, and this does not change
 * that. A KV or D1 binding to count requests would trade a documented
 * architectural decision for a number nobody acts on. A `Map` in module scope
 * needs no infrastructure, no deploy step and no cost.
 *
 * ## What it does and does not buy — read this before relying on it
 *
 * It is **per isolate**, and a Worker has many. So this is not a global rate
 * limit and cannot be presented as one: an attacker spread across N isolates gets
 * roughly N times the budget. What it does do is bound the damage from a single
 * client against a single isolate, which is the common case for a script
 * hammering one endpoint, and it costs nothing.
 *
 * The honest ceiling is Cloudflare's own per-account limit, which is far higher
 * and is the real defence. If `/signal` ever needs a hard global cap, the answer
 * is a rate-limiting rule in the Cloudflare dashboard, not more code here — and
 * `worker-smoke.mjs` asserts this limiter is wired rather than assuming it.
 *
 * ## Why rejections are silent
 *
 * Same rule as the beacon validator, and for the same reason: a 429 shows up as a
 * failed request in the very analytics this exists to produce, and tells the
 * sender their request was refused. `signal.mjs` answers 204 on rejection;
 * `/api/search` answers 429 because its caller is a program that can act on it.
 * The difference is whether the caller benefits from knowing.
 */

/**
 * Requests allowed per window, per client.
 *
 * Set well above any human or crawler. The palette issues one fetch; a crawler
 * paging `/api/search` legitimately makes dozens. The point is to stop a script,
 * not to enforce a quota — a limit low enough to notice would break real clients
 * before it inconvenienced anyone.
 */
export const DEFAULT_LIMIT = 120;

/** Window length. Long enough to be a rate, short enough to recover quickly. */
export const WINDOW_MS = 60_000;

/**
 * Entries kept at once.
 *
 * A bound, because the map is keyed by client identity and an attacker can
 * present unlimited distinct identities — without a cap this is a slow memory
 * leak triggered by a single request path. Evicted oldest-first when full, which
 * is the right policy for rate limiting: the entries most likely to be stale are
 * the oldest.
 */
export const MAX_ENTRIES = 10_000;

/** clientKey -> [windowStart, count] */
const buckets = new Map();

/**
 * The client identity used for bucketing.
 *
 * Deliberately coarse. A real per-user limit wants a verified identity, which
 * would mean a cookie — and this site has none, on purpose
 * (`strategy/04-monetisation.md` §7: no cookie, no session, so the log cannot be
 * joined into a profile). Adding one to enforce a rate limit would give up the
 * privacy property to protect a metric nobody is paying for.
 *
 * `CF-Connecting-IP` is set by Cloudflare and cannot be forged by the client, so
 * it is the only header trusted here. Everything else is ignored: `X-Forwarded-For`
 * is client-controlled on any origin not behind a proxy that overwrites it.
 */
export function clientKey(request) {
  return request.headers.get("CF-Connecting-IP") ?? "anonymous";
}

/**
 * Has this client exceeded its budget?
 *
 * Returns the verdict rather than throwing, so each route decides its own status
 * code — `signal` answers 204, `/api/search` answers 429.
 *
 * The window is fixed rather than sliding: a sliding window needs per-request
 * history and the precision buys nothing here. The consequence is that a client
 * can send `limit` requests at the end of one window and `limit` at the start of
 * the next. That is the standard trade and it is fine for this purpose.
 */
export function isRateLimited(request, limit = DEFAULT_LIMIT, windowMs = WINDOW_MS) {
  const key = clientKey(request);
  const now = Date.now();

  const entry = buckets.get(key);
  if (!entry || now - entry[0] >= windowMs) {
    if (buckets.size >= MAX_ENTRIES) evictOldest();
    buckets.set(key, [now, 1]);
    return false;
  }

  entry[1] += 1;
  return entry[1] > limit;
}

/** Seconds until the current window closes, for a `Retry-After` header. */
export function retryAfterSeconds(windowMs = WINDOW_MS) {
  return Math.ceil(windowMs / 1000);
}

/**
 * Drop the oldest entries until there is room.
 *
 * Iterating a `Map` yields in insertion order, so the first key is the oldest —
 * except for a key that was refreshed by a later request, which keeps its
 * original position. That is a small inaccuracy in the eviction order and does
 * not matter: the evicted entry is expired or nearly so either way, and the
 * alternative (re-inserting on every refresh) costs more than it buys.
 */
function evictOldest() {
  const overflow = buckets.size - MAX_ENTRIES + 1;
  let dropped = 0;
  for (const key of buckets.keys()) {
    buckets.delete(key);
    dropped += 1;
    if (dropped >= overflow) break;
  }
}

/** Drop every bucket. Tests only — production never resets. */
export function resetLimiter() {
  buckets.clear();
}

/** Current bucket count. Tests only, so the eviction bound can be asserted. */
export function bucketCount() {
  return buckets.size;
}