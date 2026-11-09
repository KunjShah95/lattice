"use client";

import Link from "next/link";
import { useCallback, useEffect, type ReactNode } from "react";
import { captureLanding, sendSignal, type SignalEvent } from "@/lib/beacon";

/**
 * An internal link that reports where it was clicked from.
 *
 * ## What this is for
 *
 * `strategy/04-monetisation.md` §7 lists two metrics that are not answerable from
 * what the site currently records:
 *
 * - *"Alternatives-page entry"*: `02-unique-selling-points.md` §5 calls
 *   alternatives pages the single biggest lever for a directory, so whether
 *   anyone walks into one is the most important navigation fact here.
 * - *"Comparison-page exits to `/compare/*`"*, whether the cross-layer wedge is
 *   actually being used, which is the claim no funded competitor can occupy.
 *
 * Both need the **source → destination** edge, not just the fact that a page was
 * viewed. Cloudflare logs a `Referer` for every request already, so the data
 * exists: it just cannot be queried from the repository, and correlating referers
 * across two sites (this one and the one that linked here) is guesswork.
 *
 * ## Why a beacon rather than a redirect route
 *
 * The obvious alternative is `/go?to=/compare/x`, which logs and 302s. That was
 * rejected: it puts an extra round trip in front of every internal navigation and
 * turns every internal link into a non-canonical URL for a crawler to resolve.
 * Navigation is the one interaction that must not be made slower.
 *
 * `sendBeacon` is the right tool because it is designed for exactly this: it
 * survives the page unloading, and a failed beacon costs nothing because nobody is
 * waiting.
 *
 * ## What is and is not sent
 *
 * Sent: `from` (the page the click happened on) and `to` (the destination), plus
 * the link's kind. Both are already public URLs.
 *
 * **Both ends are required, and that is the whole point.** The first version sent
 * `location.pathname` under the key `to`, which recorded the page you were on and
 * dropped where you went. That silently turns "a comparison link was rendered"
 * into "the wedge is being used"`kind: "compare"` looked like a comparison exit
 * in the log while carrying no evidence anyone reached a comparison page. It
 * survived a status-only smoke test, which cannot see payload contents, and it
 * survived review, because the `href` is right there in the surrounding markup.
 * Clicking the link in a real browser and reading what went over the wire is what
 * caught it.
 *
 Also sent, when known: `channel`, one word from a closed set of five (`ai`,
 * `search`, `social`, `direct`, `referral`) naming the *kind* of place the reader
 * landed from. It is classified in the browser by `lib/channel.mjs` and is the
 * only way to ask the log which source of traffic converts (does a reader who
 * arrived from an AI answer book a review more often than one from a launch
 * post?). The referrer itself never leaves the page.
 *
 * Not sent: referrer, user agent, anything identifying, anything cross-site. There
 * is no cookie and no identifier, so the log cannot be joined into a profile, which
 * is what makes it safe to keep indefinitely and possible to publish. The landing
 * channel is remembered in `sessionStorage` for the tab, because the referrer is
 * gone after the first full page load; it never leaves the browser except as that
 * one word. The alternative to collecting this is a third-party analytics script,
 * which would collect strictly more and send it elsewhere.
 *
 * ## It is best-effort on purpose
 *
 * A tracker that blocks the link it is tracking is worse than no tracker, so
 * `sendBeacon` is called and then navigation proceeds regardless of the outcome.
 * Nothing awaits it. If it fails, one number is missing; if it were awaited, a
 * dropped request would cost a page load.
 */

/** Events a link can report. Completion events are sent by the tools themselves. */
export type TrackEvent = Extract<
  SignalEvent,
  "alternatives" | "compare" | "second-home" | "tool" | "outbound" | "review"
>;

/**
 * Classify the landing once per tab, and send the `land` beacon the first
 * time: the denominator every conversion rate divides by. Mounted once, in the
 * root layout, so a reader who never clicks anything is still counted.
 * Renders nothing; see `lib/beacon.ts`.
 */
export function ChannelCapture() {
  useEffect(() => {
    captureLanding();
  }, []);
  return null;
}

export function TrackLink({
  href,
  event,
  children,
  className,
  title,
  target,
  rel,
  "aria-label": ariaLabel,
}: {
  href: string;
  event: TrackEvent;
  children: ReactNode;
  className?: string;
  title?: string;
  target?: string;
  rel?: string;
  "aria-label"?: string;
}) {
  const onClick = useCallback(() => {
    try {
      // `from` is read from `location` by `sendSignal`, because it is the page
      // the click happened on: the one thing the href cannot tell us.
      //
      // `to` is resolved against the origin rather than passed through, so the
      // destination is always a bare path. The validator rejects anything not
      // starting with a single slash, and handing it `href` raw would let a future
      // absolute URL quietly produce a beacon that gets silently dropped.
      //
      // "outbound" is the one event that points off-site on purpose (the tool's
      // own homepage), so it sends the hostname instead of a path: the validator
      // in `signal.mjs` branches on `event` the same way.
      //
      // Both ends, because the record is an edge. The first version sent only
      // `location.pathname` under the key `to`, which recorded where a reader
      // already was and dropped where they went, so `kind: "compare"` looked
      // like a comparison exit while proving only that a comparison link existed.
      const to =
        event === "outbound" ? new URL(href).hostname : new URL(href, location.origin).pathname;
      sendSignal(event, to);
    } catch {
      // A malformed href. The link still works, which is the only thing that matters.
    }
  }, [event, href]);

  return (
    <Link
      href={href}
      onClick={onClick}
      className={className}
      title={title}
      target={target}
      rel={rel}
      aria-label={ariaLabel}
    >
      {children}
    </Link>
  );
}