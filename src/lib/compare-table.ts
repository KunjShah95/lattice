/**
 * The compare builder's table, built only from the dataset's own fields.
 *
 * ## No verdict, on purpose
 *
 * `strategy/02` §4 names the cross-layer comparison as the surface no vendor can
 * publish, and `strategy/04` §5 is blunt about the line: a single paid or invented
 * row in a verdict destroys the wedge. So this table declares no winner. It lays
 * the attributes side by side, marks the rows where the tools *differ* (the only
 * rows a decision can turn on), and stops. "Which is better" needs the reader's
 * constraints, and the page that takes constraints is the Stack Builder — which the
 * result links to.
 *
 * Pure and dependency-free so the logic is testable without a DOM: the component
 * that renders it is `"use client"`, and logic inside one is untestable in place.
 */

export type CompareTool = {
  /** `<section-slug>/<tool-slug>`. */
  id: string;
  name: string;
  categorySlug: string;
  categoryShort: string;
  layer: number | null;
  kind: string;
  deployment: string | null;
  license: string | null;
  language: string | null;
  cost: string;
  /** Specialisation display names. */
  roles: string[];
  /** `YYYY-MM`. */
  asOf: string;
  useWhen: string;
  skipWhen: string;
};

export type CompareRow = {
  label: string;
  values: string[];
  /**
   * `fact` rows are attributes a reader can check; `judgement` rows are the
   * editorial use/skip lines. Only facts are flagged as differing — two different
   * sentences are different by construction, and a "differs" marker on them would
   * be noise that teaches the reader to ignore the marker on the rows that matter.
   */
  kind: "fact" | "judgement";
  differs: boolean;
};

/** Said out loud rather than left blank: an empty cell reads as a rendering bug. */
const UNCONFIRMED = "unconfirmed";
const NOT_APPLICABLE = "n/a";

export function buildCompareRows(tools: CompareTool[]): CompareRow[] {
  const fact = (label: string, pick: (t: CompareTool) => string): CompareRow => {
    const values = tools.map(pick);
    return { label, values, kind: "fact", differs: new Set(values).size > 1 };
  };
  const judgement = (label: string, pick: (t: CompareTool) => string): CompareRow => ({
    label,
    values: tools.map(pick),
    kind: "judgement",
    differs: false,
  });

  return [
    fact("Layer", (t) => t.categoryShort),
    fact("Kind", (t) => t.kind),
    fact("Deployment", (t) => t.deployment ?? NOT_APPLICABLE),
    // `null` is a real answer, not a gap: the dataset records "could not be
    // confirmed" as null rather than guessing, because licence choice drives
    // architecture. Showing it as such keeps that decision visible.
    fact("Licence", (t) => t.license ?? UNCONFIRMED),
    fact("Cost model", (t) => t.cost),
    fact("Language", (t) => t.language ?? NOT_APPLICABLE),
    fact("Owned by", (t) => (t.roles.length ? t.roles.join(", ") : NOT_APPLICABLE)),
    fact("Facts verified", (t) => t.asOf),
    judgement("Use when", (t) => t.useWhen),
    judgement("Skip when", (t) => t.skipWhen),
  ];
}

export type Relation = {
  kind: "none" | "single" | "same-layer" | "across-layers";
  /** One sentence, in the reader's terms. */
  text: string;
};

/**
 * How the chosen tools relate in the stack.
 *
 * Two tools in one section are *usually* substitutes, but not always — a section is
 * a job, not a product category — so the wording is "usually". Tools across layers
 * are never substitutes, and saying so is the point: it stops a reader treating a
 * gateway and an evaluation platform as rivals because they sit in one table.
 */
export function relationOf(tools: CompareTool[]): Relation {
  if (tools.length === 0) return { kind: "none", text: "Pick up to three tools to compare." };
  if (tools.length === 1) return { kind: "single", text: "Add a second tool to see where they differ." };

  const layers = [...new Set(tools.map((t) => t.categorySlug))];
  if (layers.length === 1) {
    return {
      kind: "same-layer",
      text: `All in ${tools[0].categoryShort}. Tools here usually do the same job, so the differing rows are the decision.`,
    };
  }
  return {
    kind: "across-layers",
    text: `Across ${layers.length} layers. These are not substitutes: this shows what each asks of you, not which is better.`,
  };
}

/** Number of fact rows that differ — the headline of the comparison. */
export function differingFacts(rows: CompareRow[]): number {
  return rows.filter((r) => r.kind === "fact" && r.differs).length;
}

/** Escape a table cell for Markdown: pipes end a cell and newlines end a row. */
function cell(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

/**
 * The comparison as a Markdown table, for a design doc or an ADR.
 *
 * Carries the link back to the live comparison and the relation sentence, so a
 * pasted copy says what it is and where it came from, and carries no verdict for
 * the reason above.
 */
export function compareMarkdown(
  tools: CompareTool[],
  rows: CompareRow[],
  source: { origin: string; url: string },
): string {
  if (tools.length === 0) return "";
  const header = `| | ${tools.map((t) => cell(t.name)).join(" | ")} |`;
  const rule = `| --- | ${tools.map(() => "---").join(" | ")} |`;
  const body = rows.map((r) => `| ${cell(r.label)} | ${r.values.map(cell).join(" | ")} |`);
  const links = tools.map((t) => `- [${t.name}](${source.origin}/${t.id})`);

  return [
    `# ${tools.map((t) => t.name).join(" vs ")}`,
    "",
    relationOf(tools).text,
    "",
    header,
    rule,
    ...body,
    "",
    "No winner is declared: that needs your constraints. The Stack Builder takes them.",
    "",
    ...links,
    "",
    `Live comparison: ${source.url}`,
    "",
  ].join("\n");
}
