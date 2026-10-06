import { buildIndex, searchTools } from "@/lib/search";
import { buildSearchEntries } from "@/lib/search-entries";
import { site } from "@/lib/site";

/**
 * GET /api/search — the directory index as a plain query API.
 *
 * The same ranked search the palette and the MCP `search_tools` tool run,
 * for crawlers and agents that speak HTTPS but not MCP: `GET
 * /api/search?q=vector+database&limit=10` returns JSON with absolute URLs.
 *
 * Reads the query string, so this is dynamic per request rather than a build
 * artefact like the other machine endpoints — but the corpus underneath only
 * changes on a deploy, hence the long edge cache. `limit` clamps to 1–50 so
 * a crawler cannot page the whole index out one giant response at a time;
 * that is what `/tools.json` is for.
 */
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

// Built once per Worker instance. The dataset is static between deploys, so
// rebuilding the lowercased, pre-split index per request would redo identical
// work for an identical result.
const index = buildIndex(buildSearchEntries());

function clampLimit(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(n)));
}

export function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const q = (params.get("q") ?? "").trim();

  if (!q) {
    return Response.json(
      {
        error: 'Missing required query parameter "q".',
        usage: "/api/search?q=vector+database&limit=10",
      },
      { status: 400 },
    );
  }

  const results = searchTools(index, q, clampLimit(params.get("limit"))).map(
    (e) => ({
      kind: e.kind,
      name: e.name,
      blurb: e.blurb,
      category: e.categoryTitle,
      url: `${site.url}${e.href}`,
      ...(e.external ? { external: e.external } : {}),
    }),
  );

  return Response.json(
    { query: q, count: results.length, results },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=86400",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}
