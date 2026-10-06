"use client";

import Link from "next/link";
import { useCallback, type ReactNode } from "react";

/**
 * An internal link that reports where it was clicked from.
 *
 * ## What this is for
 *
 * `strategy/04-monetisation.md` §7 lists two metrics that are not answerable from
 * what the site currently records:
 *
 * - *"Alternatives-page entry"* — `02-unique-selling-points.md` §5 calls
 *   alternatives pages the single biggest lever for a directory, so whether
 *   anyone walks into one is the most important navigation fact here.
 * - *"Comparison-page exits to `/compare/*`"* — whether the cross-layer wedge is
 *   actually being used, which is the claim no funded competitor can occupy.
 *
 * Both need the **source → destination** edge, not just the fact that a page was
 * viewed. Cloudflare logs a `Referer` for every request already, so the data
 * exists — it just cannot be queried from the repository, and correlating referers
 * across two sites (this one and the one that linked here) is guesswork.
 *
 * ## Why a beacon rather than a redirect route
 *
 * The obvious alternative is `/go?to=/compare/x`, which logs and 302s. That was
 * rejected: it puts an extra round trip in front of every internal navigation and
 * turns every internal link into a non-canonical URL for a crawler to resolve.
 * Navigation is the one interaction that must not be made slower.
 *
 * `sendBeacon` is the right tool because it is designed for exactly this — it
 * survives the page unloading, and a failed beacon costs nothing because nobody is
 * waiting.
 *
 * ## What is and is not sent
 *
 * Sent: the two paths, as event and destination. Both are already public URLs.
 *
 * Not sent: referrer, user agent, anything identifying, anything cross-site. There
 * is no session and no cookie, so the log cannot be joined into a profile — which
 * is what makes it safe to keep indefinitely and possible to publish. The
 * alternative to collecting this is a third-party analytics script, which would
 * collect strictly more and send it elsewhere.
 *
 * ## It is best-effort on purpose
 *
 * A tracker that blocks the link it is tracking is worse than no tracker, so
 * `sendBeacon` is called and then navigation proceeds regardless of the outcome.
 * Nothing awaits it. If it fails, one number is missing; if it were awaited, a
 * dropped request would cost a page load.
 */

export type TrackEvent =
  | "alternatives"
  | "compare"
  | "second-home"
  | "tool";

export function TrackLink({
  href,
  event,
  children,
  className,
  title,
  "aria-label": ariaLabel,
}: {
  href: string;
  event: TrackEvent;
  children: ReactNode;
  className?: string;
  title?: string;
  "aria-label"?: string;
}) {
  const onClick = useCallback(() => {
    try {
      // `pathname` from `location` rather than parsing `href`, so a link built
      // from a section slug cannot report a path that does not match where it
      // actually went.
      navigator.sendBeacon("/signal", JSON.stringify({ event, to: location.pathname }));
    } catch {
      // No `sendBeacon` (older browser), or a CSP that forbids it. Either way the
      // link still works, which is the only thing that matters here.
    }
  }, [event]);

  return (
    <Link
      href={href}
      onClick={onClick}
      className={className}
      title={title}
      aria-label={ariaLabel}
    >
      {children}
    </Link>
  );
}