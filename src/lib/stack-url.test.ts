import { describe, expect, it } from "vitest";
import {
  POST_TEXT_LIMIT,
  decodeStackInput,
  encodeStackInput,
  neutraliseStackInput,
  stackInputFromSearch,
  stackPostText,
  stackReportJson,
  stackReportMarkdown,
} from "./stack-url";
import { WORKLOADS, recommendStack } from "./stacks";

describe("stack URL state", () => {
  it("round-trips a full case through the query string", () => {
    const input = {
      workload: "rag" as const,
      queriesPerMonth: 500000,
      documents: 10000000,
      filtering: "heavy" as const,
      freshness: "daily" as const,
      latency: "fast" as const,
      language: "python" as const,
      durability: "hours" as const,
      safety: "pii" as const,
      openSource: true,
      selfHosted: true,
      avoidLockIn: true,
      costVsPerf: -1,
    };
    const decoded = decodeStackInput(`?${encodeStackInput(input)}`);
    expect(decoded).toEqual({ ...input, simplicityVsControl: undefined });
    expect(decoded).toMatchObject(input);
  });

  it("omits defaults so links stay short", () => {
    const qs = encodeStackInput({ workload: "chatbot", queriesPerMonth: 1000 });
    expect(qs).toBe("workload=chatbot&q=1000");
  });

  it("returns null when no workload is present", () => {
    expect(decodeStackInput("?q=500")).toBeNull();
    expect(decodeStackInput("")).toBeNull();
  });

  it("degrades hand-edited garbage to nearby valid input", () => {
    const decoded = decodeStackInput("?workload=rag&q=abc&filtering=everything&cost=99");
    expect(decoded?.workload).toBe("rag");
    expect(decoded?.queriesPerMonth).toBe(0);
    expect(decoded?.filtering).toBe("none");
    expect(decoded?.costVsPerf).toBe(2);
  });

  /**
   * `/api/search` reserves `q` for the text query, and this encoder already uses
   * `q` for `queriesPerMonth`. The two namespaces never meet, they are different
   * routes, but a reader or an agent copying a builder URL onto the search
   * endpoint would get a silent, wrong result rather than an error, so it is
   * pinned here where the collision is visible.
   */
  it("uses keys that do not collide with the /api/search facet vocabulary", () => {
    const encoded = encodeStackInput({ workload: "rag", queriesPerMonth: 1000 });
    const keys = [...new URLSearchParams(encoded).keys()];
    for (const reserved of ["layer", "section", "role", "kind", "deployment", "cost"]) {
      expect(keys, `builder URL uses /api/search's "${reserved}"`).not.toContain(reserved);
    }
  });

  it("a decoded URL rebuilds the same stack", () => {
    const input = {
      workload: "agent" as const,
      queriesPerMonth: 120000,
      durability: "hours" as const,
      safety: "strict" as const,
      language: "typescript" as const,
    };
    const direct = recommendStack(input);
    const viaUrl = recommendStack(decodeStackInput(`?${encodeStackInput(input)}`)!);
    expect(viaUrl).toEqual(direct);
  });
});

describe("stack decision report", () => {
  it("exports every pick, cost, risk and confidence as Markdown", () => {
    const result = recommendStack({
      workload: "rag",
      queriesPerMonth: 500000,
      documents: 10000000,
      filtering: "heavy",
    });
    const md = stackReportMarkdown(result);
    expect(md).toContain(`# Stack recommendation: ${result.summary}`);
    for (const p of result.picks) {
      expect(md).toContain(`${p.section}: ${p.tool}`);
      expect(md).toContain(p.watchOut);
    }
    expect(md).toContain(`$${result.costLow}–$${result.costHigh}/mo`);
    expect(md).toContain(result.risk);
    expect(md).toContain(`${Math.round(result.confidence * 100)}%`);
  });

  it("exports the same recommendation as structured JSON", () => {
    const result = recommendStack({
      workload: "rag",
      queriesPerMonth: 500000,
      documents: 10000000,
      filtering: "heavy",
    });
    const parsed = JSON.parse(stackReportJson(result)) as {
      summary: string;
      picks: Array<{ tool: string; why: string }>;
      cost: { lowUsdPerMonth: number; highUsdPerMonth: number };
      risk: string;
      confidence: number;
    };
    expect(parsed.summary).toBe(result.summary);
    expect(parsed.picks).toHaveLength(result.picks.length);
    expect(parsed.picks[0]?.tool).toBe(result.picks[0]?.tool);
    expect(parsed.cost.lowUsdPerMonth).toBe(result.costLow);
    expect(parsed.risk).toBe(result.risk);
    expect(parsed.confidence).toBe(result.confidence);
  });

  it("links each pick and the case itself when given a source", () => {
    const result = recommendStack({ workload: "agent", queriesPerMonth: 100000 });
    const caseUrl = "https://lattice.test/stack-builder?workload=agent&q=100000";
    const md = stackReportMarkdown(result, { origin: "https://lattice.test", caseUrl });
    for (const p of result.picks) {
      expect(md).toContain(`- Lattice entry: https://lattice.test${p.url}`);
    }
    expect(md).toContain(caseUrl);

    const parsed = JSON.parse(stackReportJson(result, { origin: "https://lattice.test", caseUrl })) as {
      caseUrl: string;
      picks: Array<{ url: string }>;
    };
    expect(parsed.caseUrl).toBe(caseUrl);
    expect(parsed.picks[0]?.url).toBe(`https://lattice.test${result.picks[0]?.url}`);
  });

  it("stays link-free without a source, so nothing points at the wrong host", () => {
    const result = recommendStack({ workload: "agent", queriesPerMonth: 100000 });
    expect(stackReportMarkdown(result)).not.toContain("Lattice entry:");
    expect(JSON.parse(stackReportJson(result))).not.toHaveProperty("caseUrl");
  });
});

describe("stack post text", () => {
  it("names the workload and every pick, one per line", () => {
    const result = recommendStack({ workload: "rag", queriesPerMonth: 200_000, documents: 1_000_000 });
    const text = stackPostText(result);
    expect(text.startsWith("My RAG application stack, from the Lattice Stack Builder:")).toBe(true);
    for (const p of result.picks) expect(text).toContain(`${p.section}: ${p.tool}`);
    expect(text.endsWith("Every pick comes with when to skip it.")).toBe(true);
  });

  it("fits in a post beside the link, for every workload at any volume", () => {
    for (const w of WORKLOADS) {
      for (const queriesPerMonth of [0, 10_000, 200_000, 20_000_000]) {
        const text = stackPostText(recommendStack({ workload: w.id, queriesPerMonth, documents: 5_000_000 }));
        expect(text.length, `${w.id} at ${queriesPerMonth}`).toBeLessThanOrEqual(POST_TEXT_LIMIT);
      }
    }
  });

  it("drops whole picks rather than cutting a name when a stack is too long", () => {
    const result = recommendStack({ workload: "agent", queriesPerMonth: 200_000 });
    const long = {
      ...result,
      picks: Array.from({ length: 12 }, (_, i) => ({
        ...result.picks[0],
        section: `A section with a long name ${i}`,
        tool: `Tool${i}`,
      })),
    };
    const text = stackPostText(long);
    expect(text.length).toBeLessThanOrEqual(POST_TEXT_LIMIT);
    expect(text).toMatch(/and \d+ more/);
    for (const line of text.split("\n").filter((l) => l.startsWith("A section"))) {
      expect(line).toMatch(/^A section with a long name \d+: Tool\d+$/);
    }
  });
});

/**
 * The rule for which answers count is shared by the builder's form and by the
 * share card, so a card can only ever draw the stack the builder shows for the
 * same link. These pin the rule itself.
 */
describe("neutralising answers a workload does not ask", () => {
  it("drops retrieval answers for a workload with no retrieval", () => {
    const input = stackInputFromSearch("?workload=chatbot&q=200000&docs=5000000&filtering=heavy&freshness=realtime");
    expect(input).toMatchObject({ documents: 0, filtering: "none", freshness: "static" });
  });

  it("keeps them for a workload that retrieves", () => {
    const input = stackInputFromSearch("?workload=rag&q=200000&docs=5000000&filtering=heavy");
    expect(input).toMatchObject({ documents: 5_000_000, filtering: "heavy" });
  });

  it("drops latency for a fine-tuned model and safety for search", () => {
    expect(stackInputFromSearch("?workload=finetuned&q=1&latency=realtime")?.latency).toBe("flexible");
    expect(stackInputFromSearch("?workload=search&q=1&safety=strict")?.safety).toBe("none");
  });

  it("derives the simplicity dial from self-hosted, as the builder does", () => {
    expect(stackInputFromSearch("?workload=rag&q=1&self=1")?.simplicityVsControl).toBe(2);
    expect(stackInputFromSearch("?workload=rag&q=1")?.simplicityVsControl).toBe(0);
  });

  it("returns null for a link that carries no valid case", () => {
    expect(stackInputFromSearch("")).toBeNull();
    expect(stackInputFromSearch("?workload=nonsense&q=1")).toBeNull();
  });

  it("is the identity on an input that is already neutral", () => {
    const once = stackInputFromSearch("?workload=agent&q=50000&lang=python&dur=hours&safety=strict")!;
    const { simplicityVsControl: _drop, ...rest } = once;
    void _drop;
    expect(neutraliseStackInput(rest)).toEqual(once);
  });
});
