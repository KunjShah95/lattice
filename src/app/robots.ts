import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * Crawler policy, split by what each bot is actually for.
 *
 * The previous version was `User-Agent: * / Allow: /` with no per-agent rules,
 * on the reasoning that everything here is public anyway. That reasoning is
 * still true, but it conflates two different questions that the major
 * operators split apart:
 *
 *   - will this bot put you in *search answers*?  -> you want this
 *   - will this bot put you in *training data*?   -> you may not
 *
 * OpenAI states the split explicitly: "a webmaster can allow OAI-SearchBot in
 * order to appear in search results while disallowing GPTBot to indicate that
 * crawled content should not be used in training." Anthropic runs three
 * separate bots for the same split. Perplexity states PerplexityBot is "not
 * used to crawl content for AI foundation models."
 *
 * So: allow everything that produces citations, block everything that only
 * consumes. That is not spiteful — Lattice's editorial voice *is* the asset.
 * A ranking of 112 tools ordered by a stated method is the product, and
 * training on it without attribution or link is the one failure mode that
 * genuinely costs something.
 *
 * The blocking half also costs nothing measurable. Of the AI traffic that
 * fetches llms.txt across large samples, training crawlers outnumber retrieval
 * bots — and training crawlers do not produce citations. Blocking them removes
 * volume, not rankings.
 *
 * THE PART THAT ACTUALLY MATTERS: robots.txt is not the whole story. A bot
 * allowed here and blocked at the CDN — or simply not allow-listed by IP — is
 * invisible in every dashboard and loses citations permanently. Audit your
 * Cloudflare WAF rules and server logs for 403/429 responses by user-agent
 * before trusting this file. The two layers have to agree, and a mismatch is
 * the single most common cause of lost AI visibility.
 *
 * Verify IP ranges against each operator's published JSON, which changes:
 *   openai.com/searchbot.json · claude.com/crawling/bots.json
 *   docs.perplexity.ai/guides/bots
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Retrieval and search — these decide whether the site appears in an
        // AI answer at all.
        userAgent: [
          "OAI-SearchBot",
          "ChatGPT-User",
          "Claude-SearchBot",
          "Claude-User",
          "PerplexityBot",
          "Perplexity-User",
          // Google-Extended is not training-only: Google documents it as the
          // control for grounding in Gemini Apps and Vertex AI as well, so
          // blocking it removes the site from Gemini's cited answers. AI
          // Overviews use Googlebot and are unaffected either way.
          "Google-Extended",
          "DuckAssistBot",
          "MistralAI-User",
        ],
        allow: "/",
      },
      {
        // Training and dataset crawlers — no commercial benefit to Lattice,
        // and the reasoning above is the justification.
        userAgent: [
          "GPTBot",
          "ClaudeBot",
          "Applebot-Extended",
          "CCBot",
          "Bytespider",
          "meta-externalagent",
          "cohere-ai",
          "Amazonbot",
          "Diffbot",
        ],
        disallow: "/",
      },
      {
        // Everything else, including search engines and browsers.
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}