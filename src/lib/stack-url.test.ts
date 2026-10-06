import { describe, expect, it } from "vitest";
import { decodeStackInput, encodeStackInput, stackReportMarkdown } from "./stack-url";
import { recommendStack } from "./stacks";

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
    expect(md).toContain(`# Stack recommendation — ${result.summary}`);
    for (const p of result.picks) {
      expect(md).toContain(`${p.section} — ${p.tool}`);
      expect(md).toContain(p.watchOut);
    }
    expect(md).toContain(`$${result.costLow}–$${result.costHigh}/mo`);
    expect(md).toContain(result.risk);
    expect(md).toContain(`${Math.round(result.confidence * 100)}%`);
  });
});
