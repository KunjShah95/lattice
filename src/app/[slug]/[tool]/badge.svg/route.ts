import { allTools, getTool } from "@/lib/data";
import { verifiedBadge } from "@/lib/badge";

/**
 * /<section>/<tool>/badge.svg — the "verified" badge for one entry.
 *
 * Prerendered for every tool, like every other route family here: the Worker has
 * no disk and no reason to compute a constant string per request. The badge shows
 * the entry's own `asOf`, so re-verifying an entry updates every README that
 * embeds it on the next deploy.
 *
 * Deliberately sets nothing but a content type and a cache lifetime — no cookie,
 * no `Set-Cookie`, no header read. A badge is fetched by every page that embeds
 * it, which makes it the highest-volume URL this site could ever serve and the
 * worst place for anything that identifies a reader. See `lib/badge.ts`.
 */
export const dynamic = "force-static";

export function generateStaticParams() {
  return allTools.map((entry) => ({ slug: entry.category.slug, tool: entry.slug }));
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; tool: string }> },
) {
  const { slug, tool } = await params;
  const found = getTool(slug, tool);
  if (!found) return new Response("Not found", { status: 404 });

  return new Response(verifiedBadge(found.tool.asOf), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // A day, not a year: the date inside changes when the entry is re-verified,
      // and a README should not show a stale month for long after.
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
      // An SVG served from a content-addressable path can be opened directly;
      // `sandbox` stops any script that ever found its way in from running.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
