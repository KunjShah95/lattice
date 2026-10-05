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

  it("resolves the role vocabulary inline, so one document is enough", () => {
    // Shipped rather than linked on purpose: an agent that has to fetch a
    // second document to learn what "applied" means will not fetch it. So every
    // id a tool carries must be defined in the same file.
    const defined = new Set(d.roles.map((r) => r.id));
    for (const t of d.tools) {
      for (const r of t.roles) {
        expect(defined.has(r), `${t.name} carries undefined role "${r}"`).toBe(true);
      }
    }
  });

  it("gives every role a resolvable URL and real prose", () => {
    for (const r of d.roles) {
      expect(r.url, r.id).toBe(`https://example.com/roles/${r.id}`);
      expect(r.title.length, r.id).toBeGreaterThan(0);
      expect(r.owns.length, r.id).toBeGreaterThan(10);
    }
  });

  it("publishes second homes with a resolvable section and layer", () => {
    // `layer` is the field an agent filters on and it is single-valued, so
    // without this the taxonomy's overlaps are invisible to the machine
    // reader — which is the whole audience for tools.json.
    const known = new Set(d.sections.map((s) => s.slug));
    for (const t of d.tools) {
      for (const home of t.alsoIn) {
        expect(known.has(home.section), `${t.name} → ${home.section}`).toBe(true);
        expect(home.layer, `${t.name} → ${home.section}`).not.toBeNull();
        expect(home.because.length, `${t.name} → ${home.section}`).toBeGreaterThan(10);
        // Never the tool's own section, which would be a duplicate row.
        expect(home.section, `${t.name} lists its own section`).not.toBe(t.section);
      }
    }
  });

  it("agrees with the dataset's own second-home counts", () => {
    const declared = d.tools.reduce((n, t) => n + t.alsoIn.length, 0);
    const authored = allTools.reduce((n, t) => n + (t.secondHomes?.length ?? 0), 0);
    expect(declared).toBe(authored);
    expect(declared).toBeGreaterThan(0);
  });
});
