import { CHANNELS } from "./channel.mjs";

/**
 * Links this site hands out to be posted somewhere else.
 *
 * ## Why a link needs a tag
 *
 * Three quarters of a month's visitors arrived with no referrer. Some of that
 * is bots, but much of it is the X and LinkedIn apps, which open links in an
 * in-app browser and strip the header: a click on a post we wrote lands as
 * "direct" and the one channel that works reads as the one that does not.
 *
 * `lib/channel.mjs` already trusts an explicit `?src=<channel>` above
 * everything else. What was missing was anything that *wrote* one. This is
 * that: one function that tags a URL, used by the Stack Builder's "Post to X"
 * and by `scripts/share-link.mjs` for links pasted by hand.
 *
 * ## Where a tag must never go
 *
 * Only on a link whose destination channel is known because we are the ones
 * posting it. Never on a canonical URL, in `llms.txt`, `tools.json` or `/mcp`:
 * every agent that cites Lattice would ship the tag, and an AI citation would
 * be counted as whatever the tag said (`strategy/04-monetisation.md` §7a).
 * "Copy link" in the builder stays untagged for the same reason: nobody knows
 * where a copied link will be pasted.
 *
 * Plain `.mjs` with no imports beyond the channel list, so a Node script and
 * a client component can both use it.
 */

/** The query parameter `classifyArrival` reads first. */
export const SOURCE_PARAM = "src";

/**
 * Tag a URL with the channel it is about to be posted to.
 *
 * Accepts an absolute URL or a site-relative path and returns the same kind.
 * An existing `src` is replaced, not duplicated, and the rest of the query
 * (a built stack is nothing but query) is kept in order. Throws on a channel
 * outside the closed set: a typo here would not fail anywhere else, it would
 * just be classified by referrer and silently undo the point of tagging.
 *
 * @param {string} url
 * @param {string} channel one of `CHANNELS`
 * @returns {string}
 */
export function withSource(url, channel) {
  if (!CHANNELS.includes(channel)) {
    throw new Error(`Unknown channel "${channel}". Use one of: ${CHANNELS.join(", ")}.`);
  }
  if (typeof url !== "string" || url === "") throw new Error("A URL or path is required.");
  const absolute = /^https?:\/\//i.test(url);
  if (!absolute && !url.startsWith("/")) {
    throw new Error(`"${url}" is neither an absolute URL nor a path starting with "/".`);
  }
  // A throwaway base makes a relative path parseable; it is stripped again below.
  const parsed = new URL(url, "https://lattice.invalid");
  parsed.searchParams.delete(SOURCE_PARAM);
  parsed.searchParams.append(SOURCE_PARAM, channel);
  return absolute ? parsed.toString() : `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

/**
 * The X compose window, pre-filled. `url` is passed separately from `text`
 * so X shortens it and renders the card, rather than counting it as prose.
 *
 * @param {string} text
 * @param {string} url absolute
 * @returns {string}
 */
export function xIntentUrl(text, url) {
  const params = new URLSearchParams({ text, url });
  return `https://x.com/intent/tweet?${params.toString()}`;
}
