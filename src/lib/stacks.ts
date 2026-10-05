import { categories, getToolsForCategory } from "./data";
import type { Tool } from "./types";

/**
 * Stack Builder decision engine — dataset-driven, no tool names hardcoded.
 *
 * The engine searches the real dataset (`data.ts`): for each required
 * section it scores EVERY tool in that section with one generic function
 * (constraints + cost/priority prefs + scale signals + keyword affinity
 * against the tool's own blurb/useWhen text) and picks the top scorer.
 * Adding, removing or reclassifying a tool in the dataset changes
 * recommendations automatically — nothing here names a product.
 *
 * The only editorial layer is the workload profile: which stack sections a
 * workload needs and which keywords describe it. That is user-declared
 * architecture ("a RAG system needs retrieval"), not product favouritism.
 */

export type Workload =
  | "rag"
  | "agent"
  | "chatbot"
  | "voice"
  | "search"
  | "llm-api"
  | "finetuned";

export type StackInput = {
  workload: Workload;
  /** Requests per month. Clamped to >= 0. */
  queriesPerMonth: number;
  /** Corpus size for retrieval workloads. Optional. */
  documents?: number;
  openSource?: boolean;
  selfHosted?: boolean;
  avoidLockIn?: boolean;
  /** -2 = minimise cost … +2 = maximise performance. */
  costVsPerf?: number;
  /** -2 = simplest … +2 = most control. */
  simplicityVsControl?: number;
};

export type StackPick = {
  section: string;
  sectionSlug: string;
  tool: string;
  toolSlug: string;
  url: string;
  fit: number;
  why: string;
  avoid: string;
  alternative: string;
};

export type StackResult = {
  picks: StackPick[];
  costLow: number;
  costHigh: number;
  confidence: number;
  risk: string;
  summary: string;
};

type WorkloadProfile = {
  id: Workload;
  label: string;
  detail: string;
  /** Stack sections this workload needs, substrate first. Slugs only — no tools. */
  sections: string[];
  /** Affinity keywords matched against each tool's own prose. */
  keywords: string[];
};

const WORKLOAD_PROFILES: WorkloadProfile[] = [
  {
    id: "rag",
    label: "RAG application",
    detail: "Grounded answers over my data",
    sections: [
      "routing-gateways",
      "retrieval-vector-stores",
      "inference-serving",
      "prompt-engineering",
      "evaluation-observability",
    ],
    keywords: ["retrieval", "filter", "hybrid", "vector", "ranking", "ground", "citation", "embedding", "chunk"],
  },
  {
    id: "agent",
    label: "AI agent",
    detail: "Multi-step, tool use, long-running",
    sections: [
      "routing-gateways",
      "agent-frameworks",
      "workflow-orchestration",
      "inference-serving",
      "guardrails-safety",
      "evaluation-observability",
    ],
    keywords: ["tool", "orchestration", "multi-step", "durable", "state", "memory", "retry", "workflow"],
  },
  {
    id: "chatbot",
    label: "AI chatbot",
    detail: "One call, maybe a system prompt",
    sections: [
      "routing-gateways",
      "inference-serving",
      "prompt-engineering",
      "guardrails-safety",
      "evaluation-observability",
    ],
    keywords: ["prompt", "conversational", "schema", "extraction", "moderation", "tracing"],
  },
  {
    id: "voice",
    label: "Voice agent",
    detail: "Realtime audio in/out",
    sections: [
      "routing-gateways",
      "inference-serving",
      "workflow-orchestration",
      "evaluation-observability",
    ],
    keywords: ["latency", "streaming", "realtime", "throughput"],
  },
  {
    id: "search",
    label: "AI search",
    detail: "Hybrid retrieval at scale",
    sections: [
      "retrieval-vector-stores",
      "inference-serving",
      "routing-gateways",
      "evaluation-observability",
    ],
    keywords: ["ranking", "hybrid", "vector", "filter", "recall", "index", "retrieval"],
  },
  {
    id: "llm-api",
    label: "LLM API",
    detail: "Volume, latency or cost constrained",
    sections: ["routing-gateways", "inference-serving", "evaluation-observability"],
    keywords: ["throughput", "cost", "caching", "batching", "latency", "provider", "spend"],
  },
  {
    id: "finetuned",
    label: "Fine-tuned model",
    detail: "Adapt open weights to my data",
    sections: [
      "fine-tuning",
      "inference-serving",
      "prompt-engineering",
      "evaluation-observability",
    ],
    keywords: ["training", "fine-tuning", "lora", "weights", "gpu", "alignment"],
  },
];

