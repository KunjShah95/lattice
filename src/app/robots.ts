import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * Crawler policy: everything public is crawlable by every bot, including AI
 * training crawlers.
 *
 * This used to split bots by purpose — retrieval bots allowed, training bots
 * (GPTBot, ClaudeBot, CCBot and company) disallowed — on the reasoning that
 * training on the index without attribution costs something real. The site
 * owner has decided the other way: maximum AI visibility everywhere, and
 * training inclusion is part of that. If that decision ever flips, the split
 * to restore is documented in git history: retrieval/search bots
 * (OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot,
 * Perplexity-User, Google-Extended, DuckAssistBot, MistralAI-User) are what
 * put the site in cited answers; training crawlers (GPTBot, ClaudeBot,
 * Applebot-Extended, CCBot, Bytespider, meta-externalagent, cohere-ai,
 * Amazonbot, Diffbot) only feed datasets.
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
        // AI retrieval and search — these decide whether the site appears in
        // an AI answer at all.
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
        // AI training and dataset crawlers — explicitly allowed per the owner
        // decision above: everything public here may be crawled for any
        // purpose, training included.
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
        allow: "/",
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