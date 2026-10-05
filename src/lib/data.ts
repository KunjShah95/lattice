import type { Category, Role, Tool } from "./types";
import { AS_OF, attributes } from "./attributes";
import { ROLE_IDS, roleTitle } from "./roles";

/**
 * Build a tool entry from a compact tuple so the dataset stays readable.
 * Tuple shape: [name, host, blurb]
 *
 * `host` is a full path where a bare domain would be wrong — GitHub entries
 * need `owner/repo`, otherwise they all resolve to the site homepage.
 *
 * Classification facts (kind, deployment, licence, language, cost, and the
 * useWhen/skipWhen decision pair) live in `attributes.ts`, keyed by name. That
 * split keeps this file purely link-bearing: names, URLs and blurbs can be
 * corrected without touching a classification, and vice versa. `assertCoverage`
 * below guarantees the two never drift.
 */
const t = (name: string, host: string, blurb: string): Tool => {
  const attrs = attributes[name];
  if (!attrs) {
    throw new Error(
      `No attributes recorded for tool "${name}". Add it to src/lib/attributes.ts.`,
    );
  }
  return {
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    name,
    domain: host.split("/")[0],
    url: `https://${host}`,
    blurb,
    ...attrs,
    asOf: AS_OF,
  };
};

/**
 * Ordered substrate-first: layer 1 is the thing everything else runs on,
 * the last in-stack layer is the thing you look at. The off-stack section
 * sits outside the stack and is rendered separately.
 */
