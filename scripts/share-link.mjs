#!/usr/bin/env node
/**
 * Tag a link before posting it, so the click is counted under the right channel.
 *
 *   npm run share -- /blog/continuous-batching-from-first-principles
 *   npm run share -- "/stack-builder?workload=rag&q=200000" social
 *   npm run share -- /start referral
 *
 * Prints the absolute, tagged URL and nothing else, so it can be piped to a
 * clipboard. The channel defaults to `social`, because that is where almost
 * every link posted by hand goes.
 *
 * Why this exists: the X and LinkedIn apps strip the referrer, so an untagged
 * link from a post lands as "direct" and the post looks like it did nothing.
 * See `src/lib/share.mjs` for the rule on where a tag must never be put.
 */
import { resolveSiteUrl } from "../src/lib/origin.mjs";
import { withSource } from "../src/lib/share.mjs";

// The same resolution the site uses for its canonicals, so a tagged link can
// never point at a host the site would not call its own.
const SITE = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

const [target, channel = "social"] = process.argv.slice(2);

if (!target) {
  console.error("Usage: npm run share -- <path-or-url> [ai|search|social|direct|referral]");
  process.exit(1);
}

try {
  const absolute = /^https?:\/\//i.test(target) ? target : `${SITE}${target.startsWith("/") ? "" : "/"}${target}`;
  console.log(withSource(absolute, channel));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
