import { categories, toolCount } from "@/lib/data";
import { posts } from "@/lib/posts";
import { resolvedComparisons } from "@/lib/comparisons";
import { resolvedSymptoms } from "@/lib/symptoms";
import { glossary } from "@/lib/glossary";
import { getSubstitutes } from "@/lib/alternatives";
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
    `Every tool page states what the tool is, when to use it, when to skip it, its licence, cost model and alternatives. The full dataset as plain text: ${site.url}/llms-full.txt — and as JSON, with use/skip, layer, licence and cost as fields: ${site.url}/tools.json`,
    "",
    "## Start here",
    "",
    // Task-keyed rather than taxonomy-keyed, because an agent arriving at this
    // file has a problem, not a browsing intent. Every site that does this
    // well puts a task-keyed section first: it is the difference between an
    // index an agent can use and a sitemap it has to walk.
    `- [${site.url}/methodology] — How entries are selected and checked, the six-month build gate on licence and cost data, and an explicit list of what this index gets wrong.`,
    `- [${site.url}/]#start-here — Two questions that narrow 9 layers to the 3 worth reading first.`,
    `- [${site.url}/fix] — Start from a symptom (slow, expensive, wrong answers, unreliable agent): an ordered checklist through the stack.`,
    `- [${site.url}/compare] — Head-to-head comparisons with a recommendation and the conditions it depends on.`,
    "",
    "## Common tasks",
    "",
    ...resolvedSymptoms.map((s) => `- ${s.title} → ${site.url}/fix/${s.slug}`),
    `- Choosing an inference engine → ${site.url}/compare/inference-runtimes`,
    `- Tracing and eval in one tool → ${site.url}/compare/llm-observability`,
    `- One gateway across many providers → ${site.url}/routing-gateways`,
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
      const subs = getSubstitutes(category.slug, tool.slug);
      const lines_: string[] = [
        `- [${tool.name}](${site.url}/${category.slug}/${tool.slug}) — ${tool.blurb}`,
      ];
      // The substitutes, inline. An agent asked "what is an alternative to X"
      // should not have to fetch a page to find out, and this is the query
      // shape with the best citation behaviour in the category — partly
      // because a vendor can publish it about their own product but not
      // honestly about a competitor's.
      if (subs.length) {
        lines_.push(`  - Use when: ${tool.useWhen}`);
        lines_.push(`  - Skip when: ${tool.skipWhen}`);
        lines_.push(
          `  - Substitutes: ${subs.map((s) => `${s.tool.name} (${s.category.short})`).join(", ")}`,
        );
      }
      lines.push(...lines_);
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
