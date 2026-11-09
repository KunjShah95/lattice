/**
 * Which kind of place a reader arrived from: a closed, coarse vocabulary.
 *
 * ## Why this exists
 *
 * The beacon log records edges (`from` → `to`), which answers "is the wedge
 * being used". It cannot answer the question every directory eventually has to:
 * **which source of traffic actually converts?** The common experience of people
 * running content sites in 2026 is that visitors who click through from an
 * answer engine (ChatGPT, Claude, Perplexity) convert far better than visitors
 * from a social burst, because they arrive mid-decision with a question already
 * asked. Whether that holds here is a measurement, not a belief, and this is the
 * smallest thing that makes it measurable.
 *
 * ## Why a bucket and not the referrer
 *
 * `track-link.tsx` promises the referrer is not sent, and that promise stays.
 * A referrer URL can carry a search query, a private Slack or Notion path, or a
 * forum thread that identifies a person. A bucket from a closed set of five
 * cannot: it is the same kind of value as `event`, and it is validated the same
 * way. Five values times every page is not a fingerprint.
 *
 * - `ai`: an answer engine or chat assistant (AEO / GEO traffic)
 * - `search`: a classic search engine (SEO traffic)
 * - `social`: a feed or community: the short burst a launch post produces
 * - `direct`: no referrer and no campaign tag: typed, bookmarked, or an agent
 * - `referral`: any other site that linked here (a blog, a newsletter, docs)
 *
 * Same-origin referrers return null: an internal hop says nothing about where
 * the reader came from, so the caller keeps whatever it recorded at landing.
 */

export const CHANNELS = ["ai", "search", "social", "direct", "referral"];

/**
 * Hosts are matched as `host === domain || host.endsWith("." + domain)`, so
 * `www.perplexity.ai` matches `perplexity.ai` and `notperplexity.ai` does not.
 *
 * Order matters in one place: `gemini.google.com` is an assistant, and has to
 * be checked before the search rule that claims every `google.*`.
 */
const AI_HOSTS = [
  "chatgpt.com",
  "chat.openai.com",
  "openai.com",
  "claude.ai",
  "perplexity.ai",
  "gemini.google.com",
  "bard.google.com",
  "copilot.microsoft.com",
  "copilot.cloud.microsoft",
  "chat.deepseek.com",
  "chat.mistral.ai",
  "grok.com",
  "meta.ai",
  "you.com",
  "phind.com",
  "poe.com",
  "kimi.com",
  "chat.qwen.ai",
];

const SEARCH_HOSTS = [
  "bing.com",
  "duckduckgo.com",
  "search.yahoo.com",
  "search.brave.com",
  "ecosia.org",
  "kagi.com",
  "startpage.com",
  "qwant.com",
  "baidu.com",
  "naver.com",
  "seznam.cz",
];

/** `google.com`, `google.co.uk`, `google.de`, `yandex.ru`, … */
const SEARCH_PATTERN = /(^|\.)(google|yandex)\.[a-z]{2,3}(\.[a-z]{2})?$/;

const SOCIAL_HOSTS = [
  "t.co",
  "x.com",
  "twitter.com",
  "linkedin.com",
  "lnkd.in",
  "reddit.com",
  "news.ycombinator.com",
  "facebook.com",
  "threads.net",
  "threads.com",
  "bsky.app",
  "mastodon.social",
  "youtube.com",
  "producthunt.com",
  "peerlist.io",
  "dev.to",
  "lobste.rs",
  "discord.com",
  "instagram.com",
];

/**
 * `utm_source` values that mark an AI click-through. ChatGPT appends
 * `utm_source=chatgpt.com` to the links it cites, and several assistants open
 * links with no referrer at all, so without this, AI traffic files as `direct`.
 */
const AI_UTM = /^(chatgpt(\.com)?|openai|claude(\.ai)?|anthropic|perplexity(\.ai)?|gemini|copilot|deepseek|grok|mistral|you\.com|phind)$/i;

/** Bare-word tags that launch posts and badges commonly use for social sources. */
const SOCIAL_UTM = /^(twitter|x|linkedin|reddit|hn|hackernews|producthunt|product_hunt|peerlist|bluesky|bsky|threads|mastodon|youtube|discord|facebook|devto)$/i;

function hostIn(host, list) {
  return list.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

/** Classify a bare hostname. Exported for the tests; callers use `classifyArrival`. */
export function channelForHost(host) {
  if (typeof host !== "string" || host.length === 0) return "direct";
  const h = host.toLowerCase().replace(/\.$/, "");
  if (hostIn(h, AI_HOSTS)) return "ai";
  if (hostIn(h, SEARCH_HOSTS) || SEARCH_PATTERN.test(h)) return "search";
  if (hostIn(h, SOCIAL_HOSTS)) return "social";
  return "referral";
}

/**
 * The channel of a landing, from what the browser knows at that moment.
 *
 * @param {string} referrer `document.referrer` (may be empty)
 * @param {string} search `location.search` (may be empty); `src` and `utm_source` are read
 * @param {string} ownHost `location.hostname`, so internal hops return null
 * @returns {string | null} one of `CHANNELS`, or null for a same-origin hop
 */
export function classifyArrival(referrer, search, ownHost) {
  let params;
  try {
    params = new URLSearchParams(search || "");
  } catch {
    params = new URLSearchParams();
  }

  // An explicit tag on a link this site seeded (`?src=ai` on a link posted
  // into an AI-facing page, `?src=social` on a launch post) is the strongest
  // signal there is: it is a statement, not an inference. Accepted only from the
  // closed set, so an arbitrary value falls through to the rules below rather
  // than inventing a channel.
  //
  // Not for the canonical citation URLs in `llms.txt`, `tools.json` or `/mcp`:
  // every agent that cites Lattice would ship the tag. `04-monetisation.md` §4.
  const src = params.get("src")?.trim().toLowerCase() ?? "";
  if (isChannel(src)) return src;

  // A campaign tag is the next strongest: it survives `noreferrer` links and
  // apps that strip the header, which is most of how AI and social clicks land.
  const utm = params.get("utm_source");
  if (utm && AI_UTM.test(utm.trim())) return "ai";

  let refHost = "";
  if (referrer) {
    try {
      refHost = new URL(referrer).hostname.toLowerCase();
    } catch {
      refHost = "";
    }
  }

  if (refHost && ownHost && refHost === ownHost.toLowerCase()) return null;
  if (refHost) return channelForHost(refHost);

  // No referrer. A tag that is not an AI one still says the click came from
  // somewhere; classify the tag as if it were the host it usually names.
  if (utm) {
    if (SOCIAL_UTM.test(utm.trim())) return "social";
    const tagged = channelForHost(utm.trim().toLowerCase());
    // A bare word ("newsletter", "badge") is not a host, which `channelForHost`
    // files as `referral`: the right answer for a tagged link from anywhere else.
    return tagged === "direct" ? "referral" : tagged;
  }

  return "direct";
}

/** Is this a value the beacon may carry? */
export function isChannel(value) {
  return typeof value === "string" && CHANNELS.includes(value);
}
