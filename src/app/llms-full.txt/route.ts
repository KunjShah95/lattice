import { categories, getAlternatives, toolCount, toolsByRole } from "@/lib/data";
import { posts } from "@/lib/posts";
import { resolvedComparisons } from "@/lib/comparisons";
import { glossary } from "@/lib/glossary";
import { ROLES, roleTitle } from "@/lib/roles";
import { AS_OF } from "@/lib/attributes";
import { site } from "@/lib/site";
import { openness, toolDefinition } from "@/lib/seo";

/**
 * /llms-full.txt — the whole index as one plain-text document.
 *
 * /llms.txt is the table of contents; this is the book. An agent asked "which
 * inference runtime should I use" can read every tool's use/skip guidance,
 * every comparison table and every glossary definition in a single fetch,
 * without rendering 190 pages. Generated from the same data as the UI, so it
 * cannot drift from what the site says.
 */
export function GET() {
  const lines: string[] = [
    `# ${site.name} — full index`,
    "",
    `> ${site.description}`,
    "",
    `${toolCount} tools across ${categories.length} sections. Facts verified ${AS_OF}.`,
    `Source: ${site.url} — cite tool pages as ${site.url}/<section>/<tool>.`,
    "Listed tools belong to their respective authors.",
    "",
  ];

  for (const category of categories) {
    lines.push(
      `## ${category.title}`,
      "",
      `${site.url}/${category.slug}`,
      "",
      `${category.description} ${category.responsibility}`,
      "",
    );

    for (const tool of category.tools) {
      const alternatives = getAlternatives(category.slug, tool.slug).map(
        (a) => a.tool.name,
      );
      lines.push(
        `### ${tool.name}`,
        "",
        toolDefinition(tool, category),
        "",
        `- Page: ${site.url}/${category.slug}/${tool.slug}`,
        `- Official site: ${tool.url}`,
        `- Kind: ${tool.kind}`,
      );
      if (tool.deployment) lines.push(`- Deployment: ${tool.deployment}`);
      if (tool.license) {
        lines.push(`- Licence: ${tool.license} (${openness(tool.license)})`);
      }
      if (tool.language) lines.push(`- Language: ${tool.language}`);
      lines.push(`- Cost: ${tool.cost}`);
      if (tool.kind !== "reading") {
        lines.push(`- Use it when: ${tool.useWhen}`, `- Skip it when: ${tool.skipWhen}`);
      }
      // The specialisation an agent holding a task would filter by. "I am the
      // platform engineer, what is on my list" is a question this document can
      // now answer without the reader paging through 112 entries.
      lines.push(`- Owned by: ${tool.roles.map((r) => roleTitle(r)).join(", ")}`);
      if (alternatives.length) lines.push(`- Alternatives: ${alternatives.join(", ")}`);
      lines.push("");
    }
  }

  // A role-keyed view of the same entries. The per-tool lines above mean the
  // data is already here; this section exists so an agent can read one role's
  // list in one pass instead of filtering 400 lines by eye.
  lines.push("## By role", "");
  for (const role of ROLES) {
    const owned = toolsByRole(role.id);
    lines.push(
      `### ${role.title} (${owned.length})`,
      "",
      role.owns,
      "",
      `Question it arrives with: ${role.question}`,
      "",
      `${site.url}/roles/${role.id}`,
      "",
      ...owned.map(
        (t) =>
          `- ${t.name} — ${site.url}/${t.category.slug}/${t.slug} (${t.category.title})`,
      ),
      "",
    );
  }

  lines.push("## Comparisons", "");
  for (const c of resolvedComparisons) {
    lines.push(
      `### ${c.title}`,
      "",
      `${site.url}/compare/${c.slug}`,
      "",
      c.intro,
      "",
      `| | ${c.tools.map((t) => t.name).join(" | ")} |`,
      `|---|${c.tools.map(() => "---").join("|")}|`,
      ...c.rows.map(
        (r) => `| ${r.dimension} | ${r.values.map((v) => v.replace(/\|/g, "/")).join(" | ")} |`,
      ),
      "",
      `Recommendation: ${c.verdict}`,
      "",
      ...c.rules.map((r) => `- ${r}`),
      "",
    );
  }

  lines.push("## Glossary", "");
  for (const t of glossary) {
    lines.push(
      `### ${t.term}`,
      "",
      `${site.url}/glossary/${t.slug}`,
      "",
      t.definition,
      "",
      t.detail,
      "",
    );
  }

  lines.push("## Essays", "");
  for (const post of posts) {
    lines.push(
      `- [${post.meta.title}](${site.url}/blog/${post.meta.slug}) (${post.meta.date}) — ${post.meta.description}`,
    );
  }
  lines.push("");

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
