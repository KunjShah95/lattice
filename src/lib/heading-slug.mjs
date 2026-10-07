/**
 * One slug function for essay headings, used by two things that must agree.
 *
 * The rehype plugin (`rehype-heading-ids.mjs`) stamps an `id` on every `h2` and `h3`
 * when an essay is compiled, and `headings.ts` lists the same headings for the
 * table of contents. A contents link whose `href` does not match the id on its
 * heading is a link that goes nowhere and looks fine in review, so there is one
 * implementation and both import it — they cannot disagree about how to spell a
 * heading, only about which headings exist, and the browser test checks that.
 *
 * It is a plain `.mjs` with no imports because the compile step loads the plugin by
 * path, outside the app's module graph, and cannot resolve the `@/` alias.
 */

/** "Where to start" -> "where-to-start". ASCII, lowercase, hyphen-separated. */
export function slugify(text) {
  return String(text)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // accents: "café" -> "cafe"
    .toLowerCase()
    .replace(/['’]/g, "") // "don't" -> "dont", not "don-t"
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * A slugger that never returns the same id twice in one document.
 *
 * Two headings called "Examples" must not share an id, or the second one's link
 * scrolls to the first. The suffix scheme (`examples`, `examples-1`) is stable in
 * document order, which is what lets the plugin and the contents list, walking the
 * same headings independently, land on the same ids.
 */
export function createSlugger() {
  const seen = new Map();
  return (text) => {
    const base = slugify(text) || "section";
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n === 0 ? base : `${base}-${n}`;
  };
}