export const WORKLOADS: Array<Pick<WorkloadProfile, "id" | "label" | "detail">> =
  WORKLOAD_PROFILES.map(({ id, label, detail }) => ({ id, label, detail }));

const OPEN_LICENSES = new Set([
  "MIT",
  "Apache-2.0",
  "BSD-3-Clause",
  "BSL-1.1",
  "MPL-2.0",
  "PostgreSQL",
  "Elastic-License-2.0",
]);

/** Generic scale signals read off a tool's own prose — same list for every section. */
const PROTOTYPE_WORDS = ["prototyp", "afternoon", "desktop", "notebook", "experiment", "local model"];
const SCALE_WORDS = ["scale", "throughput", "concurren", "production", "multi-gpu", "billion", "volume", "bursty"];

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function isOpen(license: string | null) {
  return license != null && OPEN_LICENSES.has(license);
}

function haystack(tool: Tool): string {
  return `${tool.blurb} ${tool.useWhen} ${tool.skipWhen}`.toLowerCase();
}

function countHits(text: string, words: string[]): number {
  let n = 0;
  for (const w of words) if (text.includes(w)) n++;
  return n;
}

/**
 * The single generic scorer. Every tool in a section passes through this —
 * no per-tool branches, no named exceptions. Corpus size only matters for
 * retrieval sections, where it shifts preference from zero-ops options
 * toward purpose-built stores via generic signals (see below).
 */
function scoreTool(tool: Tool, input: Required<StackInput>, profile: WorkloadProfile, isRetrieval: boolean): number {
  const text = haystack(tool);
  let score = 7.0;

  // Workload affinity: keyword overlap with the tool's own prose, capped so
  // no tool runs away on vocabulary alone.
  score += Math.min(1.2, countHits(text, profile.keywords) * 0.3);

  // Scale signals, read generically.
  const q = input.queriesPerMonth;
  const big = q >= 200_000;
  const huge = q >= 2_000_000;
  if (big) {
    score -= countHits(text, PROTOTYPE_WORDS) * 0.7;
    score += Math.min(0.9, countHits(text, SCALE_WORDS) * 0.3);
  }
  if (huge && tool.deployment === "saas") score += 0.3;
  if (huge && tool.deployment === "self-hosted") score += 0.2;

  // Retrieval corpora: large collections favour purpose-built stores over
  // zero-ops starting points. Expressed generically — tools whose own prose
  // says they stop scaling lose ground as document count grows.
  if (isRetrieval && input.documents >= 3_000_000) {
    if (/prototype|side feature|afternoon/i.test(text)) score -= 1.6;
    if (/at scale|billion|workload/i.test(text)) score += 0.9;
  }

  // Soft preferences — same weights for every section.
  if (tool.cost === "free" || tool.cost === "free-tier") score += -input.costVsPerf * 0.35;
  else score += input.costVsPerf * 0.3;
  if (tool.deployment === "self-hosted") score += input.simplicityVsControl * 0.4;
  else score += -input.simplicityVsControl * 0.4;
  if (input.avoidLockIn) score += isOpen(tool.license) ? 0.5 : -0.9;

  return clamp(Math.round(score * 10) / 10, 3, 9.8);
}

/** Hard-constraint filter — generic, identical for every section. */
function passesConstraints(tool: Tool, input: Required<StackInput>): boolean {
  if (input.selfHosted && tool.deployment !== "self-hosted") return false;
  if (input.openSource && !isOpen(tool.license)) return false;
  return true;
}

/**
 * Risk is composed from the shape of the recommended stack (which sections
 * and deployments it contains), not from named products.
 */
function composeRisk(result: StackPick[], workload: Workload): string {
  const parts: string[] = [];
  const slugs = new Set(result.map((p) => p.sectionSlug));
  if (slugs.has("retrieval-vector-stores")) {
    parts.push(
      "Retrieval quality decides the outcome — most failures are ranking or chunking failures, not model failures. Build the eval set before tuning anything.",
    );
  }
  if (slugs.has("agent-frameworks") || slugs.has("workflow-orchestration")) {
    parts.push(
      "An agent loop that cannot survive a deploy will eventually cause real damage. Durability and tool permissions are the controls, not the prompt.",
    );
  }
  if (slugs.has("fine-tuning")) {
    parts.push("Fine-tuning teaches behaviour, not facts. If the answer changes monthly, it belongs in retrieval instead.");
  }
  if (workload === "voice") {
    parts.push(
      "Lattice has no dedicated voice layer — inference latency and streaming orchestration dominate, and this pick is a starting proxy, not a verdict.",
    );
  }
  if (!parts.length) {
    parts.push(
      "Prompt changes without evals are guesses. Version prompts and measure before routing or self-hosting.",
    );
  }
  return parts.join(" ");
}

