import { getCategory, getToolByName } from "./data";
import type { Category } from "./types";

/**
 * Head-to-head comparisons.
 *
 * A directory that only lists tools leaves the actual decision unmade. These
 * entries exist to answer the question a reader arrived with: "which of these
 * do I pick?" Each one is deliberately narrow — tools that are genuinely
 * substitutes for one another, not a broad category survey.
 *
 * Tool metadata is pulled from `data.ts` by name so a comparison can never
 * drift from the index or link to a tool that has moved.
 */

export type ComparisonTool = {
  name: string;
  /** One-line characterisation, distinct from the tool's own blurb. */
  angle: string;
};

export type ComparisonRow = {
  /** The dimension being compared, e.g. "Where it wins". */
  dimension: string;
  /** One entry per tool, in the same order as `tools`. */
  values: string[];
};

export type Comparison = {
  slug: string;
  title: string;
  /** Meta description. */
  description: string;
  /** Framing line shown at the top of the page. */
  intro: string;
  tools: ComparisonTool[];
  rows: ComparisonRow[];
  /** The actual recommendation. One short paragraph. */
  verdict: string;
  /** Bulleted rules of thumb, rendered under the table. */
  rules: string[];
  /** Category slugs this comparison draws from. */
  sections: string[];
  /** Essay slugs that go deeper on the same decision. */
  related: string[];
};

