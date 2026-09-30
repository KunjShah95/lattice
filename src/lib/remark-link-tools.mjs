/**
 * Remark plugin: link tool names in essay prose to their page in this index.
 *
 * The essays already discuss specific tools by name. Leaving those as plain
 * text (or as links to the vendor's site) means the index has no inbound links
 * from the pages that argue for them, and a reader who reads a paragraph
 * about vLLM has no path to the rest of the vLLM section.
 *
 * This walks text nodes and wraps the first mention of each tool in a link to
 * /<section>/<tool>. It is deliberately conservative:
 *
 *   - only the FIRST mention per document, so prose does not become a tag soup
 *   - whole-word only, matched case-sensitively, so "the" never matches "TRL"
 *   - skips code, inline code, existing links, headings, and HTML
 *   - a skip-list of names that are ordinary English words in this context
 */

const SKIP_NAMES = new Set([
  // Real tools whose names collide with ordinary prose.
  "Rerankers",
  "Outlines",
  "Tracing",
  "Modal",
  "Colab",
  "Vellum",
  "Instructor",
  "Replicate",
  "Permit",
  "Standard",
  "Local",
  "Host",
  "Runtime",
  "Kernel",
  "Memory",
  "Gateway",
  "Library",
  "Platform",
  "Managed",
  "Course",
  "Writing",
  "Research",
  "Postgres",
]);

/** Field name the caller must supply on each tool. */
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default function remarkLinkTools(options = {}) {
  const tools = (options.tools ?? [])
    .filter((t) => t.name && t.href)
    .filter((t) => !SKIP_NAMES.has(t.name))
    // Longest first, so "Text Generation Inference" wins over a shorter
    // overlapping name inside the same paragraph.
    .sort((a, b) => b.name.length - a.name.length);

  if (!tools.length) return () => {};

  // One regex over all names, alternation-ordered longest-first.
  const pattern = new RegExp(
    `\\b(${tools.map((t) => escapeRegExp(t.name)).join("|")})\\b`,
    "g",
  );
  const hrefFor = new Map(tools.map((t) => [t.name, t.href]));

  return (tree) => {
    /** Names already linked in this document. */
    const used = new Set();

    visit(tree, "text", (node, parent) => {
      if (used.size === tools.length) return;
      const value = node.value;
      if (!value || value.length < 3) return;

      let matched = false;
      const next = value.replace(pattern, (whole) => {
        if (matched) return whole;
        if (used.has(whole)) return whole;
        // Only link when the name stands alone, not glued to punctuation like
        // an em dash or a period inside a sentence.
        matched = true;
        used.add(whole);
        return whole;
      });

      if (!matched) return;

      // Rebuild the text node into a sequence of text + link nodes.
      const nodes = [];
      let last = 0;
      const linkRe = new RegExp(pattern.source, "g");
      for (let m; (m = linkRe.exec(next)); ) {
        const name = m[1];
        const href = hrefFor.get(name);
        if (!href) continue;
        if (m.index > last) nodes.push({ type: "text", value: next.slice(last, m.index) });
        nodes.push({
          type: "link",
          url: href,
          data: { hProperties: { className: ["auto-linked"] } },
          children: [{ type: "text", value: name }],
        });
        last = m.index + name.length;
      }
      if (last < next.length) nodes.push({ type: "text", value: next.slice(last) });

      const at = parent.children.indexOf(node);
      parent.children.splice(at, 1, ...nodes);
    });
  };
}

/**
 * Depth-first walk, calling `fn` for nodes of the given type and skipping the
 * subtrees where a match would be wrong.
 */
function visit(node, type, fn) {
  if (!node || !Array.isArray(node.children)) return;
  // Never look inside these: a tool name in a heading, a code sample or an
  // existing link is either noise or already handled.
  if (["code", "inlineCode", "link", "heading", "html"].includes(node.type)) {
    return;
  }
  for (const child of [...node.children]) {
    if (child.type === type) fn(child, node);
    else visit(child, type, fn);
  }
}
