import type {
  Durability,
  Filtering,
  Freshness,
  Latency,
  Safety,
  StackInput,
  StackLanguage,
  StackResult,
  Workload,
} from "./stacks";

/**
 * Shareable Stack Builder state. The questionnaire serialises into the URL
 * query string, so a recommendation is a link — sendable, bookmarkable, and
 * re-renderable server-side without any account or storage.
 *
 * Keys are short on purpose; values are the same literals the engine takes.
 */

const WORKLOADS: readonly Workload[] = ["rag", "agent", "chatbot", "voice", "search", "llm-api", "finetuned"];

function oneOf<T extends string>(v: string | null, allowed: readonly T[]): T | null {
  return v != null && (allowed as readonly string[]).includes(v) ? (v as T) : null;
}

export type StackURLState = Required<StackInput>;

export function encodeStackInput(input: StackInput): string {
  const p = new URLSearchParams();
  p.set("workload", input.workload);
  p.set("q", String(Math.max(0, Math.floor(input.queriesPerMonth || 0))));
  if (input.documents) p.set("docs", String(Math.max(0, Math.floor(input.documents))));
  if (input.filtering && input.filtering !== "none") p.set("filtering", input.filtering);
  if (input.freshness && input.freshness !== "static") p.set("freshness", input.freshness);
  if (input.latency && input.latency !== "flexible") p.set("latency", input.latency);
  if (input.language && input.language !== "any") p.set("lang", input.language);
  if (input.durability && input.durability !== "stateless") p.set("dur", input.durability);
  if (input.safety && input.safety !== "none") p.set("safety", input.safety);
  if (input.openSource) p.set("oss", "1");
  if (input.selfHosted) p.set("self", "1");
  if (input.avoidLockIn) p.set("lock", "1");
  if (input.costVsPerf) p.set("cost", String(input.costVsPerf));
  return p.toString();
}

/**
 * Parse a query string back into engine input. Unknown or malformed values
 * fall back to defaults rather than throwing — a hand-edited URL degrades
 * to a nearby valid case, never a 500.
 */
export function decodeStackInput(search: string): Omit<Required<StackInput>, "simplicityVsControl"> | null {
  const p = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const workload = oneOf(p.get("workload"), WORKLOADS);
  if (!workload) return null;
  const num = (k: string) => {
    const n = Number(p.get(k));
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  };
  const cost = Number(p.get("cost"));
  return {
    workload,
    queriesPerMonth: num("q"),
    documents: num("docs"),
    filtering: oneOf<Filtering>(p.get("filtering"), ["none", "light", "heavy"]) ?? "none",
    freshness: oneOf<Freshness>(p.get("freshness"), ["static", "daily", "realtime"]) ?? "static",
    latency: oneOf<Latency>(p.get("latency"), ["flexible", "fast", "realtime"]) ?? "flexible",
    language: oneOf<StackLanguage>(p.get("lang"), ["any", "python", "typescript"]) ?? "any",
    durability: oneOf<Durability>(p.get("dur"), ["stateless", "minutes", "hours"]) ?? "stateless",
    safety: oneOf<Safety>(p.get("safety"), ["none", "pii", "strict"]) ?? "none",
    openSource: p.get("oss") === "1",
    selfHosted: p.get("self") === "1",
    avoidLockIn: p.get("lock") === "1",
    costVsPerf: Number.isFinite(cost) ? Math.max(-2, Math.min(2, Math.round(cost))) : 0,
  };
}

/**
 * The decision report: the whole recommendation as Markdown, ready to paste
 * into an ADR, a PR description or a design doc. Every claim in it already
 * appears on screen — this is an export format, not new content.
 */
export function stackReportMarkdown(result: StackResult): string {
  const lines = [
    `# Stack recommendation — ${result.summary}`,
    ``,
    `Recommended with the Lattice Stack Builder. Cost bands are heuristics from query volume, not vendor quotes.`,
    ``,
  ];
  for (const p of result.picks) {
    lines.push(`## ${p.section} — ${p.tool} (${p.fitLabel})`);
    lines.push(``);
    lines.push(`- Why for this case: ${p.why}`);
    lines.push(`- Watch out: ${p.watchOut}`);
    if (p.alternative !== "—" && p.switchWhen) {
      lines.push(`- Alternative: ${p.alternative} — consider it when ${p.switchWhen}.`);
    }
    if (p.matches.length) lines.push(`- Satisfies: ${p.matches.join(", ")}`);
    lines.push(``);
  }
  lines.push(`## Cost`);
  lines.push(``);
  lines.push(`Estimated $${result.costLow}–$${result.costHigh}/mo (heuristic band).`);
  if (result.costDrivers.length) {
    lines.push(`Cost drivers: ${result.costDrivers.join(", ")} (usage-billed).`);
  }
  lines.push(``);
  lines.push(`## Biggest risk`);
  lines.push(``);
  lines.push(result.risk);
  lines.push(``);
  lines.push(`## Confidence`);
  lines.push(``);
  lines.push(`${Math.round(result.confidence * 100)}% — lower when constraints narrow the field.`);
  lines.push(``);
  return lines.join("\n");
}
