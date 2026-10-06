import { buildIndex, searchTools } from "@/lib/search";
import { buildSearchEntries } from "@/lib/search-entries";
import {
  FILTER_KEYS,
  filterVocabulary,
  hasAnyFilter,
  matchesFilters,
  parseFilters,
  type EntryFilters,
} from "@/lib/search-filters";
// `.mjs` stated, matching `app/signal/route.ts` — `moduleResolution: "bundler"`
// will not resolve `@/lib/rate-limit` onto the file.
import { isRateLimited, retryAfterSeconds } from "@/lib/rate-limit.mjs";
import { site } from "@/lib/site";

/**
 * GET /api/search — the directory index as a plain query API.
 *
 * The same ranked search the palette and the MCP `search_tools` tool run,
 * for crawlers and agents that speak HTTPS but not MCP: `GET
 * /api/search?q=vector+database&limit=10` returns JSON with absolute URLs.
 *
 * ## Facets
 *
 * `layer`, `section`, `role`, `kind`, `deployment` and `cost` filter the
 * result set, with the same vocabulary the MCP `search_tools` tool accepts —
 * repeat a key to OR within it, and the axes AND together. This was the gap
 * between the two surfaces: an agent with an MCP client could ask "free,
 * self-hosted, layer 3" and an agent without one could not ask it at all,
 * because the query string was the only filter and the only field it read was
 * the query. The plain-HTTPS caller is the majority, so the weaker surface was
 * the one most people got.
 *
 * Filtering is applied to the *index* before ranking rather than to the ranked
 * results, so `limit` still means "the best N that match every filter" rather
 * than "the best N, then filtered down to however many survived". The two
 * differ whenever a filter is selective, which is exactly when it is used.
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
const entries = buildSearchEntries();
const index = buildIndex(entries);

// The legal values per axis, derived from the corpus rather than restated here.
// A hand-copied list is a list that goes stale the next time a tool is added —
// and it would go stale silently, because an unknown value would filter
// everything out and return an empty result that looks like "no matches"
// rather than "you passed nonsense".
const VOCABULARY = filterVocabulary(entries);

function clampLimit(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(n)));
}

/** Echo the filters that were actually applied, so a response is self-describing. */
function appliedFilters(filters: EntryFilters) {
  const out: Record<string, string[]> = {};
  for (const key of FILTER_KEYS) {
    const set = filters[key];
    if (set?.size) out[key] = [...set].sort();
  }
  return out;
}

/**
 * Values the caller asked for that the corpus does not contain.
 *
 * Worth returning rather than dropping: `?cost=fre` (a typo) otherwise returns
 * zero results, which reads as "nothing matches" rather than "that value does
 * not exist". The vocabulary is in the response either way, so a caller can
 * correct itself without a second request.
 */
function unrecognised(filters: EntryFilters) {
  const out: Record<string, string[]> = {};
  for (const key of FILTER_KEYS) {
    const set = filters[key];
    if (!set?.size) continue;
    const known = new Set(
      (VOCABULARY[key as keyof typeof VOCABULARY] as string[]) ?? [],
    );
    const bad = [...set].filter((v) => !known.has(v)).sort();
    if (bad.length) out[key] = bad;
  }
  return out;
}

export function GET(req: Request) {
  /**
   * Unlike `/signal`, a 429 here rather than a silent success: this route's caller
   * is a program that can act on being told. `/signal` answers 204 on rejection
   * because a visible failure would show up in the analytics it exists to
   * produce, and there is nobody to inform.
   */
  if (isRateLimited(req)) {
    return Response.json(
      {
        error: "Too many requests.",
        retryAfterSeconds: retryAfterSeconds(),
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds()),
          "Access-Control-Allow-Origin": "*",
          // Must not be edge-cached, or one client's refusal is served to others.
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const params = new URL(req.url).searchParams;
  const q = (params.get("q") ?? "").trim();
  const filters = parseFilters(params);
  const filtering = hasAnyFilter(filters);

  // `q` is required only when nothing is filtered. With a filter the caller has
  // already said what shape they want — `?role=platform&cost=free` is a complete
  // question — and insisting on a keyword as well would make browse-by-facet
  // impossible over HTTPS, which is the one thing this route is for.
  if (!q && !filtering) {
    return Response.json(
      {
        error: 'Missing required query parameter "q".',
        usage: "/api/search?q=vector+database&limit=10",
        // Same key as the success response, so a client reads the vocabulary
        // from one place regardless of which branch it got.
        acceptedFilterValues: VOCABULARY,
        filterNote:
          "Any filter may be repeated to OR within an axis; the axes AND together. " +
          "A query is optional once at least one filter is set.",
      },
      { status: 400 },
    );
  }

  // Filter the pool, then rank inside it. `searchTools` takes the index it was
  // given, so filtering here rather than after is what makes `limit` mean what
  // a caller reads it to mean.
  const pool = filtering
    ? index.filter((row) => matchesFilters(row.entry, filters))
    : index;

  const results = searchTools(pool, q, clampLimit(params.get("limit"))).map(
    (e) => ({
      kind: e.kind,
      name: e.name,
      blurb: e.blurb,
      category: e.categoryTitle,
      url: `${site.url}${e.href}`,
      ...(e.external ? { external: e.external } : {}),
    }),
  );

  const bad = unrecognised(filters);

  return Response.json(
    {
      query: q,
      ...(filtering ? { filters: appliedFilters(filters) } : {}),
      ...(Object.keys(bad).length ? { unrecognisedFilterValues: bad } : {}),
      count: results.length,
      // Present only when a filter was applied, so an unfiltered response is
      // byte-identical to what this route returned before facets existed.
      ...(filtering ? { acceptedFilterValues: VOCABULARY } : {}),
      results,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=86400",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}
