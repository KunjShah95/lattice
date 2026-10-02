import { buildSearchEntries } from "@/lib/search-entries";

/**
 * /search-index.json — the palette's corpus, fetched the first time the
 * reader opens search rather than inlined into every page.
 *
 * Prerendered at build time. It reads no request data, so `force-static` just
 * states the intent explicitly and guarantees the response is a build artefact
 * rather than something the Worker recomputes per request. The index only
 * changes when the dataset does, which is a deploy.
 *
 * `s-maxage=31536000` matches every other prerendered response on this site.
 * The filename is not hashed, so a browser holding a copy revalidates rather
 * than serving it blindly — which is the correct trade for a file this size
 * that most visitors never request at all.
 */
export const dynamic = "force-static";

export function GET() {
  return new Response(JSON.stringify(buildSearchEntries()), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, s-maxage=31536000",
    },
  });
}
