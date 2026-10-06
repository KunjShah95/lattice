import { describe, expect, it } from "vitest";
import robots from "@/app/robots";

/**
 * The robots policy, asserted against the object the route returns.
 *
 * This file exists because the file it covers is a *decision document*. The owner
 * position — everything public is crawlable, including by training crawlers — is
 * the kind of thing that gets quietly narrowed by a later edit made for a reason
 * that seemed local: one group gains a `disallow`, one agent is dropped "temporarily",
 * and every other file that documents the position keeps describing the old one.
 * README lines 809-814 and the header comment in `robots.ts` both state it in prose,
 * and neither of those is checked by anything.
 *
 * The rendering assertion at the end matters because `MetadataRoute.Robots` types
 * `other` as `Record<string, string | number | Array<...>>` and Next passes it
 * through verbatim — a misspelled directive name is a valid value of a valid type
 * and produces a robots.txt no crawler honours, silently.
 */
describe("robots policy", () => {
  const policy = robots();
  const rules = Array.isArray(policy.rules) ? policy.rules : [policy.rules];

  it("allows every agent it names, on every path", () => {
    const restricted: string[] = [];
    for (const rule of rules) {
      const agents = Array.isArray(rule.userAgent) ? rule.userAgent : [rule.userAgent];
      const allow = Array.isArray(rule.allow) ? rule.allow : [rule.allow];
      if (!allow.includes("/")) restricted.push(agents.join(","));
      if (rule.disallow) restricted.push(`${agents.join(",")} disallows ${rule.disallow}`);
    }
    expect(restricted).toEqual([]);
  });

  /**
   * The training crawlers are the half of this policy that looks wrong without the
   * context. They are allowed deliberately, so the assertion is that they are
   * *present and allowed* — not merely absent from a disallow list, which is what a
   * reader skimming the file would assume.
   */
  it("allows the training crawlers by name", () => {
    const training = rules.find((r) =>
      (Array.isArray(r.userAgent) ? r.userAgent : [r.userAgent]).includes("GPTBot"),
    );
    expect(training).toBeDefined();
    expect(training?.allow).toBe("/");
    expect(training?.disallow).toBeUndefined();
  });

  it("states a usage position on every group", () => {
    // Per-group rather than once under `*`: REP selects the most specific matching
    // group and ignores the others, so a signal published only under `*` never
    // reaches GPTBot, which matches the training group. That is the failure mode
    // this assertion exists to prevent.
    const missing = rules
      .filter((r) => !r.other || !r.other["Content-Signal"])
      .map((r) => (Array.isArray(r.userAgent) ? r.userAgent : [r.userAgent]).join(","));
    expect(missing).toEqual([]);
  });

  it("states the all-permissive position the owner actually holds", () => {
    // Every category `yes`, matching the decision recorded in the robots.ts header.
    // A `no` here would be a real policy change and should fail loudly rather than
    // ride in on a formatting edit.
    for (const rule of rules) {
      expect(rule.other?.["Content-Signal"]).toBe(
        "search=yes, ai-input=yes, ai-train=yes, use=reference",
      );
    }
  });

  it("renders directives verbatim, so a misspelling cannot ship silently", () => {
    // What Next emits, reproduced from `resolve-route-data.js`: `User-Agent` lines
    // first, then allow/disallow/crawl-delay, then each `other` key in insertion
    // order. Asserting the exact line is what makes the previous test meaningful —
    // `other` is unvalidated, so only the output proves the directive is real.
    const content = rules
      .flatMap((rule) => {
        const agents = Array.isArray(rule.userAgent) ? rule.userAgent : [rule.userAgent];
        const lines = agents.map((a) => `User-Agent: ${a}`);
        for (const a of Array.isArray(rule.allow) ? rule.allow : [rule.allow]) {
          lines.push(`Allow: ${a}`);
        }
        for (const [key, value] of Object.entries(rule.other ?? {})) {
          for (const v of Array.isArray(value) ? value : [value]) lines.push(`${key}: ${v}`);
        }
        return lines;
      })
      .join("\n");

    expect(content).toContain(
      "Content-Signal: search=yes, ai-input=yes, ai-train=yes, use=reference",
    );
    // Casing is asserted rather than waved at: a lowercased `content-signal` is what
    // a lookup-key refactor would produce, and the exact form above is the one every
    // published example of the directive uses. Scoped to a lowercase match, because
    // the canonical spelling contains the lowercase substring itself.
    expect(content).not.toMatch(/\bcontent-signal/);
  });

  it("publishes the sitemap and the host", () => {
    expect(policy.sitemap).toMatch(/^https:\/\/.+\/sitemap\.xml$/);
    expect(policy.host).toMatch(/^https:\/\//);
  });
});