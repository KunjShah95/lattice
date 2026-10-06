import { getCategory, getToolByName } from "./data";
import { AS_OF } from "./attributes";
import { listNames, lowerFirst, type QA } from "./seo";
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

/**
 * - `substitutes`  tools that do the same job; the reader picks one.
 * - `cross-layer`  tools that sit in different layers and compete for the same
 *   week of engineering time; the reader picks an order. Vendors never publish
 *   these, because no vendor sells every column.
 */
export type ComparisonKind = "substitutes" | "cross-layer";

export type Comparison = {
  slug: string;
  kind: ComparisonKind;
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
    kind: "substitutes",
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
    kind: "substitutes",
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
    kind: "substitutes",
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
    kind: "substitutes",
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
    kind: "substitutes",
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
    kind: "substitutes",
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

  // ---- Cross-layer ------------------------------------------------------
  // Each column is a different place in the stack, listed substrate first.
  // The question is not "which one" but "which first", so the verdict is an
  // order of adoption rather than a winner.
  {
    slug: "gateway-guardrails-evals",
    kind: "cross-layer",
    title: "Gateway vs guardrails vs evals: what to build first",
    description:
      "A gateway, a guardrail layer and an eval suite compete for the same first week of work. What each catches, what each misses, and the order to adopt them in.",
    intro:
      "These three never appear on the same vendor comparison page, because no vendor sells all three. They do appear on the same backlog. Each catches a different failure, sits in a different place in the request, and costs something different to adopt — so the real question is order, not choice.",
    tools: [
      { name: "LiteLLM", angle: "Decides which model serves a request." },
      { name: "Guardrails AI", angle: "Decides whether a response may leave." },
      { name: "promptfoo", angle: "Decides whether a change made things better." },
    ],
    rows: [
      { dimension: "Question it answers", values: [
        "Which model, provider and budget serves this request?",
        "Is this response allowed to leave the system?",
        "Did the last change make answers better or worse?",
      ] },
      { dimension: "Failure it catches", values: [
        "Provider outages, rate limits, runaway spend",
        "Schema violations and policy breaches, per request",
        "Quality regressions, before they ship",
      ] },
      { dimension: "Failure it misses", values: [
        "Whether any answer was correct",
        "Answers that are well-formed and wrong",
        "Anything happening in production right now",
      ] },
      { dimension: "Where it runs", values: [
        "In the request path, on every call",
        "In the request path, after generation",
        "Offline, in CI or on a schedule",
      ] },
      { dimension: "Cost to adopt", values: [
        "A proxy and a config file; one more network hop",
        "A validator per rule; added latency on every response",
        "A labelled dataset — the examples are the expensive part, not the tool",
      ] },
      { dimension: "Adopt first when", values: [
        "You call more than one provider, or spend is already a line item",
        "A malformed or unsafe output has a real cost on day one",
        "You are about to change prompts, models or retrieval",
      ] },
    ],
    verdict:
      "For most teams, evals first. A gateway makes calls cheaper and more reliable, and guardrails make individual responses safer, but neither tells you whether the system is getting better — and every later change to routing, prompts or retrieval needs that answer to be judged at all. Put the gateway in early if you already run more than one provider, because retrofitting a proxy into every call site is tedious. Add guardrails for the specific failures your evals surface, not the ones you imagine.",
    rules: [
      "A guardrail without an eval is a guess about which failures matter. Write the eval that found the failure, then the guardrail that blocks it.",
      "Route on measured quality, not on price alone. A cheaper model that fails your eval set is not cheaper.",
      "Anything in the request path adds latency to every call; anything offline adds none. Stay offline until production forces otherwise.",
    ],
    sections: ["routing-gateways", "guardrails-safety", "evaluation-observability"],
    related: ["evals-are-the-asset", "the-gateway-is-the-product", "where-guardrails-belong"],
  },
  {
    slug: "retrieval-finetuning-prompting",
    kind: "cross-layer",
    title: "Retrieval vs fine-tuning vs prompt optimisation: fixing wrong answers",
    description:
      "Three layers that each claim to fix wrong answers, compared on what they actually change, what they need from you, and which failure each one is for.",
    intro:
      "A model giving wrong answers can be fixed at three different depths of the stack, and they are not interchangeable. Retrieval changes what the model can see, fine-tuning changes how it behaves, and prompt optimisation changes what it is asked. Picking the wrong depth is the most expensive mistake in this index.",
    tools: [
      { name: "pgvector", angle: "Changes what the model can see." },
      { name: "Unsloth", angle: "Changes how the model behaves." },
      { name: "DSPy", angle: "Changes what the model is asked." },
    ],
    rows: [
      { dimension: "What it changes", values: [
        "The context available at question time",
        "The weights — the model's default behaviour",
        "The instructions and examples it is given",
      ] },
      { dimension: "Fixes", values: [
        "Missing, private or recent facts",
        "Format, tone and narrow-task behaviour a prompt cannot hold",
        "Underspecified instructions and weak examples",
      ] },
      { dimension: "Does not fix", values: [
        "A model that ignores the context it is given",
        "Missing knowledge — weights are a poor database",
        "Facts the model has never seen",
      ] },
      { dimension: "Needs from you", values: [
        "A corpus, a chunking strategy and a ranking you can inspect",
        "Curated training examples and a GPU",
        "Labelled examples and a metric that scores them",
      ] },
      { dimension: "Cost of being wrong", values: [
        "Low — re-index and retry",
        "High — a training run, and a model you now have to serve",
        "Low — prompts are text and revert cleanly",
      ] },
      { dimension: "Adopt first when", values: [
        "The right facts are absent or out of date",
        "Prompting has plateaued on a narrow, stable task",
        "The facts are present but the model uses them badly",
      ] },
    ],
    verdict:
      "Diagnose before choosing. If the right fact was never in the context, that is a retrieval problem and no amount of prompting or training fixes it. If the fact was there and the model ignored or misused it, optimise the prompt first, because it is cheap to try and cheap to undo. Fine-tune last, for narrow and stable tasks where prompting has measurably plateaued — it is the only one of the three that leaves you with a new artefact to serve and retrain.",
    rules: [
      "Read the retrieved context before touching the prompt. Most “the model is wrong” bugs are “the ranking is wrong” bugs.",
      "Fine-tuning teaches behaviour, not facts. If the answer changes monthly, it belongs in retrieval.",
      "All three need a scored example set to know whether they worked. Build it first; it is shared.",
    ],
    sections: ["retrieval-vector-stores", "fine-tuning", "prompt-engineering"],
    related: ["fix-the-ranking-not-the-prompt", "prompt-or-finetune", "context-is-a-budget"],
  },
  {
    slug: "cutting-inference-cost",
    kind: "cross-layer",
    title: "Self-hosting vs routing vs measuring: cutting inference cost",
    description:
      "Three ways to lower an inference bill — run the model yourself, send easy queries to a smaller model, or measure where spend goes — compared on savings and risk.",
    intro:
      "Inference cost can be attacked at the substrate, in the router, or by first finding out where it goes. Teams usually start with the most expensive of the three — standing up their own GPUs — when the cheapest would have told them it was unnecessary.",
    tools: [
      { name: "vLLM", angle: "Pay for GPU-hours instead of tokens." },
      { name: "RouteLLM", angle: "Send easy queries to a cheaper model." },
      { name: "Helicone", angle: "Find out which requests cost the most." },
    ],
    rows: [
      { dimension: "Lever", values: [
        "Own the serving, pay for hardware",
        "Match query difficulty to model size",
        "Attribute spend per request, user and feature",
      ] },
      { dimension: "Saves money when", values: [
        "Traffic is high and steady enough to keep GPUs busy",
        "A meaningful share of queries are easy",
        "Spend is concentrated somewhere you have not looked",
      ] },
      { dimension: "Loses money when", values: [
        "Utilisation is low — idle GPUs still bill by the hour",
        "The router misjudges hard queries and answers degrade",
        "Never on its own — it saves nothing until you act on it",
      ] },
      { dimension: "Quality risk", values: [
        "None if you serve the same model; real if you downsize to fit",
        "Direct — this is a quality-for-cost trade by design",
        "None",
      ] },
      { dimension: "Operational cost", values: [
        "A serving fleet, on-call and capacity planning",
        "A router to calibrate, plus an eval to trust it",
        "A proxy hop or an SDK wrapper",
      ] },
      { dimension: "Adopt first when", values: [
        "You know your utilisation and it is high",
        "You can measure the quality you are trading away",
        "You cannot yet say which feature costs the most",
      ] },
    ],
    verdict:
      "Measure first. Per-request cost attribution is the cheapest of the three and the only one with no quality risk, and it often shows a few features or prompts dominating spend — which a shorter prompt can fix without new infrastructure. Route next, but only once an eval can tell you what the cheaper model loses. Self-host last, when measured and sustained utilisation makes GPU-hours cheaper than tokens; below that line it raises the bill.",
    rules: [
      "Cost per token is not cost per answer. A cheaper model that needs two retries is the expensive one.",
      "Compare self-hosting against the price you actually pay, at the utilisation you actually have — not at peak.",
      "A router without an eval is a cost cut with an unknown quality bill attached.",
    ],
    sections: ["inference-serving", "routing-gateways", "evaluation-observability"],
    related: ["the-cost-model", "choosing-an-inference-runtime", "observability-is-not-logging"],
  },
  {
    slug: "agent-frameworks",
    kind: "substitutes",
    title: "LangChain vs LlamaIndex vs Pydantic AI vs OpenAI Agents SDK",
    description:
      "Agent frameworks compared on retrieval depth, type safety, surface area and ecosystem — with a recommendation for data-heavy, schema-heavy and minimal-loop teams.",
    intro:
      "These four are the frameworks teams actually shortlist once they move past a script in a notebook. The split is not Python versus TypeScript — it is whether retrieval, types or a thin loop is the centre of the problem.",
    tools: [
      { name: "LangChain", angle: "Widest integrations, largest surface." },
      { name: "LlamaIndex", angle: "Retrieval and indexing as the main event." },
      { name: "Pydantic AI", angle: "Type-safe tools and structured agent outputs." },
      { name: "OpenAI Agents SDK", angle: "Small primitives: handoffs, guardrails, tracing." },
    ],
    rows: [
      { dimension: "Best for", values: [
        "Breadth — many providers, tools and patterns already wired",
        "RAG-heavy apps where data connectors matter",
        "Agents where bad tool args are the main failure mode",
        "A legible loop without adopting a whole platform",
      ] },
      { dimension: "Retrieval built in", values: [
        "Via integrations, not the core abstraction",
        "First-class — indexes, parsers and query engines",
        "Via your own retrieval layer",
        "Bring your own context",
      ] },
      { dimension: "Type safety", values: [
        "Optional, varies by module",
        "Moderate — Python-first data models",
        "Strong — Pydantic models end to end",
        "Moderate — typed runners and tools",
      ] },
      { dimension: "Multi-agent patterns", values: [
        "Graphs, crews and handoffs via ecosystem",
        "Workflows and agents over indexes",
        "Delegation between typed agents",
        "Handoffs as a first-class primitive",
      ] },
      { dimension: "Operational surface", values: [
        "Large — many moving parts to learn",
        "Medium — data stack plus agent layer",
        "Small core — you own orchestration",
        "Smallest — intentionally minimal API",
      ] },
      { dimension: "Where it loses", values: [
        "Teams that want a thin, readable core",
        "Pure tool loops with no retrieval",
        "Batteries-included multi-provider glue",
        "Deep retrieval tooling out of the box",
      ] },
    ],
    verdict:
      "Choose on the shape of the job. LlamaIndex when retrieval and connectors are the product; Pydantic AI when schema-safe tool calls are the risk; OpenAI Agents SDK when you want a small loop with handoffs and guardrails built in; LangChain when you need the widest integration surface and will pay the abstraction tax. Whichever you pick, run the loop on a durable host and trace every tool call — no framework replaces those.",
    rules: [
      "A framework orchestrates calls inside one process. It does not make long runs survive a deploy — that is a workflow engine's job.",
      "Fewer tools beats a longer system prompt. Narrow the agent before you add another integration.",
      "If you cannot trace a failing run step by step, you are debugging prose instead of the call that went wrong.",
    ],
    sections: ["agent-frameworks"],
    related: ["agents-need-a-durable-host", "observability-is-not-logging", "where-guardrails-belong"],
  },
  {
    slug: "guardrails-platforms",
    kind: "substitutes",
    title: "NeMo Guardrails vs Guardrails AI vs Presidio vs Invariant",
    description:
      "Safety layers compared on input rails, output validation, PII handling and whether they run inline or as a separate service — with a recommendation by compliance shape.",
    intro:
      "These four are not interchangeable filters. Some constrain dialogue flow, some validate structured output, some detect PII in text, and some enforce policy in the request path. Teams that bolt one on without naming the failure mode usually discover they still leak data in traces.",
    tools: [
      { name: "NeMo Guardrails", angle: "Programmable conversational rails and flows." },
      { name: "Guardrails AI", angle: "Validator hub for model output schemas." },
      { name: "Microsoft Presidio", angle: "PII detection and anonymization." },
      { name: "Invariant Guardrails", angle: "Policy-as-code in the call path." },
    ],
    rows: [
      { dimension: "Best for", values: [
        "Multi-turn policies and topic boundaries",
        "Structured output you can fail closed on",
        "Redacting or blocking PII before storage",
        "Inline enforcement with minimal latency tax",
      ] },
      { dimension: "Input vs output", values: [
        "Both — flow and topical rails",
        "Mostly output validation",
        "Mostly input (and logs) before models",
        "Both — request and response hooks",
      ] },
      { dimension: "Self-hostable", values: [
        "Yes",
        "Yes",
        "Yes",
        "Yes",
      ] },
      { dimension: "Open source core", values: [
        "Yes",
        "Yes",
        "Yes",
        "Partial — check licence for your use",
      ] },
      { dimension: "Where it loses", values: [
        "Heavy if you only need a schema check",
        "Weak on conversational topic control alone",
        "Not a full safety policy language",
        "Smaller validator ecosystem",
      ] },
    ],
    verdict:
      "Start with the failure you have seen. Presidio when PII in prompts or logs is the incident; Guardrails AI when bad JSON or schema violations are the incident; NeMo when the model keeps drifting off-topic across turns; Invariant when you need policy enforced on every hop with code reviewable rules. Whatever you pick, redact before traces land in a third-party observability tool — guardrails on the model do not fix logging.",
    rules: [
      "Guardrails belong at the gateway when every provider must see the same policy; they belong in the app when policy is task-specific.",
      "PII detection on the way in is cheaper than explaining a breach on the way out.",
      "A validator without tests is theatre. Ship a small adversarial set and run it in CI.",
    ],
    sections: ["guardrails-safety"],
    related: ["where-guardrails-belong", "the-gateway-is-the-product", "observability-is-not-logging"],
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

  if (comparison.kind === "cross-layer") {
    const layers = tools.map((t) => t.layer);
    if (layers.some((l) => l == null) || new Set(layers).size !== layers.length) {
      throw new Error(
        `Cross-layer comparison "${comparison.slug}" needs every tool in a different stack layer.`,
      );
    }
    if (layers.some((l, i) => i > 0 && (l as number) < (layers[i - 1] as number))) {
      throw new Error(
        `Cross-layer comparison "${comparison.slug}" must list its tools substrate first.`,
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

/**
 * The question a comparison page exists to answer, in the words it is asked
 * in. Substitutes are a choice; cross-layer entries are an order, and phrasing
 * them as "which should you choose" would imply you only need one of them.
 */
export function decisionQuestion(c: Pick<Comparison, "kind" | "tools">): string {
  const names = listNames(c.tools.map((t) => t.name)).replace(/ and ([^,]+)$/, " or $1");
  return c.kind === "cross-layer"
    ? `Which should you adopt first: ${names}?`
    : `Which should you choose: ${names}?`;
}

/**
 * The verdict's opening, long enough to stand alone as a quoted answer.
 *
 * Answer engines lift a passage, not a page, and the passages they lifted in
 * the category audit were 20–60 words that answered without their context.
 * Verdicts are written lead-first, so the opening sentences are the answer;
 * this takes whole sentences until the passage can stand on its own.
 */
export function shortAnswer(verdict: string): string {
  // A sentence ends at a full stop followed by a capital or the end, so dotted
  // names ("Trigger.dev") do not split one.
  const sentences = verdict.match(/[\s\S]*?\.(?=\s+[A-Z]|\s*$)/g)?.map((s) => s.trim()) ?? [verdict];
  const count = (s: string) => s.split(/\s+/).length;
  let out = "";
  for (const s of sentences) {
    const next = out ? `${out} ${s}` : s;
    if (out && count(next) > 75) break;
    out = next;
    if (count(out) >= 20) break;
  }
  return out;
}

/**
 * Visible FAQ for a comparison page, mirrored in its FAQPage JSON-LD: the
 * decision itself, then the use/skip pair for each tool. The skip half is the
 * sentence no vendor-authored comparison will write about its own product.
 */
export function comparisonQuestions(c: Pick<Comparison, "kind" | "tools" | "verdict">): QA[] {
  return [
    { question: decisionQuestion(c), answer: c.verdict },
    ...c.tools.map((t) => {
      const entry = getToolByName(t.name);
      return {
        question: `When should you use ${t.name}, and when should you skip it?`,
        answer: `Use ${t.name} when: ${lowerFirst(entry.useWhen)} Skip it when: ${lowerFirst(entry.skipWhen)}`,
      };
    }),
  ];
}

/**
 * Meta title with the year the comparison's facts were verified. Every page
 * engines cited in the category audit carried a year in its title; using the
 * dataset's verification year rather than the build year keeps it true.
 */
export function comparisonMetaTitle(c: Pick<Comparison, "kind" | "title">): string {
  const year = AS_OF.slice(0, 4);
  return c.kind === "cross-layer" ? `${c.title} (${year})` : `${c.title}: which to choose in ${year}`;
}
