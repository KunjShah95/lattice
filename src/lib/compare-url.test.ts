import { describe, expect, it } from "vitest";
import { allTools } from "./data";
import { resolvedComparisons } from "./comparisons";
import { COMPARE_EXAMPLES, decodeCompare, encodeCompare, MAX_COMPARE } from "./compare-url";

const VALID = new Set(["inference-serving/vllm", "retrieval-vector-stores/qdrant", "fine-tuning/trl", "a/b"]);

describe("encodeCompare", () => {
  it("is empty for no selection, so the page is the bare URL", () => {
    expect(encodeCompare([])).toBe("");
  });

  it("joins ids with commas and leaves the slashes readable", () => {
    expect(encodeCompare(["inference-serving/vllm", "retrieval-vector-stores/qdrant"])).toBe(
      "tools=inference-serving/vllm,retrieval-vector-stores/qdrant",
    );
  });

  it("caps at three and drops duplicates", () => {
    expect(encodeCompare(["a/b", "a/b", "c/d", "e/f", "g/h"])).toBe("tools=a/b,c/d,e/f");
    expect(MAX_COMPARE).toBe(3);
  });
});

describe("decodeCompare", () => {
  it("round-trips what encodeCompare wrote", () => {
    const ids = ["inference-serving/vllm", "fine-tuning/trl"];
    expect(decodeCompare(`?${encodeCompare(ids)}`, VALID)).toEqual(ids);
  });

  it("accepts the query string with or without its leading ?", () => {
    expect(decodeCompare("tools=a/b", VALID)).toEqual(["a/b"]);
    expect(decodeCompare("?tools=a/b", VALID)).toEqual(["a/b"]);
  });

  it("keeps the order in the URL, because the reader chose it", () => {
    expect(decodeCompare("tools=fine-tuning/trl,a/b", VALID)).toEqual(["fine-tuning/trl", "a/b"]);
  });

  it("degrades a stale or hand-edited link to the part that still resolves", () => {
    expect(decodeCompare("tools=a/b,gone/tool,fine-tuning/trl", VALID)).toEqual(["a/b", "fine-tuning/trl"]);
    expect(decodeCompare("tools=nope", VALID)).toEqual([]);
  });

  it("is empty for no parameter, an empty one, or junk", () => {
    expect(decodeCompare("", VALID)).toEqual([]);
    expect(decodeCompare("?tools=", VALID)).toEqual([]);
    expect(decodeCompare("?tools=,,,", VALID)).toEqual([]);
    expect(decodeCompare("?other=1", VALID)).toEqual([]);
  });

  it("drops duplicates and anything past the cap", () => {
    expect(decodeCompare("tools=a/b,a/b,fine-tuning/trl,inference-serving/vllm,retrieval-vector-stores/qdrant", VALID)).toEqual([
      "a/b",
      "fine-tuning/trl",
      "inference-serving/vllm",
    ]);
  });

  it("treats a surrounding space as noise rather than part of an id", () => {
    expect(decodeCompare("tools=a/b, fine-tuning/trl", VALID)).toEqual(["a/b", "fine-tuning/trl"]);
  });
});

describe("the /compare/build route", () => {
  it("is not shadowing a hand-written comparison", () => {
    // `/compare/build` is a static segment beside the dynamic `/compare/[slug]`, so
    // a comparison whose slug is "build" would be prerendered and then never served.
    expect(resolvedComparisons.map((c) => c.slug)).not.toContain("build");
  });
});

describe("COMPARE_EXAMPLES", () => {
  const valid = new Set(allTools.map((t) => `${t.category.slug}/${t.slug}`));

  it("only names tools that exist, so an example never opens an empty table", () => {
    for (const ex of COMPARE_EXAMPLES) {
      for (const id of ex.ids) expect(valid.has(id), `${ex.label}: ${id}`).toBe(true);
    }
  });

  it("stays within the cap and has no repeats", () => {
    for (const ex of COMPARE_EXAMPLES) {
      expect(ex.ids.length).toBeGreaterThanOrEqual(2);
      expect(ex.ids.length).toBeLessThanOrEqual(MAX_COMPARE);
      expect(new Set(ex.ids).size).toBe(ex.ids.length);
    }
  });

  it("includes a cross-layer example, which is the point of the page", () => {
    const crossLayer = COMPARE_EXAMPLES.some(
      (ex) => new Set(ex.ids.map((id) => id.split("/")[0])).size > 1,
    );
    expect(crossLayer).toBe(true);
  });
});

describe("against the real dataset", () => {
  it("every shipped tool's canonical path is a valid, round-tripping id", () => {
    const ids = allTools.map((t) => `${t.category.slug}/${t.slug}`);
    const valid = new Set(ids);
    expect(valid.size).toBe(ids.length);
    for (const id of ids.slice(0, 20)) {
      expect(decodeCompare(`?${encodeCompare([id])}`, valid)).toEqual([id]);
    }
  });
});
