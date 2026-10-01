/**
 * Remark plugin: auto-link references in essay prose to their page here.
 *
 * Essays discuss specific tools and use specific terms by name. Left as plain
 * text, the index gets no inbound links from the pages that argue for it, and
 * a reader who reads a paragraph about prefix caching has no path to the rest
 * of the retrieval section.
 *
 * Deliberately conservative:
 *
 *   - only the FIRST mention of each name per document, so prose does not
 *     become a tag soup
 *   - whole-word, case-sensitive matching
 *   - skips code, inline code, existing links, headings and HTML
 *   - an explicit skip list of names that collide with ordinary prose
 *
 * One plugin, two vocabularies. The two are kept in separate `used` sets and
 * each links at most once, but they share the same conservative behaviour,
 * and having one visitor instead of two keeps the skip rules in one place.
 */

const SKIP_NAMES = new Set([
  // Real tools and terms whose names collide with ordinary prose. Each of these
  // appears in the index, but linking it would link words, not references.
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
  // Glossary terms that are ordinary English, or too generic to auto-link.
  "Hallucination",
  "Distillation",
  "Retrieval",
  "Context",
  "Memory",
  "Tool calling",
]);

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default function remarkAutoLink(options = {}) {
  const tools = (options.tools ?? []).filter(
    (t) => t.name && t.href && !SKIP_NAMES.has(t.name),
  );
  const terms = Object.entries(options.terms ?? {}).filter(
    ([name]) => name && !SKIP_NAMES.has(name),
  );

  if (!tools.length && !terms.length) return () => {};

  /** name -> href, longest name first so overlaps resolve to the longer one. */
  const hrefFor = new Map();
  for (const t of tools) hrefFor.set(t.name, t.href);
  for (const [name, href] of terms) hrefFor.set(name, href);

  const names = [...hrefFor.keys()].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`\\b(${names.map(escapeRegExp).join("|")})\\b`, "g");

  return (tree) => {
    // Separate budgets: a document may mention a tool and a term once each.
    const usedTools = new Set();
    const usedTerms = new Set();

    visit(tree, "text", (node, parent) => {
      if (usedTools.size >= tools.length && usedTerms.size >= terms.length) return;
      const value = node.value;
      if (!value || value.length < 4) return;

      const isTerm = (name) => Object.prototype.hasOwnProperty.call(options.terms ?? {}, name);
      const seen = (name) => (isTerm(name) ? usedTerms : usedTools);

      const nodes = [];
      let last = 0;
      let matched = false;
      const re = new RegExp(pattern.source, "g");

      for (let m; (m = re.exec(value)); ) {
        const name = m[1];
        const href = hrefFor.get(name);
        if (!href || seen(name).has(name)) continue;

        matched = true;
        seen(name).add(name);

        if (m.index > last) {
          nodes.push({ type: "text", value: value.slice(last, m.index) });
        }
        nodes.push({
          type: "link",
          url: href,
          data: { hProperties: { className: ["auto-linked"] } },
          children: [{ type: "text", value: name }],
        });
        last = m.index + name.length;
      }

      if (!matched) return;
      if (last < value.length) {
        nodes.push({ type: "text", value: value.slice(last) });
      }

      const at = parent.children.indexOf(node);
      parent.children.splice(at, 1, ...nodes);
    });
  };
}

/**
 * Depth-first walk, calling `fn` for text nodes and skipping the subtrees
 * where a match would be wrong: a tool name inside a heading, a code sample
 * or an existing link is either noise or already handled.
 */
function visit(node, type, fn) {
  if (!node || !Array.isArray(node.children)) return;
  if (["code", "inlineCode", "link", "heading", "html"].includes(node.type)) {
    return;
  }
  for (const child of [...node.children]) {
    if (child.type === type) fn(child, node);
    else visit(child, type, fn);
  }
}
