import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import mdx from "@mdx-js/rollup";

/**
 * `site.ts` reads NEXT_PUBLIC_* from `process.env`. Vite does not populate
 * process.env from .env files the way Next.js does, so without this the
 * branding tests see the placeholder fallback and fail even when a real
 * domain is configured — which makes the gate meaningless rather than strict.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "NEXT_PUBLIC_");

  return {
    plugins: [
      // posts.ts imports the MDX essays, and the tests assert against their
      // exported frontmatter. Without this, Vite parses .mdx as plain JS and
      // every suite importing posts.ts fails to collect.
      mdx({ remarkPlugins: [] }),
    ],
    define: {
      "process.env.NEXT_PUBLIC_SITE_URL": JSON.stringify(
        env.NEXT_PUBLIC_SITE_URL ?? "",
      ),
      "process.env.NEXT_PUBLIC_COPYRIGHT_HOLDER": JSON.stringify(
        env.NEXT_PUBLIC_COPYRIGHT_HOLDER ?? "",
      ),
      "process.env.NEXT_PUBLIC_CONTACT_EMAIL": JSON.stringify(
        env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
      ),
      "process.env.NEXT_PUBLIC_CONTACT_X": JSON.stringify(
        env.NEXT_PUBLIC_CONTACT_X ?? "",
      ),
    },
    test: {
      include: ["src/**/*.test.ts"],
      environment: "node",
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  };
});