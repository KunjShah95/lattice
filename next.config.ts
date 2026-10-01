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
  },
});

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
};

export default withMDX(nextConfig);
