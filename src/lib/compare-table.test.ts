import { describe, expect, it } from "vitest";
import { allTools } from "./data";
import {
  buildCompareRows,
  compareMarkdown,
  differingFacts,
  relationOf,
  type CompareTool,
} from "./compare-table";

const tool = (over: Partial<CompareTool>): CompareTool => ({
  id: "s/t",
  name: "T",
  categorySlug: "s",
  categoryShort: "Section",
  layer: 1,
  kind: "runtime",
  deployment: "self-hosted",
  license: "Apache-2.0",
  language: "Python",
  cost: "free",
  roles: ["ML Platform"],
  asOf: "2026-09",
  useWhen: "you do X.",
  skipWhen: "you do Y.",
  ...over,
});

const real = (name: string): CompareTool => {
  const t = allTools.find((x) => x.name === name)!;
  return {
    id: `${t.category.slug}/${t.slug}`,
    name: t.name,
    categorySlug: t.category.slug,
    categoryShort: t.category.short,
    layer: t.category.layer,
    kind: t.kind,
    deployment: t.deployment,
    license: t.license,
    language: t.language,
    cost: t.cost,
    roles: [],
    asOf: t.asOf,
    useWhen: t.useWhen,
    skipWhen: t.skipWhen,
  };
};

describe("buildCompareRows", () => {
  it("has one value per tool on every row, in the order the tools were given", () => {
    const rows = buildCompareRows([tool({ name: "A" }), tool({ name: "B" }), tool({ name: "C" })]);
    for (const r of rows) expect(r.values, r.label).toHaveLength(3);
  });

  it("flags a fact row as differing only when the values actually differ", () => {
    const rows = buildCompareRows([tool({ license: "MIT" }), tool({ license: "Apache-2.0" })]);
    const byLabel = Object.fromEntries(rows.map((r) => [r.label, r]));
    expect(byLabel["Licence"].differs).toBe(true);
    expect(byLabel["Kind"].differs).toBe(false);
  });

  it("never flags the use/skip rows, which differ by construction", () => {
    const rows = buildCompareRows([tool({ useWhen: "a" }), tool({ useWhen: "b" })]);
    const use = rows.find((r) => r.label === "Use when")!;
    expect(use.kind).toBe("judgement");
    expect(use.differs).toBe(false);
  });

  it("says 'unconfirmed' for a null licence rather than leaving the cell blank", () => {
    const rows = buildCompareRows([tool({ license: null })]);
    expect(rows.find((r) => r.label === "Licence")!.values).toEqual(["unconfirmed"]);
  });

  it("says n/a for a managed service's language and for reading material's deployment", () => {
    const rows = buildCompareRows([tool({ language: null, deployment: null })]);
    expect(rows.find((r) => r.label === "Language")!.values).toEqual(["n/a"]);
    expect(rows.find((r) => r.label === "Deployment")!.values).toEqual(["n/a"]);
  });

  it("treats unconfirmed and a real licence as a difference", () => {
    const rows = buildCompareRows([tool({ license: null }), tool({ license: "MIT" })]);
    expect(rows.find((r) => r.label === "Licence")!.differs).toBe(true);
  });

  it("carries no verdict row of any kind", () => {
    const labels = buildCompareRows([tool({}), tool({})]).map((r) => r.label.toLowerCase());
    for (const banned of ["winner", "best", "score", "rank", "recommended", "verdict"]) {
      expect(labels.some((l) => l.includes(banned)), banned).toBe(false);
    }
  });
});

describe("relationOf", () => {
  it("guides the reader before there is anything to compare", () => {
    expect(relationOf([]).kind).toBe("none");
    expect(relationOf([tool({})]).kind).toBe("single");
  });

  it("calls tools in one section substitutes only 'usually'", () => {
    const r = relationOf([tool({}), tool({})]);
    expect(r.kind).toBe("same-layer");
    expect(r.text).toMatch(/usually/);
  });

  it("says plainly that tools across layers are not substitutes", () => {
    const r = relationOf([tool({ categorySlug: "a", categoryShort: "A" }), tool({ categorySlug: "b", categoryShort: "B" })]);
    expect(r.kind).toBe("across-layers");
    expect(r.text).toMatch(/not substitutes/);
    expect(r.text).toMatch(/2 layers/);
  });
});

describe("differingFacts", () => {
  it("counts only differing fact rows", () => {
    const rows = buildCompareRows([
      tool({ license: "MIT", cost: "free" }),
      tool({ license: "Apache-2.0", cost: "usage-based" }),
    ]);
    expect(differingFacts(rows)).toBe(2);
  });
});

describe("compareMarkdown", () => {
  const a = tool({ id: "s/a", name: "Alpha" });
  const b = tool({ id: "s/b", name: "Beta", license: "MIT" });
  const rows = buildCompareRows([a, b]);
  const md = compareMarkdown([a, b], rows, { origin: "https://x.test", url: "https://x.test/compare/build?tools=s/a,s/b" });

  it("is a titled table with a header, a rule and one line per row", () => {
    expect(md).toMatch(/^# Alpha vs Beta/);
    expect(md).toContain("| | Alpha | Beta |");
    expect(md).toContain("| --- | --- | --- |");
    expect(md.split("\n").filter((l) => l.startsWith("| ")).length).toBe(rows.length + 2);
  });

  it("links every tool and the live comparison", () => {
    expect(md).toContain("[Alpha](https://x.test/s/a)");
    expect(md).toContain("Live comparison: https://x.test/compare/build?tools=s/a,s/b");
  });

  it("declines to name a winner, and says where the constraints go", () => {
    expect(md).toMatch(/No winner is declared/);
    expect(md).toMatch(/Stack Builder/);
  });

  it("escapes pipes and newlines so a cell cannot break the table", () => {
    const evil = tool({ id: "s/e", name: "E", useWhen: "a | b\nc" });
    const out = compareMarkdown([evil], buildCompareRows([evil]), { origin: "o", url: "u" });
    expect(out).toContain("a \\| b c");
  });

  it("is empty for no tools", () => {
    expect(compareMarkdown([], [], { origin: "o", url: "u" })).toBe("");
  });
});

describe("against the real dataset", () => {
  it("compares across layers without inventing anything", () => {
    const vllm = real("vLLM");
    const qdrant = real("Qdrant");
    const rows = buildCompareRows([vllm, qdrant]);
    expect(relationOf([vllm, qdrant]).kind).toBe("across-layers");
    expect(rows.find((r) => r.label === "Layer")!.differs).toBe(true);
    // Every value shown is one of the tool's own fields.
    expect(rows.find((r) => r.label === "Kind")!.values).toEqual([vllm.kind, qdrant.kind]);
  });
});
