import type { NextConfig } from "next";
import path from "node:path";
import createMDX from "@next/mdx";
import { allTools } from "./src/lib/data";
import { glossaryLinkMap } from "./src/lib/glossary";

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

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],

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
