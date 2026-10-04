import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import mdx from "@mdx-js/rollup";

/**
 * `site.ts` reads NEXT_PUBLIC_* from `process.env`. Vite does not populate
 * process.env from .env files the way Next.js does, so without this the
 * branding tests see the placeholder fallback and fail even when a real
 * domain is configured — which makes the gate meaningless rather than strict.
 *
 * ## The trap this creates
 *
 * Reading `.env.local` means a developer's machine and CI see **different
 * values**. Locally `site.url` is a real domain; in CI it is the placeholder,
 * because `.env.local` is gitignored and the Branding step is gated on a
 * repository variable that skips itself when unset. So a test that passes on
 * every laptop and fails on every push is not a flake — it is a test that
 * quietly depends on configuration its author never had to think about. Four URL
 * tests did exactly that and broke three consecutive pushes.
 *
 * Two rules follow, both learned the hard way:
 *
 * 1. **Resolve against `site.url`, never against the raw env var.** `site.ts`
 *    guarantees an origin that is always present and always https, so
 *    `new URL(path, site.url)` is safe in both environments. Reading
 *    `process.env.NEXT_PUBLIC_SITE_URL` directly, or asserting on
 *    `absolute()` output with a hardcoded domain, re-couples the suite to
 *    configuration. Whether the origin is a *real* domain rather than the
 *    placeholder is `brand.test.ts`'s job, asserted in exactly one place.
 * 2. **Put a regression test for a CI-only failure in a suite CI actually
 *    runs.** CI excludes `brand.test.ts`, so a guard proven only there is
 *    unproven in the configuration that needs it. `seo.test.ts` holds the
 *    empty-origin test for that reason.
 *
 * To reproduce CI locally: move `.env.local` aside, then
 * `npx vitest run --exclude src/lib/brand.test.ts`.
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