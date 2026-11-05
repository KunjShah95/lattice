import { describe, expect, it } from "vitest";
import { askLinks, askPrompt } from "@/components/ask-ai";

describe("ask an AI about this page", () => {
  const url = "https://lattice.kunjshah.in/compare/vector-databases";
  const links = askLinks(url);

  it("offers each assistant once", () => {
    expect(links.map((l) => l.name)).toEqual([
      "ChatGPT",
      "Claude",
      "Perplexity",
      "Google AI Mode",
      "Grok",
    ]);
  });

  it("prefills the same prompt, naming the page and asking for a citation", () => {
    expect(askPrompt(url)).toContain(url);
    expect(askPrompt(url)).toMatch(/Cite the page/);
    for (const l of links) {
      const q = new URL(l.href).searchParams.get("q");
      expect(q, l.name).toBe(askPrompt(url));
    }
  });

  it("links only over https, with the prompt fully encoded", () => {
    for (const l of links) {
      expect(l.href.startsWith("https://"), l.name).toBe(true);
      // An unencoded space or second "?" would truncate the question.
      expect(l.href.split("?").length, l.name).toBe(2);
      expect(l.href, l.name).not.toMatch(/\s/);
    }
  });
});
