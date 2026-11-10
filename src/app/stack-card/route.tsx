import { ImageResponse } from "next/og";
import { OG_FONTS, OG_SIZE, StackCard } from "@/lib/og";
import { isRateLimited } from "@/lib/rate-limit.mjs";
import { site } from "@/lib/site";
import { stackCardData } from "@/lib/stack-card";
import { stackInputFromSearch } from "@/lib/stack-url";

/**
 * The share card for any stack a reader has built: `/stack-card?workload=rag&q=...`,
 * the same query the builder reads.
 *
 * ## Why this one is rendered on request
 *
 * Every other card on the site is prerendered, and `route-metadata.test.ts`
 * insists on it: `lib/og.tsx` reads its fonts from disk, and a Cloudflare Worker
 * has no disk, so a card rendered there is a 500. That is workable for a card per
 * page. It cannot work here, because the set of stacks a reader can build is
 * unbounded: there is no list to prerender.
 *
 * So this route is for runtimes that can read the fonts (Vercel's Node functions,
 * or any `next start`), and it says so plainly instead of failing: with no fonts
 * it answers 404, and `/stack-builder/share` only points at it when
 * `perCaseCardsEnabled()` is true, falling back to the prerendered default card
 * everywhere else. A shared link therefore always has a working image; on some
 * runtimes it is the generic one.
 *
 * ## Why it is safe to leave open
 *
 * Anyone can ask for any query string, and a render costs real CPU, so:
 * - an invalid case is a 404 and renders nothing;
 * - the input goes through the same `stackInputFromSearch` the builder uses, so
 *   unknown parameters are ignored and two spellings of one case are one image;
 * - the rate limiter the beacon route uses applies here too (per isolate, the
 *   same caveat as there: a real limit is a dashboard rule);
 * - the response is cacheable at the CDN for a day, so a link that is shared
 *   widely renders once.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (OG_FONTS.length === 0) {
    return new Response("Stack cards need font files this runtime cannot read.", { status: 404 });
  }
  if (isRateLimited(request)) {
    return new Response(null, { status: 429, headers: { "Retry-After": "60" } });
  }

  const input = stackInputFromSearch(new URL(request.url).search);
  if (!input) return new Response("Not a stack.", { status: 404 });

  return new ImageResponse(
    <StackCard
      card={stackCardData(input)}
      siteName={site.name}
      siteHost={site.url.replace(/^https?:\/\//, "")}
    />,
    {
      ...OG_SIZE,
      fonts: OG_FONTS,
      // Not the library's one-year `immutable`: the same query draws a different
      // stack after a dataset update, so a day at the edge and a week of
      // stale-while-revalidate is as long as a card should be believed.
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