export const comparisons: Comparison[] = [
  {
    slug: "inference-runtimes",
    title: "vLLM vs SGLang vs TGI vs llama.cpp",
    description:
      "The four open inference runtimes compared on prefix reuse, hardware floor, structured output and operational complexity — with a recommendation for each traffic shape.",
    intro:
      "These are not really competitors; they are answers to four different questions. The mistake is picking on model support alone, because the thing that actually determines throughput is your traffic shape.",
    tools: [
      { name: "vLLM", angle: "The default. Paged attention, widest ecosystem." },
      { name: "SGLang", angle: "Prefix sharing and structured output specialist." },
      { name: "Text Generation Inference", angle: "Hugging Face's tensor-parallel server." },
      { name: "llama.cpp", angle: "CPU-first, GGUF-native, runs anywhere." },
    ],
    rows: [
      { dimension: "Best for", values: [
        "General GPU serving under bursty load",
        "Heavy shared prefixes, constrained decoding",
        "Multi-GPU tensor parallelism in an HF shop",
        "Local, edge, or no-GPU deployments",
      ] },
      { dimension: "Prefix caching", values: [
        "Automatic prefix caching",
        "RadixAttention — strongest on long shared prefixes",
        "Supported, less heavily optimised",
        "KV cache reuse, not prefix-aware by default",
      ] },
      { dimension: "Hardware floor", values: [
        "One CUDA GPU",
        "One CUDA GPU",
        "Multi-GPU, designed for it",
        "None — CPU is the default path",
      ] },
      { dimension: "Quantised formats", values: [
        "AWQ, GPTQ, FP8",
        "AWQ, GPTQ, FP8",
        "AWQ, GPTQ, FP8",
        "GGUF, any quant level",
      ] },
      { dimension: "API compatibility", values: [
        "OpenAI-compatible server",
        "OpenAI-compatible server",
        "OpenAI-compatible server",
        "OpenAI-compatible server + native CLI",
      ] },
      { dimension: "Where it loses", values: [
        "Prefix-shared workloads, where SGLang wins",
        "Small teams wanting the least moving parts",
        "Single-GPU deployments — overkill",
        "Maximum concurrent throughput",
      ] },
    ],
    verdict:
      "Start with vLLM. Benchmark SGLang against it if more than a few hundred requests share a long system prompt, because prefix reuse compounds and the gap is not marginal. Use llama.cpp when the constraint is hardware rather than throughput. Reach for TGI only when you specifically need multi-GPU tensor parallelism inside an existing Hugging Face setup.",
    rules: [
      "Bursty traffic is what makes continuous batching pay. Steady low-concurrency traffic is better served by a managed API.",
      "Never benchmark on single-stream latency — it measures the wrong thing and will point you at the wrong runtime.",
      "Two GPUs running two replicas behind a load balancer usually beats one GPU running a sharded model.",
    ],
    sections: ["inference-serving"],
    related: ["choosing-an-inference-runtime", "the-gateway-is-the-product"],
  },
  {
    slug: "llm-observability",
    title: "Langfuse vs LangSmith vs Braintrust vs Phoenix",
    description:
      "Four LLM observability and evaluation platforms compared on self-hosting, eval primitives, open standards and how much they lock you in.",
    intro:
      "The interesting divide is not open versus closed, it is tracing versus evaluation. Most teams buy a tracing tool and then discover they still cannot answer whether a change helped.",
    tools: [
      { name: "Langfuse", angle: "Self-hostable tracing, prompts and evals in one." },
      { name: "LangSmith", angle: "Deep LangChain integration, strong dataset tooling." },
      { name: "Braintrust", angle: "Eval-first, with built-in scorers and a data flywheel." },
      { name: "Arize Phoenix", angle: "Open-source, OpenTelemetry-native evaluation." },
    ],
    rows: [
      { dimension: "Best for", values: [
        "Self-hosting, or a privacy constraint",
        "Teams already deep in LangChain",
        "Making evaluation the primary workflow",
        "OpenTelemetry-first, open-source everything",
      ] },
      { dimension: "Self-hostable", values: ["Yes", "Enterprise plan", "Yes, paid", "Yes, fully open"] },
      { dimension: "Open standards", values: [
        "OTel export",
        "Partial",
        "Proprietary",
        "OTel-native throughout",
      ] },
      { dimension: "Prompt management", values: [
        "First-class, with versioning and A/B",
        "Basic",
        "Yes",
        "Limited",
      ] },
      { dimension: "Evaluation", values: [
        "Datasets, scorers, CI-friendly",
        "Strong offline and online eval",
        "The strongest eval story of the four",
        "Strong, trace-derived datasets",
      ] },
      { dimension: "Where it loses", values: [
        "Depth of framework-specific debugging",
        "Cost, and vendor lock-in at higher tiers",
        "Traces are secondary to evals",
        "Polish and support",
      ] },
    ],
    verdict:
      "If you cannot send traces outside your infrastructure, self-host Langfuse and stop deliberating. Otherwise pick on evaluation rather than tracing, because tracing is table stakes and evaluation is what you will actually rely on. Whatever you choose, make sure traces carry the full request and response — that is the input to every future decision.",
    rules: [
      "Tracing answers 'what happened'. Only evaluation answers 'is this better'. Buying one and expecting the other is the common mistake.",
      "Check that model names, versions and per-hop latency are captured, or your cost and regression analysis will be wrong.",
      "Adopting OpenTelemetry as the export format keeps your future options open at close to no cost.",
    ],
    sections: ["evaluation-observability"],
    related: ["evals-are-the-asset", "the-gateway-is-the-product"],
  },
  {
    slug: "vector-databases",
    title: "pgvector vs Qdrant vs Pinecone vs Chroma",
    description:
      "Vector stores compared on hybrid search, filtering, operational burden and when the honest answer is that you should not add one at all.",
    intro:
      "Most teams adopt a dedicated vector database before they have established that their existing database cannot do the job. That decision is expensive to undo and rarely necessary.",
    tools: [
      { name: "pgvector", angle: "Vector search as a Postgres extension." },
      { name: "Qdrant", angle: "Purpose-built, Rust, strong filtered search." },
      { name: "Pinecone", angle: "Fully managed, zero operations." },
      { name: "Chroma", angle: "Prototyping-first, minimal ceremony." },
    ],
    rows: [
      { dimension: "Operational burden", values: [
        "None — you already run Postgres",
        "Low, single binary",
        "None",
        "None",
      ] },
      { dimension: "Hybrid (BM25 + vector)", values: [
        "Yes, via Postgres full-text search",
        "Yes",
        "Yes",
        "Limited",
      ] },
      { dimension: "Filtering", values: [
        "SQL — very capable",
        "Strong, purpose-built payloads",
        "Strong",
        "Basic metadata filters",
      ] },
      { dimension: "Scales past ~10M vectors", values: [
        "Workable, tuning-sensitive",
        "Yes",
        "Yes",
        "No",
      ] },
      { dimension: "Best for", values: [
        "Under a few million vectors, or when joins matter",
        "Vector-first workloads at scale",
        "When you want zero operational work",
        "Getting something working in an afternoon",
      ] },
    ],
    verdict:
      "Start on pgvector unless you have a specific reason not to. It removes a whole class of consistency problem, and if your retrieval is joining against rows you already have — users, permissions, tenancy — the relational model is simply the right one. Move to Qdrant or Pinecone when vector search stops being a side feature and starts being the workload.",
    rules: [
      "If you need to filter by something that lives in your main database, a join beats a denormalised copy you have to keep in sync.",
      "Pure vector search fails on exact tokens — part numbers, error codes, names. Use hybrid retrieval or accept that class of miss.",
      "Validate recall against a query set before migrating. Most disappointing retrieval is a chunking or embedding problem, not a database problem.",
    ],
    sections: ["retrieval-vector-stores"],
    related: ["fix-the-ranking-not-the-prompt", "evals-are-the-asset"],
  },
  {
    slug: "durable-workflows",
    title: "Temporal vs Inngest vs Trigger.dev vs Restate",
    description:
      "Durable execution engines compared on language, replay model and whether they fit inside your existing deployment — the layer that decides whether an agent survives a deploy.",
    intro:
      "All four exist to solve the same problem: work that spans minutes or hours, across process restarts, without writing a state machine by hand. They differ on where that state lives.",
    tools: [
      { name: "Temporal", angle: "The reference implementation. Event history, maximal durability." },
      { name: "Inngest", angle: "TypeScript-native, event-driven step functions." },
      { name: "Trigger.dev", angle: "Background jobs with long-running task support." },
      { name: "Restate", angle: "Low-latency durable API surface." },
    ],
    rows: [
      { dimension: "Languages", values: [
        "Go, Java, Python, TypeScript, .NET, PHP",
        "TypeScript",
        "TypeScript, Python",
        "Java, Kotlin, Rust, TypeScript, Python",
      ] },
      { dimension: "Durability model", values: [
        "Full event history, deterministic replay",
        "Step-function journal, replay from step",
        "Checkpointed runs, resumable tasks",
        "Single log per invocation",
      ] },
      { dimension: "Self-host required", values: [
        "Usually — or use Temporal Cloud",
        "No — cloud is the default path",
        "No",
        "No",
      ] },
      { dimension: "Streaming / low latency", values: [
        "Not its strength",
        "Good",
        "Good",
        "Best in class",
      ] },
      { dimension: "Where it loses", values: [
        "Heaviest to adopt, largest surface",
        "TypeScript only",
        "Narrower language coverage",
        "Youngest ecosystem, smallest community",
      ] },
    ],
    verdict:
      "If your stack is TypeScript, Inngest or Trigger.dev will be live in a day and cover 90% of agent workloads. If you are polyglot or durability is the centre of your business, Temporal is the mature answer and you should accept the adoption cost. Restate is the one to watch if low-latency stateful endpoints matter more than ecosystem size.",
    rules: [
      "Adopt one of these specifically so an agent loop survives a deploy. A process restart mid-loop is the most common way agents cause real damage.",
      "The engine fixes durability, not idempotency. Side-effecting tool calls still need idempotency keys.",
      "Put turn, token and wall-clock ceilings in the host. A prompt is a suggestion; the engine is a control.",
    ],
    sections: ["workflow-orchestration"],
    related: ["agents-need-a-durable-host"],
  },
  {
    slug: "llm-gateways",
    title: "LiteLLM vs Portkey vs Cloudflare AI Gateway",
    description:
      "LLM gateways compared on provider coverage, caching, where the data goes and whether the routing logic is yours or theirs.",
    intro:
      "Every one of these solves 'talk to many providers through one interface'. They differ sharply on where your prompts physically travel, which is a compliance question before it is a technical one.",
    tools: [
      { name: "LiteLLM", angle: "Widest provider coverage, self-host friendly." },
      { name: "Portkey", angle: "Gateway plus guardrails and analytics, SaaS-first." },
      { name: "Cloudflare AI Gateway", angle: "Edge network, caching close to users." },
      { name: "Envoy AI Gateway", angle: "CNCF, for Kubernetes shops that already run Envoy." },
    ],
    rows: [
      { dimension: "Deployment", values: [
        "Self-host or cloud",
        "Cloud-first, self-host available",
        "Managed edge service",
        "Self-host in your cluster",
      ] },
      { dimension: "Provider count", values: [
        "100+",
        "Broad",
        "Broad",
        "Plugin-driven",
      ] },
      { dimension: "Caching", values: [
        "Redis-backed, including semantic",
        "Yes",
        "Yes, at the edge",
        "Via the data plane",
      ] },
      { dimension: "Routing logic", values: [
        "Yours — config plus code",
        "Policy engine, mostly declarative",
        "Simple rules at the edge",
        "Yours, expressed as Envoy config",
      ] },
      { dimension: "Where prompts go", values: [
        "Your infrastructure, if self-hosted",
        "Vendor SaaS unless self-hosted",
        "Through Cloudflare's edge",
        "Never leaves your cluster",
      ] },
    ],
    verdict:
      "Self-host LiteLLM if you need breadth and control; it is the least committal. Choose Portkey if you want a managed product with guardrails included and are comfortable with a SaaS dependency. Cloudflare AI Gateway is the pick when latency and edge caching dominate, and Envoy AI Gateway when you need a gateway that never sees traffic leave your network.",
    rules: [
      "Put a gateway in front of your provider calls early, even if it only does auth and logging. It is the only place that sees the whole request.",
      "Never put prompt construction in the gateway. It is a control plane, not application logic.",
      "Budgets are only enforceable where spend is attributed, which means identity has to propagate from the gateway inward.",
    ],
    sections: ["routing-gateways"],
    related: ["the-gateway-is-the-product", "choosing-a-model"],
  },
  {
    slug: "structured-output",
    title: "Instructor vs JSON mode vs constrained decoding",
    description:
      "Three ways to get a schema-valid response from a model, compared on reliability, portability and whether the guarantee is real.",
    intro:
      "Asking a model for JSON is not the same as getting JSON. These three approaches differ in whether they give you a guarantee or a tendency — and that difference decides whether you can retry safely.",
    tools: [
      { name: "Instructor", angle: "Schema validation, extraction and repair, in code." },
      { name: "Guidance", angle: "Constrained decoding, control flow interleaved." },
      { name: "Outlines", angle: "Token-level constraints, including regex and grammars." },
    ],
    rows: [
      { dimension: "Guarantee", values: [
        "Validated, with typed retry",
        "Token-level constraint — cannot be violated",
        "Token-level constraint, schema or grammar",
      ] },
      { dimension: "Works across providers", values: [
        "Yes, with capability detection",
        "Yes",
        "Yes, via local or hosted inference",
      ] },
      { dimension: "Streaming", values: [
        "Partial objects supported",
        "Yes",
        "Yes",
      ] },
      { dimension: "Handles messy extraction", values: [
        "Yes — its main use case",
        "Awkward",
        "Awkward",
      ] },
      { dimension: "Constraint style", values: [
        "Post-hoc validation and repair",
        "Token masking + control flow",
        "Token masking, incl. JSON Schema and regex",
      ] },
      { dimension: "Where it loses", values: [
        "Not a hard guarantee like token constraints",
        "Less ergonomic for plain extraction",
        "Most setup of the three",
      ] },
    ],
    verdict:
      "Use a library like Instructor for extraction work: validation, typed retry and partial streaming are worth more than an absolute guarantee. Reach for true constrained decoding — Guidance or Outlines — when downstream code cannot tolerate a malformed response at all, because there the guarantee is worth the reduced flexibility. Treat a provider's JSON mode as a convenience rather than a contract, and validate regardless.",
    rules: [
      "Validate in code regardless of what the provider promises. Modes get relaxed without notice.",
      "Design the schema before the prompt. A schema that reflects how you will consume the data produces better extractions.",
      "Constrained decoding restricts the token space, so it can make a model look worse at reasoning than it is. Do not benchmark reasoning through it.",
    ],
    sections: ["prompt-engineering", "inference-serving"],
    related: ["prompt-or-finetune", "choosing-an-inference-runtime"],
  },
];

export const getComparison = (slug: string) =>
  comparisons.find((c) => c.slug === slug);

/**
 * Resolve tool metadata out of the dataset, and assert the comparison is
 * internally consistent. Runs at build time via module load.
 */
export const resolvedComparisons = comparisons.map((comparison) => {
  const tools = comparison.tools.map((t) => {
    const tool = getToolByName(t.name);
    return { ...t, url: tool.url, domain: tool.domain, layer: tool.category.layer };
  });

  for (const row of comparison.rows) {
    if (row.values.length !== tools.length) {
      throw new Error(
        `Comparison "${comparison.slug}" row "${row.dimension}" has ${row.values.length} values for ${tools.length} tools.`,
      );
    }
  }

  const sections = comparison.sections
    .map((s) => getCategory(s))
    .filter((c): c is Category => Boolean(c));

  if (sections.length !== comparison.sections.length) {
    throw new Error(
      `Comparison "${comparison.slug}" references a section slug that does not exist.`,
    );
  }

  return { ...comparison, tools, sections };
});
export type ResolvedComparison = (typeof resolvedComparisons)[number];
