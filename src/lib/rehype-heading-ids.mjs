import { createSlugger } from "./heading-slug.mjs";

/**
 * Rehype plugin: give every `h2` and `h3` in an essay an `id`.
 *
 * MDX does not add them, so a heading had no address: no deep link, no contents
 * entry that could scroll to it. Done at compile time rather than in the browser so
 * the anchors exist in the prerendered HTML — a shared `#where-to-start` link works
 * with JavaScript off, and a crawler sees the same fragment targets a reader does.
 *
 * Walks the tree itself instead of depending on `unist-util-visit`: the node shape
 * needed is two fields, and an extra dependency in the compile path is a thing that
 * can break a build for a reason unrelated to the content.
 *
 * Headings that already carry an id are left alone, so an essay can pin one by
 * hand, but they still reserve their id with the slugger so a generated one cannot
 * collide with it.
 */

/** Concatenated text of a node and everything under it — `code`, `em` and all. */
function textOf(node) {
  if (node.type === "text") return node.value;
  return (node.children ?? []).map(textOf).join("");
}

export default function rehypeHeadingIds() {
  return (tree) => {
    const slug = createSlugger();

    const walk = (node) => {
      if (node.type === "element" && (node.tagName === "h2" || node.tagName === "h3")) {
        const existing = node.properties?.id;
        // Reserve a hand-set id so a generated one cannot collide with it; the
        // slugger returns its input unchanged the first time it sees a base.
        const id = typeof existing === "string" && existing ? existing : slug(textOf(node));
        if (typeof existing === "string" && existing) slug(existing);
        node.properties = { ...(node.properties ?? {}), id };
      }
      for (const child of node.children ?? []) walk(child);
    };

    walk(tree);
  };
}
