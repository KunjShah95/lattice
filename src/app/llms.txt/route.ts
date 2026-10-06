import { categories, toolCount } from "@/lib/data";
import { posts } from "@/lib/posts";
import { resolvedComparisons } from "@/lib/comparisons";
import { resolvedSymptoms } from "@/lib/symptoms";
import { glossary } from "@/lib/glossary";
import { getSubstitutes } from "@/lib/alternatives";
import { ROLES } from "@/lib/roles";
import { TOOL_MANIFEST } from "@/lib/mcp";
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
    "## Query it, don't download it",
    "",
    `The index is also an **MCP server** at \`${site.url}/mcp\` (Streamable HTTP), so a model can query it instead of reading the whole dataset into a context window. Discovery document: \`${site.url}/mcp.json\`.`,
    "",
    // The count and the names both come from the manifest. Spelling them out was the
    // drift risk: a tenth tool added to `mcp.ts` would be served by `/mcp` and
    // unmentioned here, which is exactly the failure `llms.test.ts` exists to
    // catch — now it cannot be introduced.
    `${TOOL_MANIFEST.length} tools: ${TOOL_MANIFEST.map((t) => `\`${t.name}\``).join(", ")}.`,
    "",
    "Prefer these over the plain-text documents above when the question is specific. `search_tools({ layer, role, deployment, cost })` costs a few hundred tokens and answers the question; `llms-full.txt` is roughly six thousand lines. Use the documents for browsing, the server for lookup.",
    "",
    `\`recommend_stack({ workload, queriesPerMonth, latency, safety, ... })\` answers "what do I need to build X" rather than "which tool for layer N": it returns one pick per required layer with the reason, that pick's own skip-when, and a runner-up to switch to. Anything you leave unset comes back in \`assumptions\`, so you can tell a recommendation for your case from one for the median case. Its cost figure is a band derived from query volume, not a vendor quote.`,
    "",
    `It also serves \`resources/read\`, which returns the site's arguments as text: \`text://lattice/essay/{slug}\`, \`compare/{slug}\`, \`fix/{slug}\`, \`term/{slug}\`. Use a tool to reason about a tool; use a resource to read the essay. \`resources/list\` enumerates them; \`resources/templates/list\` gives the four shapes.`,
    "",
    `No MCP client? The same ranked search is plain HTTPS: \`${site.url}/api/search?q=vector+database&limit=10\` — JSON with absolute URLs, same ranking as the on-site palette. It takes the same facets as a query string: \`layer\`, \`section\`, \`role\`, \`kind\`, \`deployment\`, \`cost\`. Repeat a key to OR within it (\`?cost=free&cost=usage-based\`); the axes AND together. \`q\` is required only when no facet is set, so \`?role=platform&cost=free\` is a complete browse. \`limit\` caps at 50, and any response carrying a facet echoes \`acceptedFilterValues\` so a wrong value can be corrected without a second request.`,
    "",
    `- [${site.url}/stack-builder] — Describe the workload and get a stack: one pick per layer, each with a reason and a way out. The URL is shareable, and any state is reproducible at \`${site.url}/stack-builder?<query>\`.`,
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
    `- [${site.url}/roles] — The index cut by engineering specialisation rather than stack layer: what each role is accountable for.`,
    "",
    "## Common tasks",
    "",
    ...resolvedSymptoms.map((s) => `- ${s.title} → ${site.url}/fix/${s.slug}`),
    `- Choosing an inference engine → ${site.url}/compare/inference-runtimes`,
    ...ROLES.map(
      (r) => `- What a ${r.title.toLowerCase()} role owns → ${site.url}/roles/${r.id}`,
    ),
    `- Tracing and eval in one tool → ${site.url}/compare/llm-observability`,
    `- One gateway across many providers → ${site.url}/routing-gateways`,
    "",
    "## Policies",
    "",
    `- Contact → ${site.url}/contact`,
    `- About → ${site.url}/about`,
    `- Privacy → ${site.url}/privacy`,
    `- Returns → ${site.url}/returns`,
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