export const categories: Category[] = [
  {
    index: "01",
    slug: "inference-serving",
    title: "Inference & Serving",
    short: "Inference",
    description: "Runtimes that turn weights into tokens per second.",
    responsibility: "Turns weights into throughput.",
    layer: 1,
    role: "layer",
    tools: [
      t("vLLM", "vllm.ai", "Paged-attention inference engine with an OpenAI-compatible server."),
      t("SGLang", "github.com/sgl-project/sglang", "Structured generation runtime built on RadixAttention prefix reuse."),
      t("llama.cpp", "github.com/ggml-org/llama.cpp", "Portable CPU/GPU inference for quantized GGUF models."),
      t("Ollama", "ollama.com", "Local model runner with a single-binary distribution and HTTP API."),
      t("TensorRT-LLM", "github.com/NVIDIA/TensorRT-LLM", "NVIDIA-optimized inference with inflight batching and FP8."),
      t("Text Generation Inference", "github.com/huggingface/text-generation-inference", "Hugging Face production server for LLMs with tensor parallelism."),
      t("LM Studio", "lmstudio.ai", "Desktop app for running and serving local models with an OpenAI API."),
      t("Triton Inference Server", "github.com/triton-inference-server/server", "Multi-framework inference server for ONNX, TensorRT and Python."),
      t("llamafile", "github.com/Mozilla-Ocho/llamafile", "Packages a model and its runtime into a single executable."),
      t("KoboldCpp", "github.com/LostRuins/koboldcpp", "GGUF inference with a focused text-adventure UI and API."),
      t("PowerInfer", "github.com/AmateurChina/PowerInfer", "CPU-first runtime that offloads hot paths to the GPU."),
      t("Marlin", "github.com/vllm-project/marlin", "Quantised GEMM kernels for near-GPU speed at 4-bit."),
    ],
  },
  {
    index: "02",
    slug: "routing-gateways",
    title: "Routing & Gateways",
    short: "Routing",
    description: "One endpoint across many providers, with policy in between.",
    responsibility: "Decides which model answers, and what it costs.",
    layer: 2,
    role: "layer",
    tools: [
      t("LiteLLM", "litellm.ai", "OpenAI-format proxy translating across 100+ model providers."),
      t("Portkey", "portkey.ai", "AI gateway with routing, caching and guardrails in one layer."),
      t("Cloudflare AI Gateway", "developers.cloudflare.com", "Edge gateway adding caching, retries and rate limiting."),
      t("OpenRouter", "openrouter.ai", "Single API key and billing across many hosted models."),
      t("Martian", "withmartian.com", "Model router that optimizes for quality, cost and latency."),
      t("Envoy AI Gateway", "aigateway.envoyproxy.io", "CNCF-track gateway for LLM traffic on an Envoy data plane."),
      t("Bifrost", "getmaxim.ai", "High-throughput LLM gateway with drop-in OpenAI compatibility."),
      t("RouteLLM", "github.com/lm-sys/RouteLLM", "Learned router that cuts cost by matching difficulty to model size."),
      t("Not Diamond", "notdiamond.ai", "Routing and prompt optimisation tuned on your own traffic."),
      t("TrueFoundry", "truefoundry.com", "Gateway plus observability and guardrails as one deployment."),
    ],
  },
  {
    index: "03",
    slug: "retrieval-vector-stores",
    title: "Retrieval & Vector Stores",
    short: "Retrieval",
    description: "Where embeddings live, and how they get retrieved.",
    responsibility: "Holds the embeddings, returns the few that matter.",
    layer: 3,
    role: "layer",
    tools: [
      t("pgvector", "github.com/pgvector/pgvector", "Vector similarity search as a Postgres extension."),
      t("Qdrant", "qdrant.tech", "Rust vector database with rich filtering payloads."),
      t("Weaviate", "weaviate.io", "Graph-aware vector database with hybrid and multi-vector search."),
      t("Chroma", "trychroma.com", "Embeddings database designed for fast prototyping."),
      t("Pinecone", "pinecone.io", "Fully managed vector database with serverless scaling."),
      t("Milvus", "milvus.io", "Cloud-native vector database supporting billion-scale indexes."),
      t("Turbopuffer", "turbopuffer.com", "Vector search engine tuned for high-recall retrieval workloads."),
      t("Unstructured", "unstructured.io", "Preprocessing library that partitions raw documents for indexing."),
      t("Elasticsearch", "elastic.co", "BM25 plus dense vectors in one index, with hybrid ranking."),
      t("Vespa", "vespa.ai", "Search engine built for ranking-heavy retrieval at scale."),
      t("Rerankers", "cohere.com", "Purpose-built cross-encoders for the second retrieval stage."),
      t("Jina AI", "jina.ai", "Multimodal embeddings and a reranker behind one endpoint."),
      t("LangChain Text Splitters", "python.langchain.com", "Document loaders and splitters for the ingest stage."),
      t("Docling", "github.com/DS4SD/docling", "Layout-aware parsing that preserves table and heading structure."),
      t("LlamaParse", "llamaindex.ai", "Managed parsing for PDFs, especially the ugly ones."),
    ],
  },
  {
    index: "04",
    slug: "fine-tuning",
    title: "Fine-tuning & Training",
    short: "Training",
    description: "Adapting open weights to your own data and shape.",
    responsibility: "Produces the weights that layer 1 serves.",
    layer: 4,
    role: "layer",
    tools: [
      t("Unsloth", "unsloth.ai", "Hand-written kernels that cut LoRA memory and time sharply."),
      t("Axolotl", "axolotl.ai", "Configuration-driven fine-tuning across common architectures."),
      t("LLaMA-Factory", "github.com/hiyouga/LLaMA-Factory", "Unified interface for SFT, DPO and RLHF on open models."),
      t("PEFT", "github.com/huggingface/peft", "Parameter-efficient fine-tuning methods such as LoRA and QLoRA."),
      t("TRL", "github.com/huggingface/trl", "Hugging Face library of post-training trainers for SFT, DPO and GRPO."),
      t("DeepSpeed", "deepspeed.ai", "ZeRO sharding and pipeline parallelism for large-scale training."),
      t("Megatron-LM", "github.com/NVIDIA/Megatron-LM", "Tensor and pipeline parallel training for multi-GPU clusters."),
      t("torchtune", "github.com/pytorch/torchtune", "PyTorch-native recipes for fine-tuning and aligning open models."),
      t("Hugging Face TRL", "huggingface.co", "Preference and reward optimisation on top of any PEFT setup."),
      t("Colab", "colab.research.google.com", "Hosted GPUs for small runs and quick experiments."),
      t("Replicate", "replicate.com", "Hosted fine-tuning and deployment for open models."),
      t("Weights & Biases Launch", "wandb.ai", "Managed training runs with sweeps and artifact tracking."),
    ],
  },
  {
    index: "05",
    slug: "agent-frameworks",
    title: "Agent Frameworks",
    short: "Agents",
    description: "Orchestration layers for tool-using, multi-step systems.",
    responsibility: "Turns a model call into a multi-step program.",
    layer: 5,
    role: "layer",
    tools: [
      t("LangChain", "langchain.com", "Composable abstractions for model calls, tools and state."),
      t("LlamaIndex", "llamaindex.ai", "Data-centric framework for retrieval and agent workflows."),
      t("Pydantic AI", "ai.pydantic.dev", "Type-safe agent framework that leans on Pydantic models."),
      t("AutoGen", "microsoft.github.io/autogen", "Microsoft research project for conversable multi-agent systems."),
      t("CrewAI", "crewai.com", "Role-based orchestration where agents collaborate as a crew."),
      t("Semantic Kernel", "learn.microsoft.com", "Microsoft SDK for embedding AI steps into .NET and Python apps."),
      t("Mastra", "mastra.ai", "TypeScript agent framework with typed workflows and evals."),
      t("OpenAI Agents SDK", "openai.github.io/openai-agents-python", "Lightweight primitives for handoffs, guardrails and tracing."),
      t("Agno", "agno.com", "Minimal agent runtime centered on model-agnostic tool interfaces."),
      t("Claude Agent SDK", "docs.anthropic.com", "Anthropic's toolkit for building agents with tool use and hooks."),
      t("Letta", "letta.com", "Agent runtime with persistent, editable memory as a first-class primitive."),
      t("smolagents", "huggingface.co", "Minimal code-first agent loop from the Hugging Face team."),
      t("Vercel AI SDK", "ai-sdk.dev", "Provider-agnostic building blocks for streaming apps and agents."),
    ],
  },
  {
    index: "06",
    slug: "workflow-orchestration",
    title: "Workflow Orchestration",
    short: "Workflows",
    description: "Durable execution for long-running, retryable pipelines.",
    responsibility: "Survives the retries, the waits and the crashes.",
    layer: 6,
    role: "layer",
    tools: [
      t("Temporal", "temporal.io", "Durable execution engine that survives crashes and long waits."),
      t("Inngest", "inngest.com", "Event-driven step functions with durable replay for TypeScript."),
      t("Trigger.dev", "trigger.dev", "Background jobs and AI workflows with long-running task support."),
      t("Dagster", "dagster.io", "Asset-oriented orchestration for data and ML pipelines."),
      t("Prefect", "prefect.io", "Python-native workflow orchestration with a managed cloud option."),
      t("Apache Airflow", "apache.org", "Scheduler and DAG engine long used for batch data engineering."),
      t("Restate", "restate.dev", "Durable execution with a low-latency stateful API surface."),
      t("DBOS", "dbos.dev", "Durable workflows as ordinary Python functions and decorators."),
      t("Fly Machines", "fly.io", "Hosting for stateful containers that fits durable agent workers."),
      t("Modal", "modal.com", "Serverless GPU and container platform popular for batch inference."),
    ],
  },
  {
    index: "07",
    slug: "guardrails-safety",
    title: "Guardrails & Safety",
    short: "Guardrails",
    description: "Filtering input, output and model behavior.",
    responsibility: "Stops the bad input before it, and the bad output after.",
    layer: 7,
    role: "layer",
    tools: [
      t("NeMo Guardrails", "github.com/NVIDIA/NeMo-Guardrails", "Programmable rails that constrain conversational flow."),
      t("Guardrails AI", "guardrailsai.com", "Validators that check model output against a defined schema."),
      t("Llama Guard", "ai.meta.com/llama", "Safety classifier for prompt and response moderation."),
      t("Microsoft Presidio", "microsoft.github.io/presidio", "PII detection and anonymization for text and images."),
      t("Lakera Guard", "lakera.ai", "Prompt injection and jailbreak detection at the gateway."),
      t("garak", "github.com/NVIDIA/garak", "Scanner that probes models for known vulnerability classes."),
      t("PyRIT", "github.com/Azure/PyRIT", "Microsoft's red-team tool for generating and scoring attack prompts."),
      t("Invariant Guardrails", "invariantlabs.ai", "Guardrails as code, enforced inline in the call path."),
    ],
  },
  {
    index: "08",
    slug: "prompt-engineering",
    title: "Prompt Engineering",
    short: "Prompts",
    description: "Treating prompts as versioned, testable artifacts.",
    responsibility: "Makes the prompt an artifact you can diff and test.",
    layer: 8,
    role: "layer",
    tools: [
      t("DSPy", "dspy.ai", "Declarative prompting that compiles to optimized programs from examples."),
      t("Instructor", "python.useinstructor.com", "Schema-constrained extraction with automatic validation and retry."),
      t("Humanloop", "humanloop.com", "Prompt versioning and evaluation for production teams."),
      t("Guidance", "guidance.mit.edu", "Constrained generation by interleaving control flow and model output."),
      t("PromptLayer", "promptlayer.com", "Prompt registry with request logging and regression testing."),
      t("Agenta", "agenta.ai", "Open-source prompt management with a playground and versioning."),
      t("Promptwatch", "promptwatch.com", "Prompt regression tests and side-by-side comparison."),
      t("TextGrad", "github.com/zou-group/textgrad", "Automatic prompt optimisation via textual feedback loops."),
      t("Outlines", "dottxt-ai.github.io/outlines", "Constrained generation that masks the token space to valid output."),
    ],
  },
  {
    index: "09",
    slug: "evaluation-observability",
    title: "Evaluation & Observability",
    short: "Evals",
    description: "Traces, datasets and graders for non-deterministic output.",
    responsibility: "The only way to know whether any of the above works.",
    layer: 9,
    role: "crosscutting",
    tools: [
      t("LangSmith", "smith.langchain.com", "Tracing, evaluation and dataset tooling across LangChain runs."),
      t("Braintrust", "braintrust.dev", "Evaluation platform with built-in scorers and a data flywheel."),
      t("Arize Phoenix", "phoenix.arize.com", "Open-source tracing and evaluation built on OpenTelemetry."),
      t("Langfuse", "langfuse.com", "Self-hostable LLM tracing, prompt management and cost analytics."),
      t("promptfoo", "promptfoo.dev", "Declarative red-teaming and regression tests for prompts and agents."),
      t("DeepEval", "deepeval.com", "Open-source pytest-style evaluation suite for LLM outputs."),
      t("Helicone", "helicone.ai", "Gateway-level observability with per-request cost and latency."),
      t("Weights & Biases", "wandb.ai", "Experiment tracking and model registry with LLM eval surfaces."),
      t("OpenTelemetry", "opentelemetry.io", "Vendor-neutral standard for emitting traces and metrics."),
      t("Vellum", "vellum.ai", "Prompt and eval platform with a visual debugger for chains."),
      t("Gentrace", "gentrace.ai", "Open-source tracing and dashboards for LLM applications."),
      t("Opik", "comet.com", "Open-source LLM observability and evaluation from Comet."),
      t("Evidently AI", "evidentlyai.com", "Evaluation and monitoring for both classical and LLM systems."),
    ],
  },
  {
    index: "—",
    slug: "learning-reference",
    title: "Learning & Reference",
    short: "Reading",
    description: "Where to read once the tooling starts to blur together.",
    responsibility: "Not a layer. Reading, once you know what to look for.",
    layer: null,
    role: "offstack",
    tools: [
      t("Hugging Face", "huggingface.co", "Model hub, datasets and open-source library ecosystem."),
      t("Full Stack Deep Learning", "fullstackdeeplearning.com", "Course covering the practical side of shipping LLM systems."),
      t("Sebastian Raschka", "magazine.sebastianraschka.com", "Essays and books distilling research into working knowledge."),
      t("arXiv", "arxiv.org", "Primary preprint archive for machine learning research."),
      t("Papers with Code", "paperswithcode.com", "Links papers to their reference implementations and benchmarks."),
      t("Jay Alammar", "jalammar.github.io", "Visual explanations of transformers, RAG and LLM internals."),
      t("AI Engineer", "ai.engineer", "Conference and community focused on shipping LLM products."),
      t("Hugging Face Cookbook", "huggingface.co", "Task-oriented notebooks for fine-tuning, serving and RAG."),
      t("Made With ML", "madewithml.com", "Course on designing, building and deploying ML systems."),
      t("Distill", "distill.pub", "Archive of carefully explained model and method explainers."),
    ],
  },
];

/** Stack sections, substrate first. Excludes off-stack material. */
export const stackLayers = categories.filter((c) => c.layer !== null);

/** Sections that are not part of the stack. */
export const offStack = categories.filter((c) => c.layer === null);

/** Largest tool count in any single section, for scaling the density meter. */
export const maxCategoryCount = categories.reduce(
  (max, c) => Math.max(max, c.tools.length),
  0,
);

/** Flat, searchable index across every category. */
export const allTools: Array<Tool & { category: Category }> = categories.flatMap(
  (category) => category.tools.map((tool) => ({ ...tool, category })),
);

export const toolCount = allTools.length;

/**
 * Build-time guard. Duplicate slugs inside a category produce colliding React
 * keys and duplicate search rows, and neither shows up as a type error — so
 * fail loudly here instead. This runs at module load, i.e. during the build.
 */
for (const category of categories) {
  const seen = new Set<string>();
  for (const tool of category.tools) {
    if (seen.has(tool.slug)) {
      throw new Error(
        `Duplicate tool slug "${tool.slug}" in category "${category.slug}". ` +
          `Tool names must be unique within a category.`,
      );
    }
    seen.add(tool.slug);
  }
}

// Ordinals must be unique too — they are used as identity in the stack diagram.
{
  const indexes = new Set<string>();
  for (const category of categories) {
    if (indexes.has(category.index)) {
      throw new Error(
        `Duplicate category index "${category.index}" — section ordinals must be unique.`,
      );
    }
    indexes.add(category.index);
  }
}

/**
 * Every declared alternative must resolve to a real tool. A typo here would
 * otherwise render as a chip that goes nowhere. Alternatives are authored by
 * display name, matching how comparisons reference tools.
 */
for (const tool of allTools) {
  for (const name of tool.alternatives ?? []) {
    if (!allTools.some((t) => t.name === name)) {
      throw new Error(
        `Tool "${tool.name}" lists alternative "${name}", which does not exist.`,
      );
    }
  }
}

/**
 * Second homes. Same reasoning as the alternatives guard above, applied to
 * sections: a typo renders as a link to a 404 on a page the site asserts is a
 * curated taxonomy, which is worse than a missing feature.
 *
 * The cap matters more than it did for roles. Three second homes is the same
 * failure in a new place — the cross-reference stops distinguishing anything and
 * the axis becomes decoration. Two is already generous: it covers the genuine
 * cases (a tool that both trains and grades, or that is both an agent runtime
 * and a memory store) without letting "spans everything" become the default
 * excuse for not choosing a home.
 */
{
  const MAX_SECOND_HOMES = 2;
  const validSections = new Set(categories.map((c) => c.slug));

  for (const entry of allTools) {
    const homes = entry.secondHomes ?? [];
    if (homes.length === 0) continue;

    if (homes.length > MAX_SECOND_HOMES) {
      throw new Error(
        `Tool "${entry.name}" has ${homes.length} second homes ` +
          `(${homes.map((h) => h.section).join(", ")}). ${MAX_SECOND_HOMES} is the cap — ` +
          `a tool that belongs in three sections has no home, which is a taxonomy problem.`,
      );
    }

    const seen = new Set<string>();
    for (const home of homes) {
      if (!validSections.has(home.section)) {
        throw new Error(
          `Tool "${entry.name}" claims a second home in "${home.section}", which is not a section. ` +
            `Valid sections: ${[...validSections].join(", ")}.`,
        );
      }
      // A tool cannot have a second home in the section it already lives in.
      // That would render as "also in Agents" on the Agents page, which reads
      // as a bug and trains readers to distrust the cross-references.
      if (home.section === entry.category.slug) {
        throw new Error(
          `Tool "${entry.name}" lists its own section "${home.section}" as a second home. ` +
            `Drop it — that is its home, not a second one.`,
        );
      }
      // Off-stack is reading material. A tool with a second home there is
      // claiming to be a course, which is not what this field means.
      // `categories.find` rather than `getCategory` because this guard runs at
      // module load, before that const is initialised.
      if (categories.find((c) => c.slug === home.section)?.role === "offstack") {
        throw new Error(
          `Tool "${entry.name}" claims a second home in "${home.section}", which is off-stack. ` +
            `Second homes are for in-stack sections only.`,
        );
      }
      if (seen.has(home.section)) {
        throw new Error(
          `Tool "${entry.name}" repeats the second home "${home.section}".`,
        );
      }
      seen.add(home.section);
      // The reason is the payload. Without it the cross-reference is a claim
      // the reader cannot check, and an unargued claim is the thing this index
      // is supposed to be better at than the directories it criticises.
      const because = home.because.trim();
      if (because.length < 15) {
        throw new Error(
          `Tool "${entry.name}" gives no usable reason for its second home in ` +
            `"${home.section}". Write one clause explaining why it belongs there.`,
        );
      }
      // A full stop, because the field is rendered as a sentence in its own
      // right — matching `blurb`, which carries its own punctuation for the
      // same reason. Enforced here as well as in the test so a new entry fails
      // at build rather than reading as a typo.
      if (!because.endsWith(".")) {
        throw new Error(
          `Tool "${entry.name}" writes its reason for the second home in ` +
            `"${home.section}" without a trailing full stop.`,
        );
      }
    }
  }
}

// Reading material has no deployment; everything else must be classified.
for (const tool of allTools) {
  if (tool.kind === "reading") continue;
  if (tool.deployment == null) {
    throw new Error(`Tool "${tool.name}" is not reading, so it needs a deployment.`);
  }
  if (!tool.license) {
    throw new Error(
      `Tool "${tool.name}" has no license. Use an SPDX id, "proprietary", ` +
        `or set kind to "reading" if it genuinely has none.`,
    );
  }
}

// Roles. Every tool needs at least one, or the axis silently omits it and a
// reader filtering by role sees a smaller index with nothing saying so.
//
// The vocabulary is read from ROLES rather than restated here. A hardcoded copy
// of the five ids looked harmless and was not: adding a sixth role to roles.ts
// would have left `VALID` at five, so every tool tagged with the new role failed
// the build as "unknown", and the "no role is empty" check below would have
// silently stopped covering it. Deriving both directions from one list is what
// makes adding a role a one-file change.
{
  const VALID = new Set<string>(ROLE_IDS);

  for (const entry of allTools) {
    const { roles } = entry;
    if (!roles.length) {
      throw new Error(
        `Tool "${entry.name}" has no roles. Add them in src/lib/attributes.ts — ` +
          `a tool with no role is invisible on /roles.`,
      );
    }
    // Two is the cap. A tool in three roles is one nobody is accountable for,
    // and an uncapped axis decays into a synonym for "popular".
    if (roles.length > 2) {
      throw new Error(
        `Tool "${entry.name}" has ${roles.length} roles (${roles.join(", ")}). ` +
          `Two is the cap — drop one or split the tool out.`,
      );
    }
    for (const r of roles) {
      if (!VALID.has(r)) {
        throw new Error(
          `Tool "${entry.name}" has unknown role "${r}". Valid roles are: ` +
            `${[...VALID].join(", ")}. Define it in src/lib/roles.ts first.`,
        );
      }
    }
    if (new Set(roles).size !== roles.length) {
      throw new Error(`Tool "${entry.name}" repeats a role: ${roles.join(", ")}.`);
    }
  }
}

// A role nothing carries is worse than no role at all: /roles would render a
// section that looks like a content gap rather than a bug.
{
  const covered = new Set<string>(allTools.flatMap((entry) => entry.roles));
  for (const r of ROLE_IDS) {
    if (!covered.has(r)) {
      throw new Error(
        `Role "${r}" exists in roles.ts but no tool carries it. Tag a tool with ` +
          `it or delete the role — an empty section reads as an oversight.`,
      );
    }
  }
}

/** How long a licence/cost check stays valid before the build refuses it. */
export const STALE_AFTER_MONTHS = 6;

/**
 * The oldest `asOf` a build on `now` will accept: the first of the month,
 * `STALE_AFTER_MONTHS` back. Shared with the published verification report so
 * the receipt can never state a different rule from the one enforced.
 */
export function staleCutoff(now: Date): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - STALE_AFTER_MONTHS, 1),
  );
}

// Staleness. Licence and cost rot, so every entry is dated. Failing the build
// is deliberate: a confident stale figure is worse than a broken build, because
// a broken build cannot ship.
{
  const cutoff = staleCutoff(new Date());
  const stale = allTools.filter((t) => new Date(t.asOf) < cutoff);
  if (stale.length) {
    throw new Error(
      `Stale licence/cost data for ${stale.length} tool(s), last confirmed before ` +
        `${cutoff.toISOString().slice(0, 7)}: ${stale
          .slice(0, 8)
          .map((t) => t.name)
          .join(", ")}${stale.length > 8 ? "…" : ""}. ` +
        `Re-check them and update AS_OF in src/lib/attributes.ts.`,
    );
  }
}

