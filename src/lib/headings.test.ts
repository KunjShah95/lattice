import { describe, expect, it } from "vitest";
import { essayBodies } from "@/content/essay-text.generated";
import { createSlugger, slugify } from "./heading-slug.mjs";
import rehypeHeadingIds from "./rehype-heading-ids.mjs";
import { essayHeadings, headingsOf } from "./headings";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Where to start")).toBe("where-to-start");
    expect(slugify("Keep the provider behind an interface, not behind a hard choice")).toBe(
      "keep-the-provider-behind-an-interface-not-behind-a-hard-choice",
    );
  });

  it("drops apostrophes rather than splitting on them", () => {
    expect(slugify("Don't route on vibes")).toBe("dont-route-on-vibes");
    expect(slugify("Don’t")).toBe("dont");
  });

  it("strips accents and punctuation, and trims stray hyphens", () => {
    expect(slugify("Café: a  test?!")).toBe("cafe-a-test");
    expect(slugify("--Edge--")).toBe("edge");
  });

  it("never returns an empty id", () => {
    expect(createSlugger()("???")).toBe("section");
  });
});

describe("createSlugger", () => {
  it("suffixes repeats in document order so no two headings share an id", () => {
    const s = createSlugger();
    expect([s("Examples"), s("Examples"), s("Other"), s("Examples")]).toEqual([
      "examples",
      "examples-1",
      "other",
      "examples-2",
    ]);
  });
});

describe("headingsOf", () => {
  it("lists h2 headings in order with their ids", () => {
    expect(headingsOf("intro\n\n## One\n\ntext\n\n## Two words\n")).toEqual([
      { id: "one", text: "One" },
      { id: "two-words", text: "Two words" },
    ]);
  });

  it("leaves h3 out of the list but still lets it bump a later h2's suffix", () => {
    const md = "## A\n\n### Same\n\n## Same\n";
    expect(headingsOf(md)).toEqual([
      { id: "a", text: "A" },
      // The h3 took `same`, so the h2 is `same-1` — exactly what the plugin stamps.
      { id: "same-1", text: "Same" },
    ]);
  });

  it("ignores a heading-shaped line inside a fenced code block", () => {
    const md = "## Real\n\n```bash\n## not a heading\n```\n\n## Also real\n";
    expect(headingsOf(md).map((h) => h.text)).toEqual(["Real", "Also real"]);
  });

  it("removes inline Markdown the renderer would have consumed", () => {
    const md = "## The `escalation` *trap* and [a link](/x)\n";
    expect(headingsOf(md)).toEqual([
      { id: "the-escalation-trap-and-a-link", text: "The escalation trap and a link" },
    ]);
  });

  it("is empty when there are no headings", () => {
    expect(headingsOf("just prose")).toEqual([]);
  });
});

describe("essayHeadings against the real essays", () => {
  const slugs = Object.keys(essayBodies);

  it("finds headings in every essay", () => {
    expect(slugs.length).toBeGreaterThan(5);
    for (const s of slugs) expect(essayHeadings(s).length, s).toBeGreaterThan(0);
  });

  it("gives every heading a unique, URL-safe id", () => {
    for (const s of slugs) {
      const ids = essayHeadings(s).map((h) => h.id);
      expect(new Set(ids).size, s).toBe(ids.length);
      for (const id of ids) expect(id, `${s}#${id}`).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("leaves no Markdown syntax in a heading's text", () => {
    for (const s of slugs) {
      for (const h of essayHeadings(s)) expect(h.text, `${s}: ${h.text}`).not.toMatch(/[`*_[\]]/);
    }
  });

  it("is empty for an unknown essay rather than throwing", () => {
    expect(essayHeadings("no-such-essay")).toEqual([]);
  });
});

describe("rehypeHeadingIds", () => {
  type Node = {
    type: string;
    tagName?: string;
    value?: string;
    properties?: Record<string, unknown>;
    children?: Node[];
  };
  const text = (value: string): Node => ({ type: "text", value });
  const el = (tagName: string, children: Node[], properties: Record<string, unknown> = {}): Node => ({
    type: "element",
    tagName,
    properties,
    children,
  });
  const run = (tree: Node) => {
    (rehypeHeadingIds() as (t: Node) => void)(tree);
    return tree;
  };

  it("stamps an id on h2 and h3, from their text", () => {
    const tree = el("div", [el("h2", [text("Where to start")]), el("h3", [text("A detail")])]);
    run(tree);
    expect(tree.children![0].properties).toMatchObject({ id: "where-to-start" });
    expect(tree.children![1].properties).toMatchObject({ id: "a-detail" });
  });

  it("reads text through nested elements such as inline code", () => {
    const tree = el("div", [el("h2", [text("The "), el("code", [text("retry")]), text(" storm")])]);
    run(tree);
    expect(tree.children![0].properties).toMatchObject({ id: "the-retry-storm" });
  });

  it("leaves other elements alone", () => {
    const tree = el("div", [el("p", [text("Not a heading")]), el("h1", [text("Title")])]);
    run(tree);
    expect(tree.children![0].properties).toEqual({});
    expect(tree.children![1].properties).toEqual({});
  });

  it("keeps a hand-set id and still stops a generated one colliding with it", () => {
    const tree = el("div", [el("h2", [text("Pinned")], { id: "pinned" }), el("h2", [text("Pinned")])]);
    run(tree);
    expect(tree.children![0].properties).toMatchObject({ id: "pinned" });
    expect(tree.children![1].properties).toMatchObject({ id: "pinned-1" });
  });

  /**
   * The contract this whole feature rests on: the id the plugin stamps on a heading
   * is the id the contents list links to. Same function, same order — checked here
   * against real essay Markdown by building the heading nodes the compiler would.
   */
  it("agrees with the contents list on every id in every real essay", () => {
    for (const [slug, body] of Object.entries(essayBodies)) {
      const nodes: Node[] = [];
      let fenced = false;
      for (const line of body.split(/\r?\n/)) {
        if (/^\s*(```|~~~)/.test(line)) {
          fenced = !fenced;
          continue;
        }
        if (fenced) continue;
        const m = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
        if (m) {
          const plainText = m[2]
            .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
            .replace(/[`*_]/g, "")
            .trim();
          nodes.push(el(m[1] === "##" ? "h2" : "h3", [text(plainText)]));
        }
      }
      const tree = el("div", nodes);
      run(tree);
      const stamped = tree.children!
        .filter((n) => n.tagName === "h2")
        .map((n) => n.properties!.id as string);
      expect(essayHeadings(slug).map((h) => h.id), slug).toEqual(stamped);
    }
  });
});
