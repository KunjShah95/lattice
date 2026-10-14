import type { NextConfig } from "next";
import path from "node:path";
import createMDX from "@next/mdx";
import { allTools } from "./src/lib/data";
import { glossaryLinkMap } from "./src/lib/glossary";
import { CANONICAL_ORIGIN } from "./src/lib/origin.mjs";

/**
 * Tool names and glossary terms mentioned in essay prose are linked to their
 * page on this site. Both lists come straight from the dataset, so a tool or
 * term added there becomes linkable with no second edit and no chance of drift.
 */
const linkableTools = allTools.map((entry) => ({
  name: entry.name,
  href: `/${entry.category.slug}/${entry.slug}`,
}));

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    // The plugin is referenced by absolute path rather than imported: Next's
    // MDX loader serialises its options to reach build workers, and a function
    // is not serialisable. The options object is plain data, so this passes and
    // the worker imports the module itself.
    remarkPlugins: [
      [
        path.resolve(process.cwd(), "src/lib/remark-link-tools.mjs"),
        { tools: linkableTools, terms: glossaryLinkMap },
      ],
    ],
    // Gives every h2/h3 an id at compile time, so the contents rail and `#section`
    // links work in the prerendered HTML. Same reason as above for the path: the
    // loader serialises options and cannot carry a function.
    rehypePlugins: [path.resolve(process.cwd(), "src/lib/rehype-heading-ids.mjs")],
  },
});

/**
 * Vercel preview deployments (`VERCEL_ENV=preview`) are for reviewing a branch,
 * not for search. They are left reachable on their `*.vercel.app` address and
 * marked noindex; every other build folds legacy hosts onto the canonical one.
 */
const isPreview = process.env.VERCEL_ENV === "preview";

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],

  /**
   * All traffic on one host.
   *
   * The site has been served from the Cloudflare `workers.dev` subdomain and
   * from Vercel's `*.vercel.app` aliases. Any request arriving on one of those
   * is sent to the same path on https://lattice.kunjshah.in with a 308 — the
   * permanent redirect that search engines treat as "move every signal here",
   * and that keeps the method and query string intact (a shared Stack Builder
   * link survives the hop). Matched on the Host header, so requests already on
   * the canonical host, and localhost, never match.
   */
  async redirects() {
    if (isPreview) return [];
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "(?<legacy>.+\\.(?:workers\\.dev|vercel\\.app))" }],
        destination: `${CANONICAL_ORIGIN}/:path*`,
        permanent: true,
      },
    ];
  },

  /**
   * llms.txt v2 link relations.
   *
   * v2 of the spec (llmstxt.org, revised August 2026) adds standard `Link`
   * relations on top of the file itself:
   *
   *   Link: </llms.txt>; rel="describedby"
   *
   * meaning "an agent reading this page should read that llms.txt to
   * understand what this site contains". It is the one genuinely new
   * mechanism the spec added, and it is standards-based rather than
   * speculative — which matters, because the evidence on llms.txt generally is
   * that almost nothing fetches the file. Across several large log studies the
   * overwhelming majority of llms.txt requests come from SEO auditors and
   * scanners rather than from assistants, and Google's own guidance states
   * plainly that Search ignores the file.
   *
   * So this is not a citation play and should not be sold as one. It is
   * declared because it is cheap, it is the current spec, and the audience
   * here includes coding agents reading the machine-readable surfaces — the
   * one measured consumer of llms.txt. Being on the current version of the
   * convention costs nothing; being absent from it would be a visible gap in a
   * category that has converged on shipping the file.
   *
   * Deliberately NOT added: a `.md` mirror of each page. A controlled
   * experiment found static markdown twins receive zero visits and zero
   * citations while the HTML originals were read normally, because the largest
   * AI reader fetches rendered HTML only. Serving a second copy of 358 pages
   * would double the surface for no measured gain.
   *
   * Excluded by scoping the pattern to paths with no extension, which keeps
   * the header off every static asset in `_next/static` (a `.js` there would
   * be cache-poisoned by an extra header) and off the machine-readable routes
   * themselves — `/llms.txt`, `/feed.xml`, `/robots.txt`, `/sitemap.xml`,
   * `/search-index.json`. `next`'s `missing` matcher cannot express "not this
   * route"; its `type` is limited to header, cookie, host and query, so the
   * extension test is the available lever.
   */
  async headers() {
    return [
      /**
       * Baseline security headers, on every response.
       *
       * These were set by nothing: Cloudflare's `public/_headers` only covers
       * cache control, and Vercel ignores that file entirely. None of them can
       * break a page here — there are no iframes to allow, no camera or
       * location use, and every asset is same-origin or https.
       *
       * No Content-Security-Policy yet, deliberately. The theme script, the
       * JSON-LD blocks and both analytics beacons are inline or third-party,
       * so a CSP needs nonces threaded through the layout. A wrong CSP breaks
       * the page for every visitor; a missing one costs a header grade.
       */
      {
        source: "/:path*",
        headers: [
          // Two years, the HSTS preload-list minimum. No `includeSubDomains`:
          // this host is itself a subdomain and has none of its own.
          { key: "Strict-Transport-Security", value: "max-age=63072000" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
          },
        ],
      },
      /**
       * Machine-readable documents, readable cross-origin.
       *
       * `tools.json`, `mcp.json` and `/api/search` already send this from their
       * route handlers. These are the rest of the surfaces agents and
       * browser-based tools fetch: without the header, a fetch from any other
       * origin (an in-browser agent, a playground, a notebook UI) is refused by
       * the browser even though the file is public.
       */
      {
        source: "/:file(llms\\.txt|llms-full\\.txt|feed\\.xml|sitemap\\.xml|robots\\.txt|search-index\\.json|verification\\.json)",
        headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
      },
      // Keep preview deployments out of every index, so they never compete
      // with the canonical host for the same content.
      ...(isPreview
        ? [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }]
        : []),
      {
        source: "/:path((?!.*\\.).*)",
        headers: [
          {
            key: "Link",
            value: '</llms.txt>; rel="describedby"',
          },
        ],
      },
    ];
  },
};

export default withMDX(nextConfig);
