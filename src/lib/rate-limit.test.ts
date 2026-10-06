import { describe, expect, it, beforeEach } from "vitest";
// The extension is stated rather than left to resolution, matching how
// `app/signal/route.ts` and `app/mcp/route.ts` import their sibling `.mjs`
// modules — `moduleResolution: "bundler"` will not map onto it.
import {
  bucketCount,
  clientKey,
  DEFAULT_LIMIT,
  isRateLimited,
  MAX_ENTRIES,
  resetLimiter,
  retryAfterSeconds,
} from "./rate-limit.mjs";

/**
 * Rate limiting for the open endpoints.
 *
 * The bug this guards is the one named in `strategy/04-monetisation.md` §7:
 * an unauthenticated POST endpoint where a well-formed flood writes to the
 * metrics the site publishes. The shape validation in `signal.mjs` cannot help —
 * those beacons are perfectly valid — so the ceiling has to be a count, and a
 * count is worth testing.
 *
 * The per-isolate caveat is documented at length in the module. What is asserted
 * here is that the limiter does what it claims and fails safe, not that it is a
 * global limit, because it is not one.
 */

function req(ip = "203.0.113.1") {
  return new Request("https://example.com/signal", {
    headers: { "CF-Connecting-IP": ip },
  });
}

beforeEach(() => {
  resetLimiter();
});

describe("clientKey", () => {
  it("uses the Cloudflare-set address, which a client cannot forge", () => {
    expect(clientKey(req("198.51.100.7"))).toBe("198.51.100.7");
  });

  it("ignores client-supplied forwarding headers", () => {
    // `X-Forwarded-For` is set by the sender on any origin not behind a proxy
    // that overwrites it. Trusting it would mean the limit is bypassed by adding
    // a header, which is worse than having no limit at all because it looks
    // enforced.
    const spoofed = new Request("https://example.com/signal", {
      headers: { "CF-Connecting-IP": "198.51.100.1", "X-Forwarded-For": "10.0.0.1" },
    });
    expect(clientKey(spoofed)).toBe("198.51.100.1");
  });

  it("buckets anonymous callers together rather than not at all", () => {
    expect(clientKey(new Request("https://example.com/signal"))).toBe("anonymous");
  });
});

describe("isRateLimited", () => {
  it("allows the first request", () => {
    expect(isRateLimited(req())).toBe(false);
  });

  /**
 * 130 requests, because the real budget is 120.
 *
 * Both halves have to be non-zero: a limiter that refused everything would pass
 * an "are any refusals happening" check while breaking every real client, and
 * one that refused nothing would pass a "does the endpoint still work" check
 * while being no protection at all.
 */
it("refuses a flood without refusing everything", () => {
    let accepted = 0;
    let refused = 0;
    for (let i = 0; i < 130; i++) {
      if (isRateLimited(req(), DEFAULT_LIMIT)) refused++;
      else accepted++;
    }
    expect(accepted).toBe(DEFAULT_LIMIT);
    expect(refused).toBe(130 - DEFAULT_LIMIT);
  });

  it("allows exactly the limit, then refuses", () => {
    const limit = 5;
    for (let i = 0; i < limit; i++) {
      expect(isRateLimited(req(), limit), `request ${i + 1}`).toBe(false);
    }
    expect(isRateLimited(req(), limit)).toBe(true);
  });

  it("buckets per client, so one flood does not block everyone", () => {
    for (let i = 0; i < 10; i++) isRateLimited(req("203.0.113.1"), 3);
    expect(isRateLimited(req("203.0.113.1"), 3)).toBe(true);
    expect(isRateLimited(req("203.0.113.2"), 3)).toBe(false);
  });

  it("keeps refusing inside the window, without counting up unbounded", () => {
    // The count saturating matters: a client that keeps hammering must not push
    // the counter toward a number that could overflow or confuse a later read.
    for (let i = 0; i < 50; i++) isRateLimited(req(), 2);
    expect(bucketCount()).toBe(1);
    expect(isRateLimited(req(), 2)).toBe(true);
  });

  it("starts a fresh window once the old one has passed", () => {
    for (let i = 0; i < 3; i++) isRateLimited(req(), 2);
    expect(isRateLimited(req(), 2)).toBe(true);
    // Window is 60s and `Date.now` cannot be moved from here, so this asserts the
    // window maths through `retryAfterSeconds` rather than by waiting a minute.
    expect(retryAfterSeconds(60_000)).toBe(60);
    expect(retryAfterSeconds(1_500)).toBe(2);
  });

  it("has a default budget well above any real client", () => {
    // The palette makes one fetch. If the default were low enough to be
    // noticeable it would break real clients before inconveniencing anyone.
    expect(DEFAULT_LIMIT).toBeGreaterThanOrEqual(100);
  });
});

describe("bounded memory", () => {
  it("caps the number of tracked clients", () => {
    // Without a cap this is a memory leak reachable from one request path: the
    // map is keyed by client identity and an attacker can present unlimited
    // distinct ones.
    expect(MAX_ENTRIES).toBeLessThanOrEqual(50_000);
  });

  it("reports its own size, so the bound is observable", () => {
    resetLimiter();
    expect(bucketCount()).toBe(0);
    isRateLimited(req("203.0.113.1"), 1000);
    isRateLimited(req("203.0.113.2"), 1000);
    expect(bucketCount()).toBe(2);
  });
});