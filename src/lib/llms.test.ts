import { describe, expect, it } from "vitest";
import { GET as llmsTxt } from "@/app/llms.txt/route";
import { GET as llmsFull } from "@/app/llms-full.txt/route";
import { ROLES } from "./roles";
import { allTools, toolCount } from "./data";
import { TOOL_MANIFEST } from "./mcp";

/**
 * These two documents are the site's pitch to answer engines and coding agents,
 * and both are generated from the same dataset as the UI. The failure they are
 * exposed to is specific: a field added to a tool that only reached the HTML
 * would leave every agent-facing copy silently behind, and nothing else would
 * notice — the pages would still render correctly.
 *
 * So each tool's decision pair is asserted here per format, rather than sampled.
 */
/** The route handlers are typed through Next's async request signature; the body
 *  is all we want, and it is a plain `Response` either way. */
async function body(get: () => unknown): Promise<string> {
  return await (get() as Response).text();
}
async function full(): Promise<string> {
  return body(llmsFull as unknown as () => unknown);
}
async function summary(): Promise<string> {
  return body(llmsTxt as unknown as () => unknown);
}

describe("/llms.txt", () => {
  it("lists every role as a task, linked to its page", async () => {
    const text = await summary();
    for (const r of ROLES) {
      expect(text, `no /roles/${r.id} link`).toContain(`/roles/${r.id}`);
    }
  });

  it("keeps the task-keyed section first, which is the reason agents use it", async () => {
    const text = await summary();
    const start = text.indexOf("## Start here");
    const tasks = text.indexOf("## Common tasks");
    expect(start).toBeGreaterThan(-1);
    expect(tasks).toBeGreaterThan(start);
  });

  it("carries the headline counts", async () => {
    const text = await summary();
    expect(text).toContain(`${toolCount} tools`);
  });

  it("advertises every MCP tool by name, and the count agrees with the manifest", async () => {
    // The sentence naming the tools is hand-written, so a tool added to the
    // manifest silently stops being mentioned — the exact drift this file
    // exists to prevent, applied to itself. Derived from the manifest rather
    // than from a second list.
    const text = await summary();
    for (const tool of TOOL_MANIFEST) {
      expect(text, `${tool.name} is not advertised in /llms.txt`).toContain(tool.name);
    }
    const claimed = Number(text.match(/^(\w+) tools:/m)?.[1]);
    expect(claimed).toBe(TOOL_MANIFEST.length);
  });

  it("documents the facet vocabulary on /api/search", async () => {
    // An agent that guesses `?deployment=hosted` instead of `self-hosted` gets an
    // empty result set, which reads as "nothing matches". The names, the
    // OR-within/AND-across rule and the `q`-becomes-optional rule are all here
    // for that reason.
    const text = await summary();
    for (const key of ["layer", "section", "role", "kind", "deployment", "cost"]) {
      expect(text, `no mention of the ${key} facet`).toContain(key);
    }
    expect(text).toMatch(/OR within/i);
    expect(text).toMatch(/AND together/i);
    expect(text).toMatch(/required only when no facet/i);
  });

  it("links the Stack Builder, which had no machine affordance at all", async () => {
    const text = await summary();
    expect(text).toContain("/stack-builder");
    expect(text).toContain("recommend_stack");
  });

  it("lists policy pages with absolute URLs", async () => {
    const text = await summary();
    expect(text).toContain("## Policies");
    for (const path of ["/contact", "/about", "/privacy", "/returns"]) {
      expect(text).toContain(path);
    }
  });
});

describe("/llms-full.txt", () => {
  it("gives every tool a use/skip pair, in the flat per-tool format", async () => {
    const text = await full();
    for (const t of allTools) {
      if (t.kind === "reading") continue;
      expect(text, `no use-when for ${t.name}`).toContain(`- Use it when: ${t.useWhen}`);
      expect(text, `no skip-when for ${t.name}`).toContain(`- Skip it when: ${t.skipWhen}`);
    }
  });

  it("names the owning roles on every tool", async () => {
    const text = await full();
    for (const t of allTools) {
      expect(text, `no "Owned by" for ${t.name}`).toContain(`### ${t.name}\n`);
    }
    // And the field is actually populated, not present-but-empty.
    expect(text).not.toContain("- Owned by: \n");
  });

  it("has a role section listing every role and every owned tool", async () => {
    const text = await full();
    expect(text).toContain("## By role");
    for (const r of ROLES) {
      expect(text, `no heading for ${r.id}`).toContain(`### ${r.title} (`);
      expect(text, `no page link for ${r.id}`).toContain(`/roles/${r.id}`);
    }
  });

  it("counts each role's section correctly", async () => {
    const text = await full();
    for (const r of ROLES) {
      const expected = allTools.filter((t) => t.roles.includes(r.id)).length;
      expect(text, `wrong count for ${r.id}`).toContain(`### ${r.title} (${expected})`);
    }
  });

  it("puts each role's tools under it with a canonical URL", async () => {
    const text = await full();
    for (const r of ROLES) {
      const start = text.indexOf(`### ${r.title} (`);
      const end = text.indexOf("\n### ", start + 1);
      const section = text.slice(start, end === -1 ? text.length : end);
      for (const t of allTools.filter((x) => x.roles.includes(r.id))) {
        expect(section, `${t.name} missing from ${r.id}`).toContain(
          `/${t.category.slug}/${t.slug}`,
        );
      }
    }
  });
});