/**
 * Heuristic monthly band from query volume and the recommended stack's own
 * cost models — no vendor prices. Labelled estimate, not a quote.
 */
function costBand(input: Required<StackInput>, picks: StackPick[]): { low: number; high: number } {
  const q = input.queriesPerMonth;
  let low: number;
  let high: number;
  if (q < 50_000) {
    low = 0;
    high = 60;
  } else if (q < 200_000) {
    low = 40;
    high = 220;
  } else if (q < 1_000_000) {
    low = 180;
    high = 650;
  } else if (q < 5_000_000) {
    low = 500;
    high = 1800;
  } else {
    low = 1400;
    high = 4500;
  }
  // Shape the band with the stack itself: usage-billed picks widen the top,
  // an all-self-hosted stack sets a GPU floor.
  const metered = picks.filter((p) =>
    categories
      .flatMap((c) => c.tools)
      .find((t) => t.slug === p.toolSlug && (t.cost === "usage-based" || t.cost === "subscription")),
  ).length;
  high = Math.round(high * (1 + metered * 0.08));
  if (input.selfHosted) {
    low = Math.max(low, 120);
    high = Math.round(high * 0.85);
  }
  return { low, high };
}

function normalize(raw: StackInput): Required<StackInput> {
  return {
    workload: raw.workload,
    queriesPerMonth: Math.max(0, Math.floor(raw.queriesPerMonth || 0)),
    documents: Math.max(0, Math.floor(raw.documents ?? 0)),
    openSource: raw.openSource ?? false,
    selfHosted: raw.selfHosted ?? false,
    avoidLockIn: raw.avoidLockIn ?? false,
    costVsPerf: clamp(raw.costVsPerf ?? 0, -2, 2),
    simplicityVsControl: clamp(raw.simplicityVsControl ?? 0, -2, 2),
  };
}

export function recommendStack(raw: StackInput): StackResult {
  const input = normalize(raw);
  const profile = WORKLOAD_PROFILES.find((w) => w.id === input.workload);
  if (!profile) throw new Error(`Unknown workload "${input.workload}".`);

  const picks: StackPick[] = [];
  for (const sectionSlug of profile.sections) {
    const category = categories.find((c) => c.slug === sectionSlug);
    const tools = getToolsForCategory(sectionSlug).filter((t) => t.kind !== "reading");
    if (!category || !tools.length) continue;
    const isRetrieval = sectionSlug === "retrieval-vector-stores";

    const eligible = tools.filter((t) => passesConstraints(t, input));
    const pool = eligible.length ? eligible : tools.slice();
    const ranked = pool
      .map((tool) => ({ tool, fit: scoreTool(tool, input, profile, isRetrieval) }))
      .sort((a, b) => b.fit - a.fit || a.tool.name.localeCompare(b.tool.name));
    const winner = ranked[0];
    const runner = ranked[1];
    picks.push({
      section: category.short,
      sectionSlug,
      tool: winner.tool.name,
      toolSlug: winner.tool.slug,
      url: `/${sectionSlug}/${winner.tool.slug}`,
      fit: winner.fit,
      why: winner.tool.useWhen,
      avoid: runner
        ? `${runner.tool.name} — ${runner.tool.useWhen}`
        : winner.tool.skipWhen,
      alternative: runner ? runner.tool.name : "—",
    });
  }

  const { low, high } = costBand(input, picks);
  const constrained =
    (input.selfHosted ? 1 : 0) + (input.openSource ? 1 : 0) + (input.avoidLockIn ? 1 : 0);
  let confidence = 0.87 - constrained * 0.02;
  if (input.workload === "voice") confidence -= 0.12;
  confidence = clamp(Math.round(confidence * 100) / 100, 0.55, 0.92);

  return {
    picks,
    costLow: low,
    costHigh: high,
    confidence,
    risk: composeRisk(picks, input.workload),
    summary: `${profile.label} at ${input.queriesPerMonth.toLocaleString("en-US")} req/mo`,
  };
}
