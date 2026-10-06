import { describe, expect, it } from "vitest";
import { categories } from "./data";
import { toolCount } from "./data";
import { AS_OF } from "./attributes";
import { site } from "./site";
import { about, TOOL_DESCRIPTIONS } from "./mcp";

/**
 * The neutrality guard.
 *
 * `strategy/04-monetisation.md` §4 states a rule in prose — no monetised URL in
 * the machine-readable routes — and says it is cheap to enforce in a test
 * because the leak would otherwise happen by accident rather than by decision.
 * This is that test. It exists because the whole neutrality claim rests on
 * readers believing it, and a reader who finds a referral link inside the
 * citation feed has been told a different thing by the site itself.
 *
 * The failure it guards is not hypothetical in shape: `Tool.url` is a single
 * field consumed by the tool page, the explorer, `tools.json` and every text
 * feed, so a one-line change to it monetises all of them at once, silently.
 */

describe("no monetised URL in a machine-readable route", () => {
  it("every tool domain is bare, with no query string or tracking parameter", () => {
    // The shape of the leak: `Tool.url` is built from a bare host, and adding a
    // parameter to it monetises the tool page, the flat explorer, `/tools.json`
    // and both text feeds in one edit.
    const offenders: string[] = [];
    for (const c of categories) {
      for (const t of c.tools) {
        if (t.url.includes("?")) offenders.push(`${t.name}: ${t.url}`);
        if (!t.url.startsWith("https://")) offenders.push(`${t.name}: not https`);
        // A referral parameter is the common case, but any query string is
        // suspect enough on a citation feed to be worth a build failure.
        if (/[?&](utm_|ref|aff|affiliate|via)=/i.test(t.url)) {
          offenders.push(`${t.name}: tracking parameter`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the citation instruction names a canonical path, not a tracking URL", () => {
    // `llms.txt` tells an agent exactly what to cite. If that string ever
    // acquires a parameter, every agent that follows it ships a referral link in
    // an answer about which vendor to trust — which is the single worst place
    // for one.
    expect(about().citation).toBe(
      `Cite the canonical url on the entry you used: ${site.url}/<section>/<tool>`,
    );
    expect(about().citation).not.toMatch(/[?&]/);
  });

  it("states the neutrality claim in the payload a model reads", () => {
    // `/mcp` is the surface most likely to be read by a machine and least
    // likely to be read by a human, so the claim has to be in it.
    expect(about().neutrality).toMatch(/sells nothing|takes no sponsorship/);
    expect(about().neutrality).not.toMatch(/[?&](utm_|ref|aff)=/i);
  });

  it("every canonical URL the dataset publishes is a bare path under the origin", () => {
    const offenders: string[] = [];
    for (const c of categories) {
      for (const t of c.tools) {
        const canonical = `${site.url}/${c.slug}/${t.slug}`;
        if (/[?&]/.test(canonical)) offenders.push(canonical);
      }
    }
    expect(offenders).toEqual([]);
    // Sanity: the loops above iterate a populated list, so an empty dataset
    // would pass them vacuously.
    expect(toolCount).toBeGreaterThan(100);
  });
});

describe("the neutrality claim stays true", () => {
  it("still says there is no sponsorship, with a matching verification date", () => {
    // A revenue model that made this false would be a change of strategy, not a
    // copy edit — `strategy/04-monetisation.md` §6 lists the rewrites it would
    // require. Asserted together because the pair is what a reader checks.
    expect(about().neutrality).toBeTruthy();
    expect(about().factsVerified).toBe(AS_OF);
  });

  it("no result shape carries a field a revenue model could rank on", () => {
    // `sponsored`, `featured` and `partner` are the three shapes a directory
    // grows when money arrives. None belongs in a machine-readable payload,
    // because a model given an ordered list repeats the order as a finding.
    const payloads = JSON.stringify([
      TOOL_DESCRIPTIONS,
      about(),
      categories.map((c) => ({ slug: c.slug, title: c.title, role: c.role })),
    ]);
    for (const banned of ["sponsored", "featured", "partner", "affiliate"]) {
      expect(payloads.toLowerCase(), `payload mentions "${banned}"`).not.toContain(banned);
    }
  });
});