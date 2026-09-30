import { describe, expect, it } from "vitest";
import { buildIndex, searchTools, type SearchEntry } from "./search";

/**
 * Search ranking is the one piece of logic on this site that a reader can
 * notice failing without any other signal — a query that returns the wrong
 * result looks identical to a directory that simply does not have it. These
 * tests pin the behaviour that was deliberately designed: tier ordering,
 * AND semantics across terms, and a fuzzy floor that cannot outrank a real
 * match.
 *
 * The index covers tools, essays and comparisons, so the fixtures below use
 * the shared `SearchEntry` shape rather than the `Tool` shape.
 */

const tool = (
  name: string,
  blurb: string,
  extra: Partial<SearchEntry> = {},
): SearchEntry => ({
  kind: "tool",
  name,
  blurb,
  categoryTitle: "Inference & Serving",
  categoryLayer: 1,
  href: `/inference-serving/${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  external: `https://${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.example`,
  domain: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.example`,
  ...extra,
});

const essay = (title: string, dek: string): SearchEntry => ({
  kind: "essay",
  name: title,
  blurb: dek,
  categoryTitle: "Essays",
  categoryLayer: 9,
  href: `/blog/${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  tag: "Essay",
});

const FIXTURES: SearchEntry[] = [
  tool("vLLM", "Paged-attention inference engine with an OpenAI-compatible server."),
  tool("SGLang", "Structured generation runtime built on RadixAttention prefix reuse."),
  tool("TensorRT-LLM", "NVIDIA-optimized inference with infloat batching and FP8."),
  tool("TRL", "Hugging Face library of post-training trainers for SFT and DPO."),
  tool("Braintrust", "Evaluation platform with a data flywheel for RAG evaluation.", {
    categoryTitle: "Evaluation & Observability",
    categoryLayer: 9,
  }),
  tool("Chroma", "Embeddings database designed for fast prototyping.", {
    tag: "Local",
    categoryTitle: "Retrieval & Vector Stores",
    categoryLayer: 3,
  }),
  // A deliberate pair for the brevity tie-break: both start with "guard", so
  // both land in the same tier and only the length penalty separates them.
  tool("Guard AI", "Validators that check output against a schema."),
  tool("Guardrails AI", "Programmable rails that constrain conversation."),
  // A second deliberate pair, for tier ordering: one matches "torch" on its
  // name, the other only in its blurb. The name match must rank higher.
  tool("TorchServe", "Hosts models behind a REST and gRPC interface."),
  tool("Xorbits", "Serves models on any PyTorch or TensorFlow runtime."),
  // Non-tool kinds, which is what the palette now indexes.
  essay("Evals are the asset", "Traces tell you what happened. Evals tell you whether it got better."),
  essay("Choosing a model", "There is no best model. There is a best model for a task."),
];

const index = buildIndex(FIXTURES);
const names = (q: string, limit = 10) => searchTools(index, q, limit).map((t) => t.name);

describe("searchTools", () => {
  it("returns everything on an empty query, in stack order", () => {
    expect(searchTools(index, "", 10)).toHaveLength(FIXTURES.length);
    expect(searchTools(index, "   ", 10)).toHaveLength(FIXTURES.length);
  });

  it("puts an exact name match first", () => {
    expect(names("trl")[0]).toBe("TRL");
  });

  it("ranks a name match above a blurb match", () => {
    // "TorchServe" matches on its name; "Xorbits" only mentions the term in
    // its description. blurbPhrase sits a full tier below nameWordPrefix, so
    // the name match must come first.
    const result = names("torch");
    expect(result[0]).toBe("TorchServe");
    expect(result).toContain("Xorbits");
  });

  it("prefers shorter names within the same tier", () => {
    // Both names start with the word "guard", so both score nameWordPrefix.
    // Brevity should put the shorter one first.
    const result = names("guard");
    expect(result.indexOf("Guard AI")).toBeLessThan(
      result.indexOf("Guardrails AI"),
    );
  });

  it("matches blurbs, which is what 'rag' depends on", () => {
    // The regression this guards: a pure-name search misses the only tool
    // whose description literally contains the term.
    expect(names("rag")).toContain("Braintrust");
  });

  it("matches a name prefix, not just whole names", () => {
    expect(names("vl")).toContain("vLLM");
  });

  it("matches across a hyphenated name", () => {
    expect(names("tensorrt")).toContain("TensorRT-LLM");
  });

  it("requires every term to match (AND semantics)", () => {
    expect(names("vector database")).toContain("Chroma");
    // "vector" alone matches, adding "nonexistent" must not.
    expect(names("vector nonexistentterm")).toHaveLength(0);
  });

  it("does not match a term present in neither name, blurb, tag nor domain", () => {
    expect(names("zzzznotathing")).toHaveLength(0);
  });

  it("matches an exact tag", () => {
    expect(names("local")).toContain("Chroma");
  });

  it("matches a category phrase", () => {
    expect(names("observability")).toContain("Braintrust");
  });

  it("is case-insensitive", () => {
    expect(names("VLLM")[0]).toBe("vLLM");
    expect(names("vllm")[0]).toBe("vLLM");
  });

  it("respects the limit", () => {
    expect(searchTools(index, "a", 2).length).toBeLessThanOrEqual(2);
  });

  it("never lets a fuzzy match outrank a real match", () => {
    // "vl" is a real prefix of vLLM. A scattered fuzzy hit must not win.
    expect(names("vl")[0]).toBe("vLLM");
  });

  it("returns a stable order for equal scores", () => {
    const a = names("inference");
    const b = names("inference");
    expect(a).toEqual(b);
  });

  it("handles a single-character query without exploding", () => {
    expect(() => searchTools(index, "a")).not.toThrow();
  });
  it("finds essays, not only tools", () => {
    // The gap this closes: a query for "evals" used to return only tools and
    // hid the essay that actually argues the point.
    const result = names("evals");
    expect(result).toContain("Evals are the asset");
  });

  it("finds a tool and the essay covering the same topic", () => {
    const result = names("eval");
    expect(result).toContain("Braintrust");
    expect(result).toContain("Evals are the asset");
  });

  it("matches an essay by its title", () => {
    expect(names("choosing a model")).toContain("Choosing a model");
  });

  it("gives every hit an internal route", () => {
    for (const entry of searchTools(index, "e")) {
      expect(entry.href.startsWith("/"), entry.name).toBe(true);
    }
  });

  it("marks only tools with an external destination", () => {
    const toolEntry = searchTools(index, "vllm")[0];
    expect(toolEntry.kind).toBe("tool");
    expect(toolEntry.external).toBeTruthy();

    const essayEntry = searchTools(index, "evals are the asset")[0];
    expect(essayEntry.kind).toBe("essay");
    expect(essayEntry.external).toBeUndefined();
  });

  it("tolerates a missing domain on a non-tool entry", () => {
    const built = buildIndex([essay("No Host", "An essay with no domain field.")]);
    expect(built[0].domain).toBe("");
    expect(() => searchTools(built, "host")).not.toThrow();
  });
});

describe("buildIndex", () => {
  it("preserves every entry", () => {
    expect(buildIndex(FIXTURES)).toHaveLength(FIXTURES.length);
  });

  it("keeps the original entry reachable on each record", () => {
    const built = buildIndex(FIXTURES);
    expect(built[0].entry).toBe(FIXTURES[0]);
  });

  it("lowercases the fields it precomputes", () => {
    const [first] = buildIndex([tool("MiXeD", "CaSeD BlUrB")]);
    expect(first.name).toBe("mixed");
    expect(first.blurb).toBe("cased blurb");
  });

  it("tolerates a missing tag", () => {
    const [record] = buildIndex([tool("NoTag", "A blurb")]);
    expect(record.tag).toBe("");
    expect(() => searchTools(buildIndex([tool("NoTag", "A blurb")]), "notag")).not.toThrow();
  });
});
