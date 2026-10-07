import { describe, expect, it } from "vitest";
import { allTools } from "./data";
import { badgeMarkdown, badgeSvg, escapeXml, verifiedBadge } from "./badge";
import { site } from "./site";

describe("escapeXml", () => {
  it("escapes the five XML specials", () => {
    expect(escapeXml(`<a href="x">&'`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&apos;");
  });

  it("escapes ampersands first, so entities are not double-escaped", () => {
    expect(escapeXml("a & <b>")).toBe("a &amp; &lt;b&gt;");
  });
});

describe("badgeSvg", () => {
  const svg = verifiedBadge("2026-09");

  it("states the date it is verified, as visible text and as an accessible name", () => {
    expect(svg).toContain("verified 2026-09");
    expect(svg).toContain('aria-label="lattice: verified 2026-09"');
    expect(svg).toContain("<title>lattice: verified 2026-09</title>");
  });

  it("is a single self-contained image: no external reference of any kind", () => {
    // A README badge is fetched by every page that embeds it, so anything that
    // makes the SVG load something else — an image, a font, a link, a script —
    // turns the badge into a tracking surface. `strategy/04` §4.
    expect(svg).not.toMatch(/<image\b/i);
    expect(svg).not.toMatch(/<script\b/i);
    expect(svg).not.toMatch(/<a\b/i);
    expect(svg).not.toMatch(/xlink:href|href=/i);
    expect(svg).not.toMatch(/@import|url\(/i);
    expect(svg).not.toMatch(/https?:\/\/(?!www\.w3\.org\/2000\/svg)/);
  });

  it("is well-formed enough to open and close its root", () => {
    expect(svg.startsWith("<svg ")).toBe(true);
    expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
  });

  it("escapes anything it is given, rather than trusting the caller", () => {
    const hostile = badgeSvg({ label: "<x>", value: `"&"` });
    expect(hostile).not.toContain("<x>");
    expect(hostile).toContain("&lt;x&gt;");
  });

  it("is wide enough for its text and the width grows with it", () => {
    const short = badgeSvg({ label: "a", value: "b" });
    const long = badgeSvg({ label: "a", value: "a much longer value" });
    const width = (s: string) => Number(/width="(\d+)"/.exec(s)![1]);
    expect(width(long)).toBeGreaterThan(width(short));
    // 17 chars of "verified 2026-09" at the model's advance must fit inside the right half.
    const w = width(svg);
    expect(w).toBeGreaterThan(("lattice".length + "verified 2026-09".length) * 6);
  });

  it("renders for every shipped entry's check date", () => {
    for (const t of allTools) {
      expect(verifiedBadge(t.asOf), t.name).toContain(`verified ${t.asOf}`);
    }
  });
});

describe("badgeMarkdown", () => {
  const md = badgeMarkdown(site.url, "inference-serving", "vllm", "vLLM", "2026-09");

  it("links the badge to the entry it describes", () => {
    expect(md).toBe(
      `[![vLLM on Lattice: verified 2026-09](${site.url}/inference-serving/vllm/badge.svg)](${site.url}/inference-serving/vllm)`,
    );
  });

  it("uses bare canonical paths — no query string, no tracking parameter", () => {
    expect(md).not.toMatch(/[?&](utm_|ref|aff)=/i);
    expect(md).not.toContain("?");
  });
});
