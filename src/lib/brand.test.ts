import { describe, expect, it } from "vitest";
import { site } from "./site";
import { REPO } from "./submissions.mjs";

/**
 * Branding invariants.
 *
 * `site.url` is the root of every canonical, every `og:url` and, because
 * `metadataBase` resolves relative og:image URLs against it: every generated
 * share image on the site. Getting it wrong does not break the build; it
 * publishes 143 correct-looking pages pointing at a domain nobody owns, and
 * every social share of a tool link renders from a URL that 404s.
 */
describe("branding", () => {
  it("does not ship a placeholder domain", () => {
    // Covers the historical `lattice.example` and the `.invalid` fallback that
    // replaced it, plus the generic example.com/org/net family.
    expect(site.url).not.toMatch(/\.(example|invalid|test|localhost)\b/i);
    expect(site.url).not.toMatch(/\bexample\.(com|org|net)\b/i);
    expect(site.url).not.toMatch(/^https?:\/\/(www\.)?\d/);
  });

  it("uses https", () => {
    expect(site.url.startsWith("https://")).toBe(true);
  });

  it("has no trailing slash, so joined paths do not double up", () => {
    expect(site.url.endsWith("/")).toBe(false);
  });

  it("has no placeholder contact details", () => {
    // These ship as real links in the footer. Unset channels are omitted (X)
    // or fall back to the issue tracker (email): never to a dead address.
    expect(site.copyrightHolder).not.toMatch(/your name|todo/i);
    if (site.contact.email) expect(site.contact.email).not.toMatch(/example\.|\.invalid|todo@/i);
    if (site.contact.x) expect(site.contact.x).not.toMatch(/yourhandle|\/todo$/i);
    expect(site.contact.href).not.toMatch(/example\.|\.invalid/i);
  });

  it("names the same entity everywhere it is listed", () => {
    // Organization.sameAs: the launch and the repo must be among them, so a
    // mention on either accrues to this site's entity.
    expect(site.profiles).toContain("https://www.producthunt.com/products/lattice-12");
    expect(site.profiles).toContain(site.repo);
    for (const url of site.profiles) expect(url.startsWith("https://")).toBe(true);
  });

  /**
   * `site.repo` and `submissions.mjs`'s `REPO` were two spellings of one fact:
   * a bare `owner/repo` here and a full URL there. Nothing forced them to agree,
   * so a repo rename that updated one left the other pointing at a 404, and the
   * contact page would offer an issue link that could not receive an issue.
   */
  it("derives the repo URL from the same constant issues are filed against", () => {
    expect(site.repo).toBe(`https://github.com/${REPO}`);
  });

  it("keeps the meta description inside the search-result budget", () => {
    // Search engines truncate around 155-160 characters on desktop and nearer
    // 120 on mobile. Anything past that is written and never seen, so the
    // budget is enforced rather than remembered: the description was 229
    // characters at one point and lost its entire second half.
    const len = [...site.description].length;
    expect(len).toBeLessThanOrEqual(158);
    expect(len).toBeGreaterThan(70); // too short is not a description
  });
});