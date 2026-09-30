import { describe, expect, it } from "vitest";
import { breadcrumbJsonLd, toJsonLd } from "./jsonld";

/**
 * JSON-LD is injected into a <script> block. Without escaping, a string
 * containing "</script>" would close the block early and turn the rest of the
 * payload into markup. Everything we serialise is our own content today, but
 * the class of bug is worth closing permanently.
 */

describe("toJsonLd", () => {
  it("produces valid JSON", () => {
    expect(() => JSON.parse(toJsonLd({ a: 1, b: "two" }))).not.toThrow();
  });

  it("round-trips values unchanged", () => {
    const input = { name: "vLLM", n: 3, ok: true, list: ["a", "b"] };
    expect(JSON.parse(toJsonLd(input))).toEqual(input);
  });

  it("escapes a closing script tag", () => {
    const out = toJsonLd({ x: "</script><img src=x onerror=alert(1)>" });
    expect(out).not.toContain("</script>");
    expect(out).toContain("\\u003c");
  });

  it("escapes every angle bracket, so no tag can be formed", () => {
    const out = toJsonLd({ x: "<b>bold</b>" });
    expect(out).not.toMatch(/[<>]/);
  });

  it("escapes ampersands, keeping entities from forming", () => {
    expect(toJsonLd({ x: "a & b" })).toContain("\\u0026");
  });

  it("leaves ordinary content readable", () => {
    const out = toJsonLd({ description: "A plain sentence." });
    expect(out).toContain("A plain sentence.");
  });

  it("handles an empty object", () => {
    expect(JSON.parse(toJsonLd({}))).toEqual({});
  });

  it("handles arrays and nested objects", () => {
    const input = { "@context": "https://schema.org", itemListElement: [{ position: 1 }] };
    expect(JSON.parse(toJsonLd(input))).toEqual(input);
  });
});

describe("breadcrumbJsonLd", () => {
  it("numbers the crumbs from one", () => {
    const data = breadcrumbJsonLd([{ name: "Index", path: "/" }], "https://x.test");
    expect(data.itemListElement[0].position).toBe(1);
  });

  it("joins the site url to each path", () => {
    const data = breadcrumbJsonLd(
      [
        { name: "Index", path: "/" },
        { name: "Blog", path: "/blog" },
      ],
      "https://x.test",
    );
    expect(data.itemListElement.map((c) => c.item)).toEqual([
      "https://x.test/",
      "https://x.test/blog",
    ]);
  });

  it("declares the schema type", () => {
    const data = breadcrumbJsonLd([{ name: "Index", path: "/" }], "https://x.test");
    expect(data["@type"]).toBe("BreadcrumbList");
    expect(data["@context"]).toBe("https://schema.org");
  });
});