export const getCategory = (slug: string) =>
  categories.find((category) => category.slug === slug);

/**
 * Look a tool up by display name. Comparisons reference tools by name rather
 * than restating their URLs, so a renamed or moved entry stays in sync and a
 * typo fails loudly at build time rather than rendering a dead link.
 */
export function getToolByName(name: string) {
  const found = allTools.find((t) => t.name === name);
  if (!found) {
    throw new Error(
      `Unknown tool "${name}" referenced in a comparison. Add it to data.ts first.`,
    );
  }
  return found;
}

/** All tools in one section, in dataset order. */
export const getToolsForCategory = (categorySlug: string) =>
  getCategory(categorySlug)?.tools ?? [];

/** Resolve a tool by its section and its slug within that section. */
export function getTool(categorySlug: string, toolSlug: string) {
  const category = getCategory(categorySlug);
  if (!category) return null;
  const tool = category.tools.find((t) => t.slug === toolSlug);
  return tool ? { tool, category } : null;
}

/**
 * Siblings in the same section, excluding the tool itself. Used for the
 * "other tools in this section" block on a tool page — internal links that
 * would not exist without a per-tool URL.
 */
export const getSiblingTools = (categorySlug: string, toolSlug: string) =>
  getToolsForCategory(categorySlug).filter((t) => t.slug !== toolSlug);

/**
 * Distinct values for a faceted attribute, with counts, ordered by count.
 * These replaced the old `tag` vocabulary, which had 45 uncontrolled values
 * mixing kinds, vendors and topics — filtering by it returned noise.
 */
