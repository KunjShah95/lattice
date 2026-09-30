import { FlowDiagram, type DiagramSpec } from "./flow-diagram";

/**
 * Named figures used in the essays. Each is a plain spec, so the geometry
 * lives in one place and a post can reference a figure by name.
 */

const requestPath: DiagramSpec = {
  title: "The request path",
  subtitle: "four hops, two side-effects",
  columns: 4,
  nodes: [
    { id: "app", label: "Your code", sub: "SDK or raw HTTP", col: 0, row: 0 },
    { id: "gw", label: "Gateway", sub: "auth · quotas · retries", col: 1, row: 0, layer: 2 },
    { id: "rt", label: "Router", sub: "model choice, fallbacks", col: 2, row: 0, layer: 2 },
    { id: "mdl", label: "Model", sub: "hosted or self-hosted", col: 3, row: 0, layer: 1 },
    { id: "cache", label: "Semantic cache", sub: "a hit skips the model entirely", col: 0, row: 1, span: 2, dashed: true },
    { id: "obs", label: "Trace + eval harness", sub: "every call logged, scored, diffable", col: 2, row: 1, span: 2, layer: 9 },
  ],
  edges: [
    { from: "app", to: "gw" },
    { from: "gw", to: "rt" },
    { from: "rt", to: "mdl" },
    { from: "gw", to: "cache", label: "lookup", dashed: true },
    { from: "mdl", to: "obs", label: "trace", dashed: true },
  ],
  notes: [
    "The gateway and router are the only places that know which vendor you are using. Everything above them should be vendor-agnostic.",
    "The cache short-circuits before billing; the trace records everything, including cache hits, or your cost data is wrong.",
  ],
};

const ragPipeline: DiagramSpec = {
  title: "Retrieval, end to end",
  subtitle: "the part people get wrong is the last step",
  columns: 4,
  nodes: [
    { id: "ing", label: "Ingest", sub: "parse, clean, de-dupe", col: 0, row: 0, layer: 3 },
    { id: "chunk", label: "Chunk", sub: "boundaries beat token counts", col: 1, row: 0, layer: 3 },
    { id: "embed", label: "Embed", sub: "one model, both sides", col: 2, row: 0, layer: 3 },
    { id: "idx", label: "Index", sub: "vector + keyword + filters", col: 3, row: 0, layer: 3 },
    { id: "q", label: "Query", sub: "same embedding model", col: 0, row: 1, layer: 3 },
    { id: "fetch", label: "Hybrid fetch", sub: "BM25 ∪ vector, top 50", col: 1, row: 1, layer: 3 },
    { id: "rerank", label: "Rerank", sub: "cross-encoder, top 5", col: 2, row: 1, layer: 9 },
    { id: "gen", label: "Generate", sub: "5 chunks, not 50", col: 3, row: 1, layer: 1 },
  ],
  edges: [
    { from: "ing", to: "chunk" },
    { from: "chunk", to: "embed" },
    { from: "embed", to: "idx" },
    { from: "q", to: "fetch" },
    { from: "idx", to: "fetch", label: "candidates" },
    { from: "fetch", to: "rerank" },
    { from: "rerank", to: "gen" },
  ],
  notes: [
    "Vector search alone loses exact identifiers — part numbers, error codes, names. Hybrid retrieval gets them back.",
    "Reranking is the highest-leverage addition to an existing RAG system, and the cheapest one to try.",
  ],
};

const agentLoop: DiagramSpec = {
  title: "The agent loop, made durable",
  subtitle: "an unbounded loop needs a bounded host",
  columns: 4,
  nodes: [
    { id: "task", label: "Task", sub: "a goal, not a prompt", col: 0, row: 0, layer: 6 },
    { id: "model", label: "Model call", sub: "decide the next action", col: 1, row: 0, layer: 1 },
    { id: "tool", label: "Tool call", sub: "side effect, may be slow", col: 2, row: 0, layer: 6 },
    { id: "obs", label: "Observation", sub: "result feeds the next turn", col: 3, row: 0, layer: 6 },
    { id: "host", label: "Durable host", sub: "checkpoint, retry, resume, budget", col: 0, row: 1, span: 4, layer: 6 },
  ],
  edges: [
    { from: "task", to: "model" },
    { from: "model", to: "tool" },
    { from: "tool", to: "obs" },
    { from: "obs", to: "model", label: "loop", dashed: true, back: true },
    { from: "host", to: "task", label: "wraps", dashed: true },
  ],
  notes: [
    "The loop is the easy part. Surviving a deploy mid-loop, a provider timeout, or a runaway token spend is the engineering.",
    "Put a hard turn and token ceiling in the host, not in the prompt. Prompts are advisory; the host is not.",
  ],
};

const evalFlywheel: DiagramSpec = {
  title: "The evaluation flywheel",
  subtitle: "logging is not evaluating",
  columns: 4,
  nodes: [
    { id: "prod", label: "Production traces", sub: "real inputs, real failures", col: 0, row: 0, layer: 9 },
    { id: "curate", label: "Curate a set", sub: "failures become permanent cases", col: 1, row: 0, layer: 9 },
    { id: "score", label: "Score a change", sub: "prompt, model, chunk size", col: 2, row: 0, layer: 9 },
    { id: "ship", label: "Ship behind a gate", sub: "CI blocks on regression", col: 3, row: 0, layer: 9 },
  ],
  edges: [
    { from: "prod", to: "curate" },
    { from: "curate", to: "score" },
    { from: "score", to: "ship" },
    { from: "ship", to: "prod", label: "next version", dashed: true, back: true },
  ],
  notes: [
    "A golden set only stays useful if you add to it every time production surprises you.",
    "Hold-out sets that never change turn into a benchmark you have overfitted to.",
  ],
};

const promptVsTune: DiagramSpec = {
  title: "Prompt, or fine-tune?",
  subtitle: "decide by what you are trying to change",
  columns: 2,
  nodes: [
    { id: "behav", label: "Change the behaviour", sub: "format, tone, tool use, refusal policy", col: 0, row: 0, layer: 8 },
    { id: "fixp", label: "Start with the prompt", sub: "cheap, reversible, debuggable", col: 1, row: 0, layer: 8 },
    { id: "know", label: "Teach it something", sub: "facts, format it has never seen", col: 0, row: 1, layer: 4 },
    { id: "fixt", label: "Consider fine-tuning", sub: "only after retrieval has failed", col: 1, row: 1, layer: 4 },
    { id: "shape", label: "Make it cheaper or faster", sub: "same behaviour, fewer tokens", col: 0, row: 2, layer: 8 },
    { id: "distil", label: "Distil or quantise", sub: "trained against the big model's outputs", col: 1, row: 2, layer: 4 },
  ],
  edges: [
    { from: "behav", to: "fixp" },
    { from: "know", to: "fixt" },
    { from: "shape", to: "distil" },
  ],
  notes: [
    "Fine-tuning is a manufacturing step, not a debugging step. Reach for it when prompting has genuinely plateaued.",
    "Most 'the model does not know this' problems are retrieval problems wearing a hat.",
  ],
};

/**
 * Named figures used in the essays. Each is a plain spec, so the geometry
 * lives in one place and a post can reference a figure by name.
 *
 * Exported PascalCase deliberately: MDX treats a lowercase JSX tag as a
 * possible host element and will happily emit `<requestPath></requestPath>`
 * when it cannot resolve the name. Capitalised names are unambiguously
 * component references.
 */

export function RequestPath() {
  return <FlowDiagram spec={requestPath} />;
}

export function RagPipeline() {
  return <FlowDiagram spec={ragPipeline} />;
}

export function AgentLoop() {
  return <FlowDiagram spec={agentLoop} />;
}

export function EvalFlywheel() {
  return <FlowDiagram spec={evalFlywheel} />;
}

export function PromptVsTune() {
  return <FlowDiagram spec={promptVsTune} />;
}
