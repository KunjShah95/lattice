/**
 * The browser side of `/signal`: one place that sends a beacon and knows the
 * landing channel.
 *
 * Browser-only. Every export touches `window`, `document` or storage, so call
 * them from event handlers and effects, never during render.
 *
 * ## The two numbers this exists to produce
 *
 * Read by channel, the log answers *"which source of traffic converts?"*, and the
 * answer is a **rate**, never a raw count. Answer-engine traffic will always
 * be smaller than a social burst; the claim worth testing is that it converts
 * better because the reader arrives mid-decision. So:
 *
 * - **denominator**: `land`, one per tab, sent the first time the tab classifies
 *   where it came from;
 * - **numerators**: `review` (the CTA click), `stack-built` and `compare-built`
 *   (a free tool actually completed, not merely opened).
 *
 * `strategy/04-monetisation.md` §7 has the decision rule and the queries.
 */
import { classifyArrival, isChannel, type Channel } from "@/lib/channel.mjs";

/** Every event the client sends. `signal.mjs` holds the same list; a test pins them together. */
export type SignalEvent =
  | "alternatives"
  | "compare"
  | "second-home"
  | "tool"
  | "outbound"
  | "review"
  | "land"
  | "stack-built"
  | "compare-built";

export const CLIENT_EVENTS: readonly SignalEvent[] = [
  "alternatives",
  "compare",
  "second-home",
  "tool",
  "outbound",
  "review",
  "land",
  "stack-built",
  "compare-built",
];

const CHANNEL_KEY = "lattice.channel";

/**
 * The channel this tab landed from: first touch, remembered for the tab.
 *
 * First touch rather than last, because an internal full-page load replaces
 * `document.referrer` with this site's own URL, and a reader who arrived from
 * an AI answer is still that reader three pages later. `sessionStorage` rather
 * than a cookie: it is per tab, it is never sent with a request, and it is gone
 * when the tab closes. Every access is guarded, because storage throws in some
 * private modes and nothing here may break a page.
 *
 * `fresh` is true only on the call that classified *and persisted* the
 * landing: that is the one moment a `land` beacon may go out. Tying it to the
 * write, not the read, means a tab whose storage is blocked sends no `land`
 * at all rather than one per page, which would inflate the denominator and
 * make every channel look worse than it is. Undercounting a few private tabs
 * is the cheaper error.
 */
function readLanding(): { channel: Channel | null; fresh: boolean } {
  try {
    const stored = sessionStorage.getItem(CHANNEL_KEY);
    if (isChannel(stored)) return { channel: stored, fresh: false };
  } catch {
    // Storage blocked: classify from what this page knows, and do not persist.
  }
  const channel = classifyArrival(document.referrer, location.search, location.hostname);
  if (!channel) return { channel: null, fresh: false };
  try {
    sessionStorage.setItem(CHANNEL_KEY, channel);
    return { channel, fresh: true };
  } catch {
    return { channel, fresh: false };
  }
}

/** The landing channel, or null when it cannot be known. */
export function landingChannel(): Channel | null {
  return readLanding().channel;
}

/**
 * Send one beacon. Best-effort and never awaited: a tracker that can break or
 * slow the thing it tracks is worse than a missing number.
 *
 * `to` is a site-absolute path, except for `outbound`, where it is the tool's
 * hostname. The validator in `signal.mjs` enforces both shapes.
 */
export function sendSignal(event: SignalEvent, to: string): void {
  try {
    const channel = landingChannel();
    navigator.sendBeacon(
      "/signal",
      JSON.stringify({ event, from: location.pathname, to, channel: channel ?? undefined }),
    );
  } catch {
    // No `sendBeacon`, or a CSP that forbids it. Nothing to do.
  }
}

/**
 * Classify the landing once per tab and, on that first classification, send
 * the `land` beacon: the denominator every conversion rate divides by.
 *
 * `from` and `to` are both the landing path, so the log can also answer
 * "which pages do AI answers send people to", which is the content-surface
 * question when that number is small.
 */
export function captureLanding(): void {
  try {
    const { channel, fresh } = readLanding();
    if (!fresh || !channel) return;
    navigator.sendBeacon(
      "/signal",
      JSON.stringify({ event: "land", from: location.pathname, to: location.pathname, channel }),
    );
  } catch {
    // As above: best-effort.
  }
}