function facet<T extends string>(pick: (t: Tool) => T | null) {
  const counts = new Map<T, number>();
  for (const tool of allTools) {
    const v = pick(tool);
    if (v != null) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

export const kinds = facet((t) => t.kind);
export const deployments = facet((t) => t.deployment);
export const licenses = facet((t) => t.license);
export const languages = facet((t) => t.language);
export const costs = facet((t) => t.cost);

/** Tools that can be run on your own hardware, for the self-hosted filter. */
export const selfHostedCount = allTools.filter(
  (t) => t.deployment === "self-hosted",
).length;

/**
 * Tools per role, with counts.
 *
 * Membership-based, not primary-based: a tool tagged for two roles is counted
 * under both, so these numbers do not sum to `toolCount`. That is intended — the
 * count beside a role is "how many tools you would look at", and a platform
 * engineer genuinely does look at the eval tools.
 */
export function toolsByRole(role: Role) {
  return allTools.filter((entry) => entry.roles.includes(role));
}

/**
 * Resolve a tool's declared alternatives, searched in its own section first
 * and then index-wide, so a chip always links somewhere real. Returns
 * tool/category pairs because a cross-section alternative needs its own
 * section to build a link and to pick a layer colour.
 */
export function getAlternatives(categorySlug: string, toolSlug: string) {
  const tool = getTool(categorySlug, toolSlug)?.tool;
  if (!tool?.alternatives?.length) return [];

  return tool.alternatives
    .map((name) => allTools.find((t) => t.name === name))
    .filter((t): t is (typeof allTools)[number] => Boolean(t))
    .map((entry) => ({ tool: entry, category: entry.category }));
}

/**
 * Other sections this tool declares a home in, resolved.
 *
 * Returned as tool/section pairs rather than bare slugs because a second home
 * has to be rendered with that section's title *and* its layer colour, and
 * because the reverse lookup below needs to know which section a declaration
 * points at. Sections that no longer exist are dropped rather than thrown —
 * the build guard above already refuses to ship one, so anything filtered here
 * is a tool edited without rebuilding the guard.
 */
export function getSecondHomes(categorySlug: string, toolSlug: string) {
  const tool = getTool(categorySlug, toolSlug)?.tool;
  if (!tool?.secondHomes?.length) return [];

  return tool.secondHomes
    .map((home) => {
      const section = getCategory(home.section);
      return section ? { section, because: home.because } : null;
    })
    .filter((x): x is { section: Category; because: string } => x !== null);
}

/**
 * Every tool that names `sectionSlug` as one of its second homes.
 *
 * This is the direction that matters for the taxonomy. Without it, a second
 * home is a footnote on the tool's own page — visible only to someone who
 * already found the tool in its home section. With it, the layer the tool
 * *also* serves can show it, which is what turns "Letta is in Agents" into
 * "agent memory shows up in both Agents and Retrieval", which is the actual
 * answer to where memory tools land.
 *
 * Excludes tools already native to the section: a reader on that page does not
 * need to be told twice.
 */
export function getSecondHomeTools(sectionSlug: string) {
  return allTools
    .filter((e) => e.category.slug !== sectionSlug)
    .flatMap((e) =>
      (e.secondHomes ?? [])
        .filter((h) => h.section === sectionSlug)
        .map((h) => ({ tool: e, because: h.because })),
    );
}

/** Reverse edges: tools that name this one as an alternative. */
export function getAlternativeTo(categorySlug: string, toolSlug: string) {
  const me = getTool(categorySlug, toolSlug)?.tool;
  if (!me) return [];
  return allTools
    .filter((e) => e.name !== me.name && e.alternatives?.includes(me.name))
    .map((e) => ({ tool: e, category: e.category }));
}

/**
 * Flat, section-annotated view of every tool, for the directory page.
 * `allTools` entries are already flat tools carrying `.category`; this
 * re-keys that into scalar fields so the dataset crosses the client boundary
 * cheaply and the explorer never holds a nested object graph.
 */
export const allToolEntries = allTools.map((entry) => ({
  name: entry.name,
  slug: entry.slug,
  domain: entry.domain,
  url: entry.url,
  blurb: entry.blurb,
  kind: entry.kind,
  // Display names rather than ids: the explorer and the search palette both
  // match against what a reader types ("platform", "infra"), so the string that
  // reaches the client has to be the one on screen.
  roles: entry.roles.map(roleTitle),
  deployment: entry.deployment,
  license: entry.license,
  language: entry.language,
  cost: entry.cost,
  useWhen: entry.useWhen,
  skipWhen: entry.skipWhen,
  categorySlug: entry.category.slug,
  categoryTitle: entry.category.title,
  categoryShort: entry.category.short,
  layer: entry.category.layer,
  role: entry.category.role,
  // Section slugs only, not the reasons: the explorer shows a compact
  // "also in X" marker and has nowhere to put a clause. The prose lives on the
  // tool page, which is the surface that can actually carry it.
  secondHomes: (entry.secondHomes ?? []).map((h) => h.section),
}));
