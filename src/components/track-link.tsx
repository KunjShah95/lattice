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
 * Sent: `from` (the page the click happened on) and `to` (the destination), plus
 * the link's kind. Both are already public URLs.
 *
 * **Both ends are required, and that is the whole point.** The first version sent
 * `location.pathname` under the key `to`, which recorded the page you were on and
 * dropped where you went. That silently turns "a comparison link was rendered"
 * into "the wedge is being used" — `kind: "compare"` looked like a comparison exit
 * in the log while carrying no evidence anyone reached a comparison page. It
 * survived a status-only smoke test, which cannot see payload contents, and it
 * survived review, because the `href` is right there in the surrounding markup.
 * Clicking the link in a real browser and reading what went over the wire is what
 * caught it.
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
      // `from` is read from `location`, because it is the page the click happened
      // on — the one thing the href cannot tell us.
      //
      // `to` is resolved against the origin rather than passed through, so the
      // destination is always a bare path. The validator rejects anything not
      // starting with a single slash, and handing it `href` raw would let a future
      // absolute URL quietly produce a beacon that gets silently dropped.
      //
      // Both ends, because the record is an edge. The first version sent only
      // `location.pathname` under the key `to`, which recorded where a reader
      // already was and dropped where they went — so `kind: "compare"` looked
      // like a comparison exit while proving only that a comparison link existed.
      const to = new URL(href, location.origin).pathname;

      navigator.sendBeacon(
        "/signal",
        JSON.stringify({ event, from: location.pathname, to }),
      );
    } catch {
      // No `sendBeacon` (older browser), or a CSP that forbids it. Either way the
      // link still works, which is the only thing that matters here.
    }
  }, [event, href]);

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