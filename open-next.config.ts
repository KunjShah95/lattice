import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

/**
 * Cloudflare deployment config. Commit this file — `opennextjs-cloudflare`
 * refuses to build without it, and `npx wrangler deploy` will try to
 * *generate* it by running an interactive migrate step, which cannot work in
 * CI. Committing it here is what keeps `npm run deploy` non-interactive.
 *
 * The incremental cache is backed by the Worker's own static-assets binding
 * rather than the R2 bucket the stock template wires up. That is a deliberate
 * choice, not a simplification:
 *
 *   - there is no `revalidate` or ISR anywhere in this app, so an incremental
 *     cache has nothing to store;
 *   - R2 would mean requiring a bucket to exist before the first deploy, which
 *     is the single most common reason a first OpenNext deploy fails;
 *   - the static-assets cache is documented for exactly this case: apps that
 *     do not revalidate and only serve prerendered output.
 *
 * If ISR is ever introduced, switch this to
 * `@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache`
 * and add a `r2_buckets` entry to wrangler.jsonc in the same change.
 *
 * `queue: "direct"` runs revalidation inline instead of via a Cloudflare Queue.
 * It is the right trade while nothing revalidates: it needs no queue binding
 * and no producer/consumer wiring.
 */
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  queue: "direct",
});
