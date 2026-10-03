import { describe, expect, it } from "vitest";
import { allTools } from "./data";
import { buildDataset } from "./dataset";

describe("buildDataset", () => {
  const d = buildDataset("https://example.com");

  it("carries every tool once, with both halves of the decision", () => {
    expect(d.tools).toHaveLength(allTools.length);
    for (const t of d.tools) {
      expect(t.useWhen.length, t.name).toBeGreaterThan(0);
      expect(t.skipWhen.length, t.name).toBeGreaterThan(0);
    }
  });

  it("gives absolute canonical URLs for citation", () => {
    for (const t of d.tools) expect(t.url).toMatch(/^https:\/\/example\.com\/[a-z0-9-]+\/[a-z0-9-]+$/);
  });

  it("places each tool in the stack", () => {
    const vllm = d.tools.find((t) => t.name === "vLLM");
    expect(vllm?.layer).toBe(1);
    expect(vllm?.band).toBe("compute");
  });

  it("states how to cite it and when it was verified", () => {
    expect(d.citation).toMatch(/link/i);
    expect(d.verified).toMatch(/^\d{4}-\d{2}$/);
    expect(d.verification).toBe("https://example.com/verification.json");
  });
});
