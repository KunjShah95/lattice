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
 * query string, so a recommendation is a link: sendable, bookmarkable, and
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
 * fall back to defaults rather than throwing: a hand-edited URL degrades
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

/** What fits in a post once X has taken 23 characters for the link and one for the space. */
export const POST_TEXT_LIMIT = 256;

/**
 * A built stack as the text of a post: the workload, then one line per pick.
 *
 * Tool names only, in the order the report lists them. No "why", no cost: a
 * post is the hook and the link is the argument, and the link opens this
 * exact case with every skip-when attached. The closing line is the one claim
 * the rest of the category cannot make.
 *
 * Held under `POST_TEXT_LIMIT` by dropping picks from the end and saying how
 * many were dropped, never by cutting a name in half. No current workload
 * needs it; the guard is for the day a section is added.
 */
export function stackPostText(result: StackResult): string {
  const title = result.summary.split(" · ")[0];
  const head = `My ${title} stack, from the Lattice Stack Builder:`;
  const tail = "Every pick comes with when to skip it.";
  const lines = result.picks.map((p) => `${p.section}: ${p.tool}`);
  const compose = (shown: string[], dropped: number) =>
    [head, "", ...shown, ...(dropped ? [`and ${dropped} more`] : []), "", tail].join("\n");
  let shown = lines;
  while (shown.length > 1 && compose(shown, lines.length - shown.length).length > POST_TEXT_LIMIT) {
    shown = shown.slice(0, -1);
  }
  return compose(shown, lines.length - shown.length);
}

/**
 * Where an exported report came from. Optional because the report is built
 * on the server too, and a relative `/section/tool` path pasted into an ADR
 * points nowhere, so links are emitted only when the caller knows the origin,
 * never guessed.
 */
export type StackReportSource = {
  /** Site origin, no trailing slash: entry paths are joined onto it. */
  origin: string;
  /** Absolute URL that reproduces this case, so a reader can change it. */
  caseUrl?: string;
};

/**
 * The decision report: the whole recommendation as Markdown, ready to paste
 * into an ADR, a PR description or a design doc. Every claim in it already
 * appears on screen: this is an export format, not new content.
 */
export function stackReportMarkdown(result: StackResult, source?: StackReportSource): string {
  const lines = [
    `# Stack recommendation: ${result.summary}`,
    ``,
    `Recommended with the Lattice Stack Builder. Cost bands are heuristics from query volume, not vendor quotes.`,
    ``,
  ];
  if (source?.caseUrl) {
    lines.push(`Reproduce or change this case: ${source.caseUrl}`);
    lines.push(``);
  }
  for (const p of result.picks) {
    lines.push(`## ${p.section}: ${p.tool} (${p.fitLabel})`);
    lines.push(``);
    if (source) lines.push(`- Lattice entry: ${source.origin}${p.url}`);
    lines.push(`- Why for this case: ${p.why}`);
    lines.push(`- Watch out: ${p.watchOut}`);
    if (p.alternative !== "–" && p.switchWhen) {
      lines.push(`- Alternative: ${p.alternative}: consider it when ${p.switchWhen}.`);
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
  lines.push(`${Math.round(result.confidence * 100)}%: lower when constraints narrow the field.`);
  lines.push(``);
  return lines.join("\n");
}

/** Same recommendation as {@link stackReportMarkdown}, as pretty-printed JSON. */
export function stackReportJson(result: StackResult, source?: StackReportSource): string {
  return JSON.stringify(
    {
      summary: result.summary,
      ...(source?.caseUrl ? { caseUrl: source.caseUrl } : {}),
      picks: result.picks.map((p) => ({
        section: p.section,
        sectionSlug: p.sectionSlug,
        tool: p.tool,
        url: source ? `${source.origin}${p.url}` : p.url,
        fitLabel: p.fitLabel,
        why: p.why,
        watchOut: p.watchOut,
        alternative: p.alternative,
        switchWhen: p.switchWhen,
        matches: p.matches,
      })),
      cost: {
        lowUsdPerMonth: result.costLow,
        highUsdPerMonth: result.costHigh,
        drivers: result.costDrivers,
      },
      risk: result.risk,
      confidence: result.confidence,
    },
    null,
    2,
  );
}
