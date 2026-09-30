import { categories, toolCount } from "@/lib/data";
import { posts } from "@/lib/posts";
import { resolvedComparisons } from "@/lib/comparisons";
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

  for (const category of categories) {
    lines.push(`## ${category.title}`, "", category.responsibility, "");
    for (const tool of category.tools) {
      lines.push(`- [${tool.name}](${tool.url}) — ${tool.blurb}`);
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
