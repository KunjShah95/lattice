import type { NextConfig } from "next";
import path from "node:path";
import createMDX from "@next/mdx";
import { allTools } from "./src/lib/data";

/**
 * Tool names mentioned in essay prose are linked to their page in this index.
 * The list comes straight from the dataset, so a tool added to data.ts is
 * linkable in the essays with no second edit and no chance of drift.
 */
const linkableTools = allTools.map((entry) => ({
  name: entry.name,
  href: `/${entry.category.slug}/${entry.slug}`,
}));

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    // The plugin is referenced by absolute path, not imported: Next's MDX
    // loader serialises its options to reach build workers, and a function is
    // not serialisable. The options object is plain data, so this passes, and
    // the worker imports the module itself.
    remarkPlugins: [
      [path.resolve(process.cwd(), "src/lib/remark-link-tools.mjs"), { tools: linkableTools }],
    ],
  },
});

const nextConfig: NextConfig = {
  // Favicons were deliberately dropped from tool rows (see tool-row.tsx), so
  // there are no remote image patterns to allow here.
  pageExtensions: ["ts", "tsx", "md", "mdx"],
};

export default withMDX(nextConfig);
