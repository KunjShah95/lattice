import { describe, expect, it } from "vitest";
import { CHANNELS, channelForHost, classifyArrival, isChannel } from "./channel.mjs";

/**
 * The landing-channel classifier.
 *
 * Every value it returns ends up in a public log, read to answer "which source
 * of traffic converts". A wrong bucket is invisible in production: an AI
 * click-through filed as `direct` simply looks like nobody arrived from AI. So
 * these tests pin the cases that are easy to get wrong silently.
 */

const OWN = "lattice.kunjshah.in";

describe("classifyArrival", () => {
  it("files answer engines as ai", () => {
    for (const ref of [
      "https://chatgpt.com/",
      "https://chat.openai.com/c/abc",
      "https://claude.ai/chat/xyz",
      "https://www.perplexity.ai/search?q=vector+db",
      "https://gemini.google.com/app",
      "https://copilot.microsoft.com/",
    ]) {
      expect(classifyArrival(ref, "", OWN), ref).toBe("ai");
    }
  });

  it("trusts ChatGPT's utm_source when the referrer is stripped", () => {
    // The case this module exists for: ChatGPT cites links with
    // `utm_source=chatgpt.com` and frequently arrives with no referrer at all.
    // Without this, the highest-intent traffic would read as `direct`.
    expect(classifyArrival("", "?utm_source=chatgpt.com", OWN)).toBe("ai");
    expect(classifyArrival("", "?utm_source=perplexity", OWN)).toBe("ai");
  });

  it("does not let gemini.google.com fall into the google search rule", () => {
    expect(classifyArrival("https://gemini.google.com/", "", OWN)).toBe("ai");
    expect(classifyArrival("https://www.google.com/", "", OWN)).toBe("search");
  });

  it("files search engines, including country domains, as search", () => {
    for (const ref of [
      "https://www.google.co.uk/",
      "https://www.google.de/",
      "https://www.bing.com/search?q=x",
      "https://duckduckgo.com/",
      "https://search.brave.com/",
      "https://yandex.ru/",
    ]) {
      expect(classifyArrival(ref, "", OWN), ref).toBe("search");
    }
  });

  it("files feeds and communities as social", () => {
    for (const ref of [
      "https://t.co/abc",
      "https://www.linkedin.com/feed/",
      "https://old.reddit.com/r/LocalLLaMA",
      "https://news.ycombinator.com/item?id=1",
      "https://www.producthunt.com/products/lattice",
    ]) {
      expect(classifyArrival(ref, "", OWN), ref).toBe("social");
    }
    expect(classifyArrival("", "?utm_source=twitter", OWN)).toBe("social");
  });

  it("files an empty referrer with no tag as direct", () => {
    expect(classifyArrival("", "", OWN)).toBe("direct");
    expect(classifyArrival(undefined, undefined, OWN)).toBe("direct");
  });

  it("files any other site, or an unknown tag, as referral", () => {
    expect(classifyArrival("https://someones-blog.dev/post", "", OWN)).toBe("referral");
    expect(classifyArrival("", "?utm_source=newsletter", OWN)).toBe("referral");
  });

  it("returns null for an internal hop, so the landing is not overwritten", () => {
    expect(classifyArrival(`https://${OWN}/all`, "", OWN)).toBeNull();
  });

  it("does not match a lookalike domain", () => {
    // `endsWith("perplexity.ai")` alone would accept this.
    expect(channelForHost("notperplexity.ai")).toBe("referral");
    expect(channelForHost("chatgpt.com.evil.example")).toBe("referral");
  });

  it("survives a malformed referrer", () => {
    expect(classifyArrival("not a url", "", OWN)).toBe("direct");
  });

  it("only ever returns a value from the closed set", () => {
    for (const ref of ["https://x.com/", "", "https://a.b/", "https://claude.ai/"]) {
      const c = classifyArrival(ref, "?utm_source=whatever", OWN);
      expect(c === null || CHANNELS.includes(c)).toBe(true);
    }
  });
});

describe("isChannel", () => {
  it("accepts the five and nothing else", () => {
    for (const c of CHANNELS) expect(isChannel(c)).toBe(true);
    for (const bad of ["AI", "", "email", null, 1, undefined]) expect(isChannel(bad)).toBe(false);
  });
});
