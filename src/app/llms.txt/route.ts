import { categories, toolCount } from "@/lib/data";
import { posts } from "@/lib/posts";
import { resolvedComparisons } from "@/lib/comparisons";
import { glossary } from "@/lib/glossary";
import { site } from "@/lib/site";

/**
 * /llms.txt — a plain-text index of the directory, its comparisons and its
 * essays, generated from the same data as the UI so it can never drift.
 */
export function GET() {
  const lines: string[] = [
    `# ${site.name}`,
    "",
    `> ${site.description}`,
    "",
    `${toolCount} tools across ${categories.length} sections, ${resolvedComparisons.length} comparisons, and ${posts.length} essays.`,
    "Listed tools belong to their respective authors.",
    "",
    `Every tool page states what the tool is, when to use it, when to skip it, its licence, cost model and alternatives. The full dataset as plain text: ${site.url}/llms-full.txt`,
    "",
    "## Essays",
    "",
  ];

  for (const post of posts) {
    lines.push(
      `- [${post.meta.title}](${site.url}/blog/${post.meta.slug}) — ${post.meta.dek}`,
    );
  }
  lines.push("");

  lines.push("## Comparisons", "");
  for (const c of resolvedComparisons) {
    lines.push(
      `- [${c.title}](${site.url}/compare/${c.slug}) — ${c.verdict}`,
    );
  }
  lines.push("");

  lines.push("## Glossary", "");
  for (const t of glossary) {
    lines.push(`- [${t.term}](${site.url}/glossary/${t.slug}) — ${t.definition}`);
  }
  lines.push("");

  for (const category of categories) {
    lines.push(
      `## [${category.title}](${site.url}/${category.slug})`,
      "",
      category.responsibility,
      "",
    );
    // Link to the Lattice page, not the vendor: that is where the use/skip
    // guidance lives, and it is the page worth citing. The vendor URL is one
    // click from it.
    for (const tool of category.tools) {
      lines.push(
        `- [${tool.name}](${site.url}/${category.slug}/${tool.slug}) — ${tool.blurb}`,
      );
    }
    lines.push("");
  }

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
