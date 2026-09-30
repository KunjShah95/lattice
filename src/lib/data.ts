import type { Category, Tool } from "./types";

/**
 * Build a tool entry from a compact tuple so the dataset stays readable.
 * Tuple shape: [name, host, tag, blurb]
 *
 * `host` is a full path where a bare domain would be wrong — GitHub entries
 * need `owner/repo`, otherwise they all resolve to the site homepage.
 */
const t = (
  name: string,
  host: string,
  tag: string | undefined,
  blurb: string,
): Tool => ({
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
  name,
  domain: host.split("/")[0],
  url: `https://${host}`,
  blurb,
  tag,
});

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
    description: "Runtimes that turn weights into tokens per second.",
    responsibility: "Turns weights into throughput.",
    layer: 1,
    role: "layer",
    tools: [
      t("vLLM", "vllm.ai", "Serving", "Paged-attention inference engine with an OpenAI-compatible server."),
      t("SGLang", "github.com/sgl-project/sglang", "Serving", "Structured generation runtime built on RadixAttention prefix reuse."),
      t("llama.cpp", "github.com/ggml-org/llama.cpp", "Local", "Portable CPU/GPU inference for quantized GGUF models."),
      t("Ollama", "ollama.com", "Local", "Local model runner with a single-binary distribution and HTTP API."),
      t("TensorRT-LLM", "github.com/NVIDIA/TensorRT-LLM", "NVIDIA", "NVIDIA-optimized inference with inflight batching and FP8."),
      t("Text Generation Inference", "github.com/huggingface/text-generation-inference", "Serving", "Hugging Face production server for LLMs with tensor parallelism."),
      t("LM Studio", "lmstudio.ai", "Desktop", "Desktop app for running and serving local models with an OpenAI API."),
      t("Triton Inference Server", "github.com/triton-inference-server/server", "NVIDIA", "Multi-framework inference server for ONNX, TensorRT and Python."),
    ],
  },
  {
    index: "02",
    slug: "routing-gateways",
    title: "Routing & Gateways",
    description: "One endpoint across many providers, with policy in between.",
    responsibility: "Decides which model answers, and what it costs.",
    layer: 2,
    role: "layer",
    tools: [
      t("LiteLLM", "litellm.ai", "Proxy", "OpenAI-format proxy translating across 100+ model providers."),
      t("Portkey", "portkey.ai", "Gateway", "AI gateway with routing, caching and guardrails in one layer."),
      t("Cloudflare AI Gateway", "developers.cloudflare.com", "Managed", "Edge gateway adding caching, retries and rate limiting."),
      t("OpenRouter", "openrouter.ai", "Marketplace", "Single API key and billing across many hosted models."),
      t("Martian", "withmartian.com", "Gateway", "Model router that optimizes for quality, cost and latency."),
      t("Envoy AI Gateway", "aigateway.envoyproxy.io", "Proxy", "CNCF-track gateway for LLM traffic on an Envoy data plane."),
    ],
  },
  {
    index: "03",
    slug: "retrieval-vector-stores",
    title: "Retrieval & Vector Stores",
    description: "Where embeddings live, and how they get retrieved.",
    responsibility: "Holds the embeddings, returns the few that matter.",
    layer: 3,
    role: "layer",
    tools: [
      t("pgvector", "github.com/pgvector/pgvector", "Postgres", "Vector similarity search as a Postgres extension."),
      t("Qdrant", "qdrant.tech", "Vector DB", "Rust vector database with rich filtering payloads."),
      t("Weaviate", "weaviate.io", "Vector DB", "Graph-aware vector database with hybrid and multi-vector search."),
      t("Chroma", "trychroma.com", "Local", "Embeddings database designed for fast prototyping."),
      t("Pinecone", "pinecone.io", "Managed", "Fully managed vector database with serverless scaling."),
      t("Milvus", "milvus.io", "Vector DB", "Cloud-native vector database supporting billion-scale indexes."),
      t("Turbopuffer", "turbopuffer.com", "Managed", "Vector search engine tuned for high-recall retrieval workloads."),
      t("Unstructured", "unstructured.io", "Ingest", "Preprocessing library that partitions raw documents for indexing."),
    ],
  },
  {
    index: "04",
    slug: "fine-tuning",
    title: "Fine-tuning & Training",
    description: "Adapting open weights to your own data and shape.",
    responsibility: "Produces the weights that layer 1 serves.",
    layer: 4,
    role: "layer",
    tools: [
      t("Unsloth", "unsloth.ai", "Training", "Hand-written kernels that cut LoRA memory and time sharply."),
      t("Axolotl", "axolotl.ai", "Training", "Configuration-driven fine-tuning across common architectures."),
      t("LLaMA-Factory", "github.com/hiyouga/LLaMA-Factory", "Training", "Unified interface for SFT, DPO and RLHF on open models."),
      t("PEFT", "github.com/huggingface/peft", "Training", "Parameter-efficient fine-tuning methods such as LoRA and QLoRA."),
      t("TRL", "github.com/huggingface/trl", "Training", "Hugging Face library of post-training trainers for SFT, DPO and GRPO."),
      t("DeepSpeed", "deepspeed.ai", "Training", "ZeRO sharding and pipeline parallelism for large-scale training."),
      t("Megatron-LM", "github.com/NVIDIA/Megatron-LM", "NVIDIA", "Tensor and pipeline parallel training for multi-GPU clusters."),
      t("torchtune", "github.com/pytorch/torchtune", "Training", "PyTorch-native recipes for fine-tuning and aligning open models."),
    ],
  },
  {
    index: "05",
    slug: "agent-frameworks",
    title: "Agent Frameworks",
    description: "Orchestration layers for tool-using, multi-step systems.",
    responsibility: "Turns a model call into a multi-step program.",
    layer: 5,
    role: "layer",
    tools: [
      t("LangChain", "langchain.com", "Framework", "Composable abstractions for model calls, tools and state."),
      t("LlamaIndex", "llamaindex.ai", "Framework", "Data-centric framework for retrieval and agent workflows."),
      t("Pydantic AI", "ai.pydantic.dev", "Framework", "Type-safe agent framework that leans on Pydantic models."),
      t("AutoGen", "microsoft.github.io/autogen", "Framework", "Microsoft research project for conversable multi-agent systems."),
      t("CrewAI", "crewai.com", "Framework", "Role-based orchestration where agents collaborate as a crew."),
      t("Semantic Kernel", "learn.microsoft.com", "Framework", "Microsoft SDK for embedding AI steps into .NET and Python apps."),
      t("Mastra", "mastra.ai", "TypeScript", "TypeScript agent framework with typed workflows and evals."),
      t("OpenAI Agents SDK", "openai.github.io", "SDK", "Lightweight primitives for handoffs, guardrails and tracing."),
      t("Agno", "agno.com", "Framework", "Minimal agent runtime centered on model-agnostic tool interfaces."),
    ],
  },
  {
    index: "06",
    slug: "workflow-orchestration",
    title: "Workflow Orchestration",
    description: "Durable execution for long-running, retryable pipelines.",
    responsibility: "Survives the retries, the waits and the crashes.",
    layer: 6,
    role: "layer",
    tools: [
      t("Temporal", "temporal.io", "Durable", "Durable execution engine that survives crashes and long waits."),
      t("Inngest", "inngest.com", "Durable", "Event-driven step functions with durable replay for TypeScript."),
      t("Trigger.dev", "trigger.dev", "Durable", "Background jobs and AI workflows with long-running task support."),
      t("Dagster", "dagster.io", "Data", "Asset-oriented orchestration for data and ML pipelines."),
      t("Prefect", "prefect.io", "Data", "Python-native workflow orchestration with a managed cloud option."),
      t("Apache Airflow", "apache.org", "Data", "Scheduler and DAG engine long used for batch data engineering."),
      t("Restate", "restate.dev", "Durable", "Durable execution with a low-latency stateful API surface."),
    ],
  },
  {
    index: "07",
    slug: "guardrails-safety",
    title: "Guardrails & Safety",
    description: "Filtering input, output and model behavior.",
    responsibility: "Stops the bad input before it, and the bad output after.",
    layer: 7,
    role: "layer",
    tools: [
      t("NeMo Guardrails", "github.com/NVIDIA/NeMo-Guardrails", "Rails", "Programmable rails that constrain conversational flow."),
      t("Guardrails AI", "guardrailsai.com", "Validation", "Validators that check model output against a defined schema."),
      t("Llama Guard", "ai.meta.com", "Moderation", "Safety classifier for prompt and response moderation."),
      t("Microsoft Presidio", "microsoft.github.io/presidio", "PII", "PII detection and anonymization for text and images."),
      t("Lakera Guard", "lakera.ai", "Moderation", "Prompt injection and jailbreak detection at the gateway."),
      t("garak", "github.com/NVIDIA/garak", "Red Team", "Scanner that probes models for known vulnerability classes."),
    ],
  },
  {
    index: "08",
    slug: "prompt-engineering",
    title: "Prompt Engineering",
    description: "Treating prompts as versioned, testable artifacts.",
    responsibility: "Makes the prompt an artifact you can diff and test.",
    layer: 8,
    role: "layer",
    tools: [
      t("DSPy", "dspy.ai", "Optimize", "Declarative prompting that compiles to optimized programs from examples."),
      t("Instructor", "python.useinstructor.com", "Structured", "Schema-constrained extraction with automatic validation and retry."),
      t("Humanloop", "humanloop.com", "Platform", "Prompt versioning and evaluation for production teams."),
      t("Guidance", "guidance.mit.edu", "Library", "Constrained generation by interleaving control flow and model output."),
      t("PromptLayer", "promptlayer.com", "Platform", "Prompt registry with request logging and regression testing."),
      t("Langfuse", "langfuse.com", "OSS", "Prompt versioning and A/B testing wired into tracing."),
    ],
  },
  {
    index: "09",
    slug: "evaluation-observability",
    title: "Evaluation & Observability",
    description: "Traces, datasets and graders for non-deterministic output.",
    responsibility: "The only way to know whether any of the above works.",
    layer: 9,
    role: "crosscutting",
    tools: [
      t("LangSmith", "smith.langchain.com", "Tracing", "Tracing, evaluation and dataset tooling across LangChain runs."),
      t("Braintrust", "braintrust.dev", "Evals", "Evaluation platform with built-in scorers and a data flywheel."),
      t("Arize Phoenix", "phoenix.arize.com", "Tracing", "Open-source tracing and evaluation built on OpenTelemetry."),
      t("Langfuse", "langfuse.com", "OSS", "Self-hostable LLM tracing, prompt management and cost analytics."),
      t("promptfoo", "promptfoo.dev", "Evals", "Declarative red-teaming and regression tests for prompts and agents."),
      t("DeepEval", "deepeval.com", "Evals", "Open-source pytest-style evaluation suite for LLM outputs."),
      t("Helicone", "helicone.ai", "Gateway", "Gateway-level observability with per-request cost and latency."),
      t("Weights & Biases", "wandb.ai", "Platform", "Experiment tracking and model registry with LLM eval surfaces."),
      t("OpenTelemetry", "opentelemetry.io", "Standard", "Vendor-neutral standard for emitting traces and metrics."),
    ],
  },
  {
    index: "—",
    slug: "learning-reference",
    title: "Learning & Reference",
    description: "Where to read once the tooling starts to blur together.",
    responsibility: "Not a layer. Reading, once you know what to look for.",
    layer: null,
    role: "offstack",
    tools: [
      t("Hugging Face", "huggingface.co", "Platform", "Model hub, datasets and open-source library ecosystem."),
      t("Full Stack Deep Learning", "fullstackdeeplearning.com", "Course", "Course covering the practical side of shipping LLM systems."),
      t("Sebastian Raschka", "magazine.sebastianraschka.com", "Writing", "Essays and books distilling research into working knowledge."),
      t("arXiv", "arxiv.org", "Papers", "Primary preprint archive for machine learning research."),
      t("Papers with Code", "paperswithcode.com", "Papers", "Links papers to their reference implementations and benchmarks."),
      t("Jay Alammar", "jalammar.github.io", "Writing", "Visual explanations of transformers, RAG and LLM internals."),
    ],
  },
];

/** Stack sections, substrate first. Excludes off-stack material. */
export const stackLayers = categories.filter((c) => c.layer !== null);

/** Sections that are not part of the stack. */
export const offStack = categories.filter((c) => c.layer === null);

/** Deepest layer number in use, for scaling the density meter. */
export const layerDepth = stackLayers.reduce((max, c) => Math.max(max, c.layer ?? 0), 0);

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

export const getCategory = (slug: string) =>
  categories.find((category) => category.slug === slug);
