/**
 * Validation for the `/signal` beacon.
 *
 * Separate from the route because this is the part worth testing, and a route
 * handler is not testable without a request. It is also the part that decides
 * whether an unauthenticated public endpoint is safe to leave open.
 *
 * Four rules, each for a specific reason:
 *
 * 1. **A closed event vocabulary.** Anything can POST here. An arbitrary string
 *    in a structured log is a log-injection vector, and it is also how an
 *    analytics-poisoning attack works: POST ten thousand `event: "compare"` lines
 *    and the metric you built says the wedge is being used.
 * 2. **`from` and `to` are both required.** The log has to be an edge, not a
 *    counter. See `parseSignal`.
 * 3. **Both must be site-absolute paths, and neither may be scheme-relative.**
 *    `//evil.com` is a valid "path" by several loose tests and renders as a link
 *    to another origin. Nothing here ever renders it, but the value gets copied
 *    out of logs by humans, and a log is a worse place for an open redirect than
 *    a database is.
 * 4. **Length caps.** 512 bytes for the body, 200 for each path. A cap is not a
 *    security control here; it is a refusal to allocate memory on behalf of
 *    whoever POSTs.
 *
 * A fifth, optional field: `channel`, the coarse kind of place the reader landed
 * from (`lib/channel.mjs`). It is the one way to read the log by source of
 * traffic, which is what makes "does answer-engine traffic convert better than
 * a social burst" a query rather than a guess. Optional, because a beacon from a
 * browser that could not classify its landing is still a valid edge. Present
 * but outside the closed set, it rejects the beacon: same rule as `event`, for
 * the same reasons.
 */

import { isChannel } from "./channel.mjs";

/** The only events that mean anything. Adding one is a deliberate change. */
export const ALLOWED_EVENTS = [
  // Navigation edges: a link was followed.
  "alternatives",
  "compare",
  "second-home",
  "tool",
  "outbound",
  // Conversion numerators: the review CTA, and a free tool actually completed.
  "review",
  "stack-built",
  "compare-built",
  // A step short of a completion: a workload picked in the home page's mini
  // builder. `to` is that workload's `/stack/<id>` page.
  "hero-stack",
  // A built stack sent to the X compose window. `to` is `/stack/<id>`.
  "stack-shared",
  // The denominator: one per tab, at landing. `from` and `to` are both the
  // landing path. See `lib/beacon.ts`.
  "land",
];

/** Exposed for the route's `GET`, which describes the endpoint honestly. */
export const allowedEvents = ALLOWED_EVENTS;

export const MAX_SIGNAL_BYTES = 512;
const MAX_PATH = 200;

/**
 * Does this string contain a control character?
 *
 * A code-point loop rather than a regex character class, and that is not a style
 * preference. A class has to be spelled as an escaped byte range, and every way
 * of spelling it has at some point landed in this repository as the literal
 * bytes, which is why the read tool refused this file as binary. Literal control
 * characters in source make every diff unreviewable and get silently rewritten by
 * anything that normalises encoding. This version has nothing to normalise.
 *
 * A loop also gets DEL (0x7f) right, which the byte range that was here did not.
 */
function hasControlChars(value) {
  for (const char of value) {
    const code = char.codePointAt(0);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * Parse a beacon body, or return null to reject it silently.
 *
 * Silent rejection is the point: a beacon has no caller worth informing, and a
 * 4xx would show up as failed requests in the very analytics this exists to
 * produce. Null means "do not log, do not tell anyone".
 *
 * Both `from` and `to` are **required**. The first version sent only the current
 * page, under the key `to`so the log recorded where a reader already was and
 * never where they went. `kind: "compare"` then read as a comparison exit while
 * carrying no evidence that anyone reached a comparison page, and the metric
 * would have reported the wedge being used on the strength of a link existing.
 */
export function parseSignal(raw) {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > MAX_SIGNAL_BYTES) {
    return null;
  }

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) return null;

  const event = body.event;
  if (typeof event !== "string" || !ALLOWED_EVENTS.includes(event)) return null;
  if (hasControlChars(event)) return null;

  // Querystrings and fragments carry nothing useful here and everything noisy.
  const from = cleanPath(body.from);
  // "outbound" is the one event whose destination is not this site: `to` is the
  // tool's own domain, not a path, so it gets the hostname validator instead of
  // `cleanPath`. Every other event keeps the site-absolute-path rule.
  const to = event === "outbound" ? cleanHost(body.to) : cleanPath(body.to);
  if (!from || !to) return null;

  if (body.channel === undefined || body.channel === null) return { event, from, to };
  if (!isChannel(body.channel)) return null;
  return { event, from, to, channel: body.channel };
}

/**
 * A bare hostname, or null.
 *
 * Deliberately narrower than a general URL parser: no scheme, no path, no
 * port, because `to` for an outbound click is always `tool.domain` as it is
 * already rendered on the page ("Visit qdrant.tech"), never a full URL. A
 * value that needed a scheme stripped off to pass would be a value that
 * reached this log un-stripped eventually.
 */
function cleanHost(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_PATH) return null;
  if (hasControlChars(value)) return null;
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(value)
    ? value
    : null;
}

/**
 * A site-absolute path, or null.
 *
 * Scheme-relative paths are refused rather than repaired: a value that had to be
 * fixed to be safe is a value that eventually gets copied somewhere without the
 * fix.
 */
function cleanPath(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_PATH) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (hasControlChars(value)) return null;
  return value.split(/[?#]/)[0];
}