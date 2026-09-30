import { categories, toolCount } from "@/lib/data";
import { site } from "@/lib/site";

/**
 * /llms.txt — a plain-text index of the directory, generated from the same
 * data as the UI so it can never drift out of sync.
 */
export function GET() {
  const lines: string[] = [
    `# ${site.name}`,
    "",
    `> ${site.description}`,
    "",
    `${toolCount} tools across ${categories.length} categories.`,
    "Listed tools belong to their respective authors.",
    "",
  ];

  for (const category of categories) {
    lines.push(`## ${category.title}`, "", category.description, "");
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
