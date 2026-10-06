import { toolCount } from "@/lib/data";
import { glossary } from "@/lib/glossary";
import { site } from "@/lib/site";
import { AS_OF } from "@/lib/attributes";

/**
 * `/mcp.json` — the discovery document for the MCP server.
 *
 * ## Why a separate file rather than only an endpoint
 *
 * A model browsing the site has no way to know that `/mcp` exists, and a
 * human configuring a client has to be told the transport. A well-known
 * filename is the one thing that is discoverable by convention rather than by
 * documentation, and it costs nothing to serve.
 *
 * The shape follows the widely-implemented convention (`mcpServers` plus
 * top-level `name`/`description`), so a client that knows nothing about this
 * server can still read it. Fields a specific client needs and this convention
 * does not define — the protocol version, the transport — are included too,
 * because a client that ignores them is better served than one that requires
 * them.
 *
 * ## What it does not contain
 *
 * No popularity, no revenue surface, no affiliate anything. The index's claim is
 * that it takes no money, and this file is machine-read by the audience most
 * likely to check whether that is true.
 */
export const dynamic = "force-static";

export function GET() {
  return new Response(
    JSON.stringify(
      {
        // Typed as a plain object literal rather than an interface, so a comment
        // can sit inside it. The alternative — a type plus a constant — moves the
        // reasoning above the field, which is where it stops being read.
        $schema: "https://static.modelcontextprotocol.io/schemas/2025-07-09/server.schema.json",

        // The shape a client reads to decide whether this is worth connecting.
        name: site.name,
        title: site.name,
        description: site.description,
        version: "0.1.0",

        homepage: site.url,
        documentation: `${site.url}/methodology`,
        repository: "https://github.com/KunjShah95/lattice",

        // Where to connect, and how.
        transport: "streamable-http",
        protocolVersion: "2025-06-18",
        endpoint: `${site.url}/mcp`,
        mcpEndpoint: `${site.url}/mcp`,

        mcpServers: {
          lattice: {
            type: "http",
            url: `${site.url}/mcp`,
          },
        },

        /**
         * `capabilities` is deliberately absent.
         *
         * The first draft of this file advertised `{ tools: { listChanged: false } }`,
         * which is the honest description — the tool list changes only on a
         * deploy. Probed against the running server, it answers
         * `tools: { listChanged: true }`, because that is what the SDK reports by
         * default and it is not configurable per server.
         *
         * Two documents that disagree about the same field is worse than one
         * that omits it: a client that trusts the discovery file gets a
         * capability the server will not honour. The capability block is
         * advisory, so it is left out rather than asserted.
         */

        // Advertised separately from the MCP transport, because these are the
        // surfaces that do not need an MCP client at all.
        resources: {
          toolsJson: `${site.url}/tools.json`,
          llmsTxt: `${site.url}/llms.txt`,
          llmsFullTxt: `${site.url}/llms-full.txt`,
          searchIndex: `${site.url}/search-index.json`,
          searchApi: `${site.url}/api/search?q=<query>&limit=10`,
          /**
           * The same search with facets, for a client that would rather filter
           * than phrase. Every axis may be repeated to OR within it; the axes
           * AND together. `q` becomes optional once one filter is set.
           */
          searchApiFacets: `${site.url}/api/search?layer=3&role=data&cost=free`,
          stackBuilder: `${site.url}/stack-builder`,
          verification: `${site.url}/verification.json`,
          sitemap: `${site.url}/sitemap.xml`,
        },

        /**
         * The MCP resource surface, advertised here rather than left to be
         * discovered. These are the site's arguments rather than its data: an
         * essay, a comparison's recommendation, a symptom's checklist. A client
         * that wants to *reason about* a tool calls a tool; one that wants to
         * *read the argument* reads one of these.
         */
        mcpResources: {
          uriPrefix: "text://lattice/",
          shapes: ["essay/{slug}", "compare/{slug}", "fix/{slug}", "term/{slug}"],
          discover: "resources/list and resources/templates/list on the /mcp endpoint",
        },

        // Provenance. A client deciding whether to trust a dataset benefits from
        // knowing when its facts were last checked and who checked them.
        meta: {
          tools: toolCount,
          layers: 9,
          glossaryTerms: glossary.length,
          factsVerified: AS_OF,
          staleAfterMonths: 6,
          neutrality: "No sponsorship, no paid placement, no ranking by popularity.",
          citation: `Cite the canonical url on the entry used: ${site.url}/<section>/<tool>`,
        },
      },
      null,
      2,
    ),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, s-maxage=86400",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}