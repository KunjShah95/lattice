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
 *   (a free tool actually completed, not merely opened);
 * - **the hero's step**: `hero-stack`, a workload picked in the home page's
 *   mini builder. It is deliberately not `stack-built`: one click on a preset
 *   is interest, not a completed tool, and counting it as one would inflate
 *   the numerator the same way a per-page `land` would inflate the denominator;
 * - **the loop**: `stack-shared`, a built stack sent to the X compose window.
 *   The link it posts is tagged `?src=social` (`lib/share.mjs`), so the
 *   visitors it brings back are counted as what they are.
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
  | "compare-built"
  | "hero-stack"
  | "stack-shared";

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
  "hero-stack",
  "stack-shared",
];

/**
 * The events that are also sent to Vercel Web Analytics as custom events.
 *
 * `/signal` writes to the Worker log, which is the right store for the
 * navigation edges and the wrong place to *look* for the funnel: the Vercel
 * dashboard showed "No custom events" while the conversions it would have
 * charted were being recorded one console line at a time. So the funnel, and
 * only the funnel, is mirrored: the denominator (`land`), the three numerators,
 * and the hero's own step. Navigation edges stay in the log, because a custom
 * event per link click would spend the plan's event quota on a number nobody
 * reads from a chart.
 *
 * Nothing new leaves the page. The properties are the same two fields the
 * beacon already carries: a path on this site and the one-word channel.
 */
export const MIRRORED_EVENTS: readonly SignalEvent[] = [
  "land",
  "review",
  "stack-built",
  "compare-built",
  "hero-stack",
  "stack-shared",
];

type VercelQueue = { va?: (...params: unknown[]) => void; vaq?: unknown[][] };

/**
 * Mirror one funnel event to Vercel Web Analytics.
 *
 * ## Why this talks to the queue and does not import `track`
 *
 * `track` from `@vercel/analytics` is, for a client event with two string
 * properties, exactly `window.va?.("event", { name, data })`. Importing it for
 * that cost 0.5 KB on every route (measured: the package's entry point is a
 * second copy of the injector the layout's `<Analytics />` already ships), and
 * it had a bug of ordering besides: with no `window.va` it is a silent no-op.
 * `va` is created by `<Analytics />` in an effect, `land` is sent from an
 * effect too (`ChannelCapture`), and when `land` ran first it was dropped,
 * every time. A funnel with no denominator is not a funnel.
 *
 * So this installs the same stub the library does when none exists (`va`
 * pushes onto `vaq`, which Vercel's script drains once it loads; the library's
 * own `if (window.va) return` then leaves ours alone) and pushes the event.
 * Off Vercel nothing drains the queue and this costs one array push.
 *
 * Guarded like every beacon: analytics may never break the page.
 */
function mirror(event: SignalEvent, to: string, channel: Channel | null): void {
  if (!MIRRORED_EVENTS.includes(event)) return;
  try {
    const w = window as unknown as VercelQueue;
    if (!w.va) {
      w.va = (...params: unknown[]) => {
        (w.vaq ??= []).push(params);
      };
    }
    w.va("event", { name: event, data: { to, channel: channel ?? "unknown" } });
  } catch {
    // No `window`. The Worker log still has the beacon.
  }
}

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
  let channel: Channel | null = null;
  try {
    channel = landingChannel();
    navigator.sendBeacon(
      "/signal",
      JSON.stringify({ event, from: location.pathname, to, channel: channel ?? undefined }),
    );
  } catch {
    // No `sendBeacon`, or a CSP that forbids it. Nothing to do.
  }
  // After, and independent of, the beacon: one failing must not cost the other.
  mirror(event, to, channel);
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
    mirror("land", location.pathname, channel);
  } catch {
    // As above: best-effort.
  }
}
