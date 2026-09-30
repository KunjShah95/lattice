import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import mdx from "@mdx-js/rollup";

export default defineConfig({
  plugins: [
    // posts.ts imports the MDX essays, and the tests assert against their
    // exported frontmatter. Without this, Vite tries to parse .mdx as plain
    // JS and every suite importing posts.ts fails to collect.
    mdx({ remarkPlugins: [] }),
  ],
  test: {
    // Unit tests only: these exercise pure data and logic modules, not the
    // Next.js server. There are no component tests yet.
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
