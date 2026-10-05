import type { CostModel, Deployment, Role, SecondHome, ToolKind } from "./types";

/**
 * Structured facts about each tool, keyed by display name and kept separate
 * from the dataset's prose.
 *
 * Why a separate file: `data.ts` holds names, URLs and blurbs, which are
 * link-bearing and must not be disturbed. These are the classification facts
 * that make the index filterable and decision-oriented. Splitting them means a
 * wrong licence can be corrected in one place, and `data.ts` asserts a
 * one-to-one match with this file at build time — so a tool can never appear
 * without attributes, or vice versa.
 *
 * `license` is an SPDX identifier, `"proprietary"`, or `null` where it could
 * not be confirmed. Null is a deliberate answer: guessing a licence is worse
 * than saying nothing, because licence choice changes architecture.
 *
 * `asOf` is when the licence and cost were last checked. These rot, and a
 * stale-but-confident figure is worse than an absent one.
 */

export type ToolAttributes = {
  kind: ToolKind;
  /**
   * Specialisations this tool belongs to. One or two in practice; the count is
   * enforced in `roles.test.ts` rather than here, so a third role has to be
   * argued for in a test failure rather than silently allowed.
   */
  roles: Role[];
  deployment: Deployment | null;
  license: string | null;
  language: string | null;
  cost: CostModel;
  useWhen: string;
  skipWhen: string;
  alternatives?: string[];
  /**
   * Other sections this tool genuinely belongs to, each with the reason.
   *
   * Lives here rather than in `data.ts` because it is a classification claim,
   * not a link: the section slugs are validated against the dataset at build
   * time, so this file stays the single place a tool's relationships are
   * authored. See `Tool.secondHomes` for why this exists.
   */
  secondHomes?: SecondHome[];
};

/** Reading material has no deployment, implementation or licence to speak of. */
const READ: Pick<ToolAttributes, "kind" | "deployment" | "license" | "language" | "cost"> = {
  kind: "reading",
  deployment: null,
  license: null,
  language: null,
  cost: "free",
};

export const AS_OF = "2026-09";

export const attributes: Record<string, ToolAttributes> = {
  // ---- 01 Inference & Serving ------------------------------------------
  "vLLM": {
    kind: "runtime", deployment: "self-hosted", license: "Apache-2.0", language: "Python", cost: "free",
    roles: ["serving"],
    useWhen: "General GPU serving under bursty, high-concurrency traffic.",
    skipWhen: "Traffic is steady and low-concurrency, so batches never fill.",
    alternatives: ["SGLang", "Text Generation Inference", "Triton Inference Server"],
  },
  "SGLang": {
    kind: "runtime", deployment: "self-hosted", license: "Apache-2.0", language: "Python", cost: "free",
    roles: ["serving"],
    useWhen: "A large share of requests share a long prefix, or you need constrained decoding.",
    skipWhen: "You want the fewest moving parts and vLLM already clears your bar.",
    alternatives: ["vLLM", "Text Generation Inference"],
  },
  "llama.cpp": {
    kind: "runtime", deployment: "self-hosted", license: "MIT", language: "C++", cost: "free",
    roles: ["serving"],
    useWhen: "The constraint is hardware, not throughput — no GPU, or an edge box.",
    skipWhen: "You need maximum concurrent throughput on datacentre GPUs.",
    alternatives: ["Ollama", "llamafile", "KoboldCpp"],
  },
  "Ollama": {
    kind: "runtime", deployment: "self-hosted", license: "MIT", language: "Go", cost: "free",
    roles: ["serving", "applied"],
    useWhen: "Local model access for a developer or small team, with no setup.",
    skipWhen: "You need production throughput or a stable server API.",
    alternatives: ["llama.cpp", "LM Studio", "llamafile"],
  },
  "TensorRT-LLM": {
    kind: "runtime", deployment: "self-hosted", license: "Apache-2.0", language: "CUDA", cost: "free",
    roles: ["serving"],
    useWhen: "You are committed to NVIDIA hardware and need the last of the throughput.",
    skipWhen: "Hardware portability matters, or you have no GPUs to tune against.",
    alternatives: ["vLLM", "SGLang"],
  },
  "Text Generation Inference": {
    kind: "runtime", deployment: "self-hosted", license: "Apache-2.0", language: "Rust", cost: "free",
    roles: ["serving"],
    useWhen: "Multi-GPU tensor parallelism inside an existing Hugging Face stack.",
    skipWhen: "The model fits on one GPU, where this is overkill.",
    alternatives: ["vLLM", "SGLang"],
  },
  "LM Studio": {
    kind: "service", deployment: "self-hosted", license: "proprietary", language: "TypeScript", cost: "free",
    roles: ["serving", "applied"],
    useWhen: "A desktop GUI for running and serving local models, aimed at one operator.",
    skipWhen: "You need headless, multi-tenant deployment.",
    alternatives: ["Ollama", "llama.cpp"],
  },
  "Triton Inference Server": {
    kind: "runtime", deployment: "self-hosted", license: "BSD-3-Clause", language: "C++", cost: "free",
    roles: ["serving"],
    useWhen: "One endpoint serving ONNX, TensorRT and Python models side by side.",
    skipWhen: "You serve one model family and want peak LLM throughput.",
    alternatives: ["vLLM", "Text Generation Inference"],
  },
  "llamafile": {
    kind: "runtime", deployment: "self-hosted", license: "Apache-2.0", language: "C++", cost: "free",
    roles: ["serving"],
    useWhen: "Shipping a model as a single executable with no install step.",
    skipWhen: "You need batching, multi-GPU serving or a production HTTP server.",
    alternatives: ["llama.cpp", "Ollama"],
  },
  "KoboldCpp": {
    kind: "runtime", deployment: "self-hosted", license: "MIT", language: "C++", cost: "free",
    roles: ["serving"],
    useWhen: "Local generation with a UI tuned for interactive, long-form use.",
    skipWhen: "You need headless serving at scale.",
    alternatives: ["llama.cpp", "Ollama"],
  },
  "PowerInfer": {
    kind: "runtime", deployment: "self-hosted", license: "Apache-2.0", language: "C++", cost: "free",
    roles: ["serving"],
    useWhen: "CPU-first serving where the GPU accelerates rather than carries the load.",
    skipWhen: "You have GPUs to spare — it trades peak throughput for reach.",
    alternatives: ["llama.cpp", "vLLM"],
  },
  "Marlin": {
    kind: "library", deployment: "self-hosted", license: "Apache-2.0", language: "CUDA", cost: "free",
    roles: ["serving"],
    useWhen: "Near-GPU throughput from 4-bit weights, as a kernel inside another runtime.",
    skipWhen: "You need a scheduler and a server as well as a kernel.",
  },

  // ---- 02 Routing & Gateways -------------------------------------------
  "LiteLLM": {
    kind: "library", deployment: "self-hosted", license: "MIT", language: "Python", cost: "free",
    roles: ["platform"],
    useWhen: "The widest provider coverage, deployed the least committal way.",
    skipWhen: "You want routing policy to live in a SaaS console.",
    alternatives: ["Portkey", "Cloudflare AI Gateway", "Envoy AI Gateway"],
  },
  "Portkey": {
    kind: "platform", deployment: "saas", license: "proprietary", language: null, cost: "usage-based",
    roles: ["platform"],
    useWhen: "A managed gateway with guardrails and analytics already bundled.",
    skipWhen: "Prompts cannot leave your infrastructure.",
    alternatives: ["LiteLLM", "Cloudflare AI Gateway"],
    secondHomes: [
      {
        section: "guardrails-safety",
        because: "Its guardrails run inline in the request path, which is where safety checks belong rather than after the response.",
      },
    ],
  },
  "Cloudflare AI Gateway": {
    kind: "service", deployment: "saas", license: "proprietary", language: null, cost: "free-tier",
    roles: ["platform"],
    useWhen: "Edge caching and latency dominate, on Cloudflare already.",
    skipWhen: "Requests must not transit a third party's network.",
    alternatives: ["Portkey", "Envoy AI Gateway"],
  },
  "OpenRouter": {
    kind: "service", deployment: "saas", license: "proprietary", language: null, cost: "usage-based",
    roles: ["platform"],
    useWhen: "One key and one bill across many hosted models, while experimenting.",
    skipWhen: "You need self-hosting or per-provider SLAs.",
    alternatives: ["LiteLLM", "Martian"],
  },
  "Martian": {
    kind: "platform", deployment: "saas", license: "proprietary", language: null, cost: "usage-based",
    roles: ["platform"],
    useWhen: "Routing tuned on your own traffic rather than a public benchmark.",
    skipWhen: "You want the routing rule to be plain config you can read.",
    alternatives: ["RouteLLM", "Not Diamond", "OpenRouter"],
  },
  "Envoy AI Gateway": {
    kind: "runtime", deployment: "self-hosted", license: "Apache-2.0", language: "Go", cost: "free",
    roles: ["platform", "serving"],
    useWhen: "A Kubernetes shop that already runs Envoy and needs the gateway in-cluster.",
    skipWhen: "You want a gateway configurable without a data plane.",
    alternatives: ["LiteLLM", "Cloudflare AI Gateway"],
  },
  "Bifrost": {
    kind: "library", deployment: "self-hosted", license: "proprietary", language: "Go", cost: "free",
    roles: ["platform"],
    useWhen: "A high-throughput OpenAI-compatible proxy with a small footprint.",
    skipWhen: "You need the breadth of a full routing stack.",
    alternatives: ["LiteLLM"],
  },
  "RouteLLM": {
    kind: "library", deployment: "self-hosted", license: "Apache-2.0", language: "Python", cost: "free",
    roles: ["platform", "applied"],
    useWhen: "Cutting cost by matching query difficulty to model size, with a learned router.",
    skipWhen: "You cannot evaluate the quality you would be trading away.",
    alternatives: ["Martian", "Not Diamond"],
  },
  "Not Diamond": {
    kind: "platform", deployment: "saas", license: "proprietary", language: null, cost: "usage-based",
    roles: ["platform", "applied"],
    useWhen: "Routing and prompt optimisation tuned on your own traffic.",
    skipWhen: "Self-hosting or auditability is a requirement.",
    alternatives: ["Martian", "RouteLLM"],
  },
  "TrueFoundry": {
    kind: "platform", deployment: "managed", license: "proprietary", language: null, cost: "subscription",
    roles: ["platform", "production"],
    useWhen: "Gateway, observability and guardrails as one managed deployment.",
    skipWhen: "You want to adopt the pieces independently.",
    alternatives: ["Portkey", "Braintrust"],
    secondHomes: [
      {
        section: "evaluation-observability",
        because: "Its tracing and dashboards are the observability half of the same deployment, not an add-on.",
      },
      {
        section: "guardrails-safety",
        because: "Its guardrails enforce in the call path alongside the gateway rather than as a separate service.",
      },
    ],
  },

  // ---- 03 Retrieval & Vector Stores ------------------------------------
  "pgvector": {
    kind: "database", deployment: "self-hosted", license: "PostgreSQL", language: "SQL", cost: "free",
    roles: ["data"],
    useWhen: "Under a few million vectors, or when retrieval joins rows you already have.",
    skipWhen: "Vector search has become the workload rather than a side feature.",
    alternatives: ["Qdrant", "Milvus", "Weaviate"],
  },
  "Qdrant": {
    kind: "database", deployment: "self-hosted", license: "Apache-2.0", language: "Rust", cost: "free",
    roles: ["data"],
    useWhen: "Vector-first workloads with heavy metadata filtering at scale.",
    skipWhen: "You want no new datastore to operate.",
    alternatives: ["Weaviate", "Milvus", "pgvector"],
  },
  "Weaviate": {
    kind: "database", deployment: "self-hosted", license: "BSD-3-Clause", language: "Go", cost: "free",
    roles: ["data"],
    useWhen: "Hybrid or multi-vector search with a graph-shaped data model.",
    skipWhen: "Your data is genuinely relational and joins matter more than vectors.",
    alternatives: ["Qdrant", "Elasticsearch", "Vespa"],
  },
  "Chroma": {
    kind: "database", deployment: "self-hosted", license: "Apache-2.0", language: "Python", cost: "free",
    roles: ["data", "applied"],
    useWhen: "Getting a prototype working in an afternoon.",
    skipWhen: "You need durability, scaling or concurrent writes.",
    alternatives: ["Qdrant", "pgvector"],
  },
  "Pinecone": {
    kind: "database", deployment: "saas", license: "proprietary", language: null, cost: "usage-based",
    roles: ["data"],
    useWhen: "Zero operational work, and vector search is not your core competence.",
    skipWhen: "Residency, cost predictability or a query language you control.",
    alternatives: ["Turbopuffer", "Milvus", "Qdrant"],
  },
  "Milvus": {
    kind: "database", deployment: "self-hosted", license: "Apache-2.0", language: "Go", cost: "free",
    roles: ["data"],
    useWhen: "Billion-scale indexes with a cloud-native deployment.",
    skipWhen: "You need a small, comprehensible system.",
    alternatives: ["Qdrant", "Weaviate", "pgvector"],
  },
  "Turbopuffer": {
    kind: "database", deployment: "saas", license: "proprietary", language: null, cost: "usage-based",
    roles: ["data"],
    useWhen: "High-recall retrieval at volume, without operating the index yourself.",
    skipWhen: "You need to tune the index directly.",
    alternatives: ["Pinecone", "Qdrant"],
  },
  "Unstructured": {
    kind: "library", deployment: "self-hosted", license: "Apache-2.0", language: "Python", cost: "free",
    roles: ["data"],
    useWhen: "Partitioning messy documents into retrievable chunks before indexing.",
    skipWhen: "Your input is already structured.",
    alternatives: ["Docling", "LlamaParse"],
  },
  "Elasticsearch": {
    kind: "database", deployment: "self-hosted", license: "Elastic-License-2.0", language: "Java", cost: "usage-based",
    roles: ["data"],
    useWhen: "One index carrying BM25 and dense vectors, with ranking you can tune.",
    skipWhen: "You need a permissive licence — the Elastic licence is not OSI-approved.",
    alternatives: ["Vespa", "Weaviate", "Qdrant"],
  },
  "Vespa": {
    kind: "platform", deployment: "self-hosted", license: "Apache-2.0", language: "Java", cost: "free",
    roles: ["data"],
    useWhen: "Ranking-heavy retrieval where the ranking function is the product.",
    skipWhen: "You want a small, low-operations component.",
    alternatives: ["Elasticsearch", "Weaviate"],
  },
  "Rerankers": {
    kind: "service", deployment: "saas", license: "proprietary", language: null, cost: "usage-based",
    roles: ["data"],
    useWhen: "A cross-encoder in the second retrieval stage, to lift precision cheaply.",
    skipWhen: "You have no way to measure whether recall actually improved.",
    alternatives: ["Jina AI", "Unstructured"],
  },
  "Jina AI": {
    kind: "service", deployment: "saas", license: "proprietary", language: null, cost: "usage-based",
    roles: ["data"],
    useWhen: "Multimodal embeddings and a reranker behind one endpoint.",
    skipWhen: "Embeddings must stay in-house.",
    alternatives: ["Rerankers"],
  },
  "LangChain Text Splitters": {
    kind: "library", deployment: "self-hosted", license: "MIT", language: "Python", cost: "free",
    roles: ["data", "applied"],
    useWhen: "Document loaders and splitters, if you are already in that ecosystem.",
    skipWhen: "Structure matters — fixed-size splitting is rarely the right boundary.",
    alternatives: ["Unstructured", "Docling"],
  },
  "Docling": {
    kind: "library", deployment: "self-hosted", license: "MIT", language: "Python", cost: "free",
    roles: ["data"],
    useWhen: "Layout-aware parsing that preserves tables and heading structure.",
    skipWhen: "Your documents are plain text.",
    alternatives: ["Unstructured", "LlamaParse"],
  },
  "LlamaParse": {
    kind: "service", deployment: "managed", license: "proprietary", language: null, cost: "usage-based",
    roles: ["data"],
    useWhen: "Managed parsing for PDFs, especially the ugly ones.",
    skipWhen: "Document contents cannot leave your infrastructure.",
    alternatives: ["Docling", "Unstructured"],
  },

  // ---- 04 Fine-tuning & Training ---------------------------------------
  "Unsloth": {
    kind: "library", deployment: "self-hosted", license: "Apache-2.0", language: "Python", cost: "free",
    roles: ["applied", "serving"],
    useWhen: "LoRA fine-tuning on a single GPU, with memory and time roughly halved.",
    skipWhen: "You need a training stack you can audit line by line.",
    alternatives: ["Axolotl", "PEFT"],
  },
  "Axolotl": {
    kind: "library", deployment: "self-hosted", license: "Apache-2.0", language: "Python", cost: "free",
    roles: ["applied"],
    useWhen: "Configuration-driven fine-tuning across many architectures.",
    skipWhen: "You need to hand-tune the training loop itself.",
    alternatives: ["LLaMA-Factory", "Unsloth"],
  },
  "LLaMA-Factory": {
    kind: "platform", deployment: "self-hosted", license: "Apache-2.0", language: "Python", cost: "free",
    roles: ["applied"],
    useWhen: "One interface for SFT, DPO and RLHF across open models.",
    skipWhen: "You want a minimal, readable training script.",
    alternatives: ["Axolotl", "TRL"],
  },
  "PEFT": {
    kind: "library", deployment: "self-hosted", license: "BSD-3-Clause", language: "Python", cost: "free",
    roles: ["applied"],
    useWhen: "Parameter-efficient fine-tuning — LoRA and variants — on limited hardware.",
    skipWhen: "You need to change the model's capabilities, not bolt on an adapter.",
    alternatives: ["Unsloth", "TRL"],
  },
  "TRL": {
    kind: "library", deployment: "self-hosted", license: "Apache-2.0", language: "Python", cost: "free",
    roles: ["applied"],
    useWhen: "Post-training trainers for SFT, DPO and GRPO on top of any PEFT setup.",
    skipWhen: "You are training from scratch rather than aligning an existing model.",
    alternatives: ["PEFT", "LLaMA-Factory", "torchtune"],
  },
  "DeepSpeed": {
    kind: "library", deployment: "self-hosted", license: "MIT", language: "Python", cost: "free",
    roles: ["serving", "applied"],
    useWhen: "ZeRO sharding and pipeline parallelism across many GPUs.",
    skipWhen: "The model fits on one device — the complexity buys nothing.",
    alternatives: ["Megatron-LM"],
  },
  "Megatron-LM": {
    kind: "library", deployment: "self-hosted", license: "Apache-2.0", language: "CUDA", cost: "free",
    roles: ["serving"],
    useWhen: "Tensor and pipeline parallel pretraining at cluster scale.",
    skipWhen: "You are fine-tuning rather than pretraining.",
    alternatives: ["DeepSpeed"],
  },
  "torchtune": {
    kind: "library", deployment: "self-hosted", license: "BSD-3-Clause", language: "Python", cost: "free",
    roles: ["applied"],
    useWhen: "PyTorch-native recipes that you can read and modify.",
    skipWhen: "You want the breadth of a config-driven stack.",
    alternatives: ["TRL", "LLaMA-Factory"],
  },
  "Hugging Face TRL": {
    kind: "platform", deployment: "saas", license: "proprietary", language: null, cost: "usage-based",
    roles: ["applied"],
    useWhen: "Preference and reward optimisation hosted, without a cluster.",
    skipWhen: "Training data cannot be uploaded to a third party.",
    alternatives: ["TRL"],
  },
  "Colab": {
    kind: "platform", deployment: "saas", license: "proprietary", language: null, cost: "free-tier",
    roles: ["applied"],
    useWhen: "A disposable GPU for a quick experiment, with no setup.",
    skipWhen: "Anything reproducible — a notebook is not a training pipeline.",
    alternatives: ["Replicate"],
  },
  "Replicate": {
    kind: "platform", deployment: "saas", license: "proprietary", language: null, cost: "usage-based",
    roles: ["applied"],
    useWhen: "Hosted fine-tuning and deployment of an open model, billed per run.",
    skipWhen: "You need custom training code or strict residency.",
    alternatives: ["Colab", "Weights & Biases Launch"],
  },
  "Weights & Biases Launch": {
    kind: "platform", deployment: "saas", license: "proprietary", language: null, cost: "subscription",
    roles: ["production", "applied"],
    useWhen: "Managed training runs with sweeps and artifact tracking wired up.",
    skipWhen: "You want training infrastructure you run yourself.",
    alternatives: ["Replicate", "Weights & Biases"],
    secondHomes: [
      {
        section: "evaluation-observability",
        because: "A training run is an experiment, scored against a baseline the same way an eval set scores a prompt.",
      },
    ],
  },

  // ---- 05 Agent Frameworks ---------------------------------------------
  "LangChain": {
    kind: "framework", deployment: "self-hosted", license: "MIT", language: "Python", cost: "free",
    roles: ["applied"],
    useWhen: "Tool use and state, in an ecosystem where the answers already exist.",
    skipWhen: "You want a thin, legible core — this is a large surface.",
    alternatives: ["LlamaIndex", "Pydantic AI", "CrewAI"],
  },
  "LlamaIndex": {
    kind: "framework", deployment: "self-hosted", license: "MIT", language: "Python", cost: "free",
    roles: ["applied", "data"],
    useWhen: "Data-centric work where retrieval is the centre of the problem.",
    skipWhen: "You need agent orchestration more than data access.",
    alternatives: ["LangChain", "Pydantic AI"],
  },
  "Pydantic AI": {
    kind: "framework", deployment: "self-hosted", license: "MIT", language: "Python", cost: "free",
    roles: ["applied"],
    useWhen: "Type-safe agents where schema correctness is the priority.",
    skipWhen: "You want a batteries-included ecosystem.",
    alternatives: ["LangChain", "smolagents", "LlamaIndex"],
  },
  "AutoGen": {
    kind: "framework", deployment: "self-hosted", license: "MIT", language: "Python", cost: "free",
    roles: ["applied"],
    useWhen: "Research into conversable multi-agent systems.",
    skipWhen: "You need something stable and documented for production.",
    alternatives: ["CrewAI", "LangChain"],
  },
  "CrewAI": {
    kind: "framework", deployment: "self-hosted", license: "MIT", language: "Python", cost: "free",
    roles: ["applied"],
    useWhen: "Role-based orchestration where agents are framed as a team.",
    skipWhen: "You want direct control over the loop itself.",
    alternatives: ["AutoGen", "LangChain"],
  },
  "Semantic Kernel": {
    kind: "framework", deployment: "self-hosted", license: "MIT", language: "C#", cost: "free",
    roles: ["applied"],
    useWhen: "Embedding AI steps into an existing .NET estate.",
    skipWhen: "Your stack is not .NET.",
    alternatives: ["LangChain", "Pydantic AI"],
  },
  "Mastra": {
    kind: "framework", deployment: "self-hosted", license: "Apache-2.0", language: "TypeScript", cost: "free",
    roles: ["applied"],
    useWhen: "TypeScript agents with typed workflows and evals built in.",
    skipWhen: "You are working in Python.",
    alternatives: ["Vercel AI SDK", "OpenAI Agents SDK"],
    secondHomes: [
      {
        section: "evaluation-observability",
        because: "Its eval harness ships inside the framework, so grading an agent is part of running it rather than a separate tool.",
      },
    ],
  },
  "OpenAI Agents SDK": {
    kind: "framework", deployment: "self-hosted", license: "Apache-2.0", language: "Python", cost: "free",
    roles: ["applied"],
    useWhen: "A small, legible set of primitives for handoffs and guardrails.",
    skipWhen: "You need multi-provider abstraction at every layer.",
    alternatives: ["Claude Agent SDK", "smolagents"],
    secondHomes: [
      {
        section: "guardrails-safety",
        because: "Guardrails are a first-party primitive on the runner rather than a proxy in front of it.",
      },
    ],
  },
  "Agno": {
    kind: "framework", deployment: "self-hosted", license: "MPL-2.0", language: "Python", cost: "free",
    roles: ["applied"],
    useWhen: "A minimal agent runtime with model-agnostic tool interfaces.",
    skipWhen: "You need the wider ecosystem around it.",
    alternatives: ["smolagents", "Pydantic AI"],
  },
  "Claude Agent SDK": {
    kind: "framework", deployment: "self-hosted", license: "proprietary", language: "TypeScript", cost: "free",
    roles: ["applied"],
    useWhen: "Building agents against Anthropic models, with tool use and hooks.",
    skipWhen: "You need provider independence at the framework layer.",
    alternatives: ["OpenAI Agents SDK", "Letta"],
  },
  "Letta": {
    kind: "platform", deployment: "self-hosted", license: "Apache-2.0", language: "Python", cost: "free",
    roles: ["applied", "data"],
    useWhen: "Agents whose memory is a first-class, inspectable and editable state.",
    skipWhen: "You want memory to be a detail the framework handles for you.",
    alternatives: ["smolagents", "OpenAI Agents SDK"],
    // This is the entry that forced the second-home field. Letta's memory is
    // persisted, queried state over an embedding store — the same layer-3 job —
    // so a reader looking for agent memory under Retrieval was previously right
    // to conclude the taxonomy had no answer for it.
    secondHomes: [
      {
        section: "retrieval-vector-stores",
        because: "Its memory is persisted and retrieved over an embedding store, so it is a layer-3 store with an agent API on top.",
      },
    ],
  },
  "smolagents": {
    kind: "framework", deployment: "self-hosted", license: "Apache-2.0", language: "Python", cost: "free",
    roles: ["applied"],
    useWhen: "Reading the whole agent loop in a page — it is deliberately tiny.",
    skipWhen: "You need a rich tool ecosystem around it.",
    alternatives: ["Agno", "Letta"],
  },
  "Vercel AI SDK": {
    kind: "library", deployment: "self-hosted", license: "Apache-2.0", language: "TypeScript", cost: "free",
    roles: ["applied"],
    useWhen: "Streaming model calls in a TypeScript app, provider-agnostically.",
    skipWhen: "You need agent orchestration rather than model calls.",
    alternatives: ["Mastra", "OpenAI Agents SDK"],
  },

  // ---- 06 Workflow Orchestration ---------------------------------------
  "Temporal": {
    kind: "platform", deployment: "self-hosted", license: "MIT", language: "Go", cost: "free",
    roles: ["platform"],
    useWhen: "Work spanning minutes or hours that must survive restarts and retries.",
    skipWhen: "You need it live in a day — the adoption cost is real.",
    alternatives: ["Inngest", "Restate", "DBOS"],
  },
  "Inngest": {
    kind: "platform", deployment: "saas", license: "Apache-2.0", language: "TypeScript", cost: "free-tier",
    roles: ["platform"],
    useWhen: "Durable step functions in TypeScript, without running the engine.",
    skipWhen: "You are not working in TypeScript.",
    alternatives: ["Trigger.dev", "Temporal"],
  },
  "Trigger.dev": {
    kind: "platform", deployment: "saas", license: "Apache-2.0", language: "TypeScript", cost: "free-tier",
    roles: ["platform"],
    useWhen: "Long-running background jobs that must survive a deploy.",
    skipWhen: "You need more than TypeScript.",
    alternatives: ["Inngest", "Temporal"],
  },
  "Dagster": {
    kind: "platform", deployment: "self-hosted", license: "Apache-2.0", language: "Python", cost: "free",
    roles: ["platform", "data"],
    useWhen: "Data and ML pipelines framed as assets with explicit dependencies.",
    skipWhen: "You want a task queue rather than a lineage-aware orchestrator.",
    alternatives: ["Prefect", "Apache Airflow"],
  },
  "Prefect": {
    kind: "platform", deployment: "self-hosted", license: "Apache-2.0", language: "Python", cost: "free-tier",
    roles: ["platform", "data"],
    useWhen: "Python-native flows with a managed cloud option behind them.",
    skipWhen: "You need deep lineage modelling.",
    alternatives: ["Dagster", "Apache Airflow"],
  },
  "Apache Airflow": {
    kind: "platform", deployment: "self-hosted", license: "Apache-2.0", language: "Python", cost: "free",
    roles: ["platform", "data"],
    useWhen: "Scheduled batch data engineering, where DAGs are the shared language.",
    skipWhen: "You are building a latency-sensitive product — it was not designed for one.",
    alternatives: ["Dagster", "Prefect"],
  },
  "Restate": {
    kind: "platform", deployment: "self-hosted", license: "BSL-1.1", language: "Rust", cost: "free",
    roles: ["platform"],
    useWhen: "Durable execution with a genuinely low-latency stateful API surface.",
    skipWhen: "You need the largest ecosystem around the engine.",
    alternatives: ["Temporal", "DBOS"],
  },
  "DBOS": {
    kind: "library", deployment: "self-hosted", license: "Apache-2.0", language: "Python", cost: "free",
    roles: ["platform"],
    useWhen: "Durable workflows as ordinary Python functions and decorators.",
    skipWhen: "You want a separate service to operate.",
    alternatives: ["Temporal", "Restate"],
  },
  "Fly Machines": {
    kind: "platform", deployment: "managed", license: "proprietary", language: null, cost: "usage-based",
    roles: ["platform", "serving"],
    useWhen: "Hosting stateful containers that fits durable agent workers.",
    skipWhen: "You want to own the infrastructure layer.",
    alternatives: ["Modal", "Trigger.dev"],
  },
  "Modal": {
    kind: "platform", deployment: "saas", license: "proprietary", language: null, cost: "usage-based",
    roles: ["platform", "serving"],
    useWhen: "Serverless GPUs and containers for batch inference and scheduled jobs.",
    skipWhen: "Data locality rules forbid ephemeral compute.",
    alternatives: ["Fly Machines", "Replicate"],
  },

  // ---- 07 Guardrails & Safety ------------------------------------------
  "NeMo Guardrails": {
    kind: "library", deployment: "self-hosted", license: "Apache-2.0", language: "Python", cost: "free",
    roles: ["production"],
    useWhen: "Constraining conversational flow with programmable rails.",
    skipWhen: "You need deep semantic moderation — it is not a classifier.",
    alternatives: ["Guardrails AI", "Llama Guard"],
  },
  "Guardrails AI": {
    kind: "library", deployment: "self-hosted", license: "Apache-2.0", language: "Python", cost: "free",
    roles: ["production"],
    useWhen: "Validators that check output against a schema you define.",
    skipWhen: "You need free-form moderation rather than structural checks.",
    alternatives: ["NeMo Guardrails", "Invariant Guardrails"],
  },
  "Llama Guard": {
    kind: "library", deployment: "self-hosted", license: "Llama-3.1-Community", language: "Python", cost: "free",
    roles: ["production"],
    useWhen: "One classifier covering both prompt and response moderation.",
    skipWhen: "You need domain-specific policy enforcement.",
    alternatives: ["Lakera Guard", "NeMo Guardrails"],
  },
  "Microsoft Presidio": {
    kind: "library", deployment: "self-hosted", license: "MIT", language: "Python", cost: "free",
    roles: ["production"],
    useWhen: "Detecting and anonymising PII in text and images.",
    skipWhen: "Your data is already pseudonymised at source.",
  },
  "Lakera Guard": {
    kind: "service", deployment: "saas", license: "proprietary", language: null, cost: "usage-based",
    roles: ["production"],
    useWhen: "Prompt-injection and jailbreak detection at the gateway.",
    skipWhen: "Requests cannot leave your network.",
    alternatives: ["Llama Guard", "Invariant Guardrails"],
  },
  "garak": {
    kind: "library", deployment: "self-hosted", license: "Apache-2.0", language: "Python", cost: "free",
    roles: ["production"],
    useWhen: "Probing your own system for known vulnerability classes.",
    skipWhen: "You have no remediation path for whatever it finds.",
    alternatives: ["PyRIT"],
  },
  "PyRIT": {
    kind: "library", deployment: "self-hosted", license: "MIT", language: "Python", cost: "free",
    roles: ["production"],
    useWhen: "Generating and scoring attack prompts systematically.",
    skipWhen: "You are not authorised to test the target.",
    alternatives: ["garak"],
  },
  "Invariant Guardrails": {
    kind: "platform", deployment: "managed", license: "proprietary", language: "Python", cost: "usage-based",
    roles: ["production"],
    useWhen: "Guardrails as code, enforced inline in the call path.",
    skipWhen: "Self-hosting is a hard requirement.",
    alternatives: ["Guardrails AI", "Lakera Guard"],
  },

  // ---- 08 Prompt Engineering -------------------------------------------
  "DSPy": {
    kind: "library", deployment: "self-hosted", license: "MIT", language: "Python", cost: "free",
    roles: ["applied"],
    useWhen: "Compiling prompts into optimised programs from labelled examples.",
    skipWhen: "You have no examples and no way to score them.",
    alternatives: ["TextGrad", "PromptLayer"],
  },
  "Instructor": {
    kind: "library", deployment: "self-hosted", license: "MIT", language: "Python", cost: "free",
    roles: ["applied"],
    useWhen: "Schema-validated extraction with typed retry and partial streaming.",
    skipWhen: "You need a hard token-level guarantee rather than validation.",
    alternatives: ["Guidance", "Outlines"],
  },
  "Humanloop": {
    kind: "platform", deployment: "saas", license: "proprietary", language: null, cost: "usage-based",
    roles: ["applied", "platform"],
    useWhen: "Prompt versioning and evaluation run by a product team.",
    skipWhen: "Prompts or data cannot be sent to a vendor.",
    alternatives: ["PromptLayer", "Agenta"],
  },
  "Guidance": {
    kind: "library", deployment: "self-hosted", license: "MIT", language: "Python", cost: "free",
    roles: ["applied"],
    useWhen: "Constrained decoding with control flow interleaved into generation.",
    skipWhen: "You need better ergonomics for plain extraction.",
    alternatives: ["Outlines", "Instructor"],
  },
  "PromptLayer": {
    kind: "platform", deployment: "saas", license: "proprietary", language: null, cost: "usage-based",
    roles: ["applied", "platform"],
    useWhen: "A prompt registry with request logging and regression tests.",
    skipWhen: "You need self-hosting.",
    alternatives: ["Humanloop", "Agenta", "Promptwatch"],
  },
  // Langfuse has one home page, in Evaluation & Observability. Its prompt
  // module is a feature of the same product, so it does not get a second page
  // and a second copy of its attributes — but it does get a second home in
  // Prompt Engineering, which is a cross-reference rather than a duplicate.
  // The two requirements are different and the distinction matters: a second
  // *page* splits the attributes, a second *home* keeps one page and tells the
  // reader where else to look.
  "Langfuse": {
    kind: "platform", deployment: "self-hosted", license: "MIT", language: "TypeScript", cost: "free-tier",
    roles: ["production"],
    useWhen: "Self-hostable tracing, prompts and evals in one place.",
    skipWhen: "You want a fully managed product with a support contract.",
    alternatives: ["LangSmith", "Braintrust", "Arize Phoenix", "Gentrace", "Opik"],
    secondHomes: [
      {
        section: "prompt-engineering",
        because: "Its prompt registry versions prompts and ties each version to the traces and scores it produced.",
      },
    ],
  },
  "Agenta": {
    kind: "platform", deployment: "self-hosted", license: "Apache-2.0", language: "Python", cost: "free-tier",
    roles: ["applied", "platform"],
    useWhen: "Open-source prompt management with a playground and versioning.",
    skipWhen: "You need eval depth rather than prompt ergonomics.",
    alternatives: ["Humanloop", "PromptLayer"],
  },
  "Promptwatch": {
    kind: "platform", deployment: "saas", license: "proprietary", language: null, cost: "usage-based",
    roles: ["production"],
    useWhen: "Prompt regression tests and side-by-side comparison.",
    skipWhen: "You need self-hosting.",
    alternatives: ["PromptLayer", "Agenta", "Humanloop"],
  },
  "TextGrad": {
    kind: "library", deployment: "self-hosted", license: "MIT", language: "Python", cost: "free",
    roles: ["applied"],
    useWhen: "Automatic prompt optimisation via textual feedback loops.",
    skipWhen: "Optimising without an eval set is guessing.",
    alternatives: ["DSPy"],
  },
  "Outlines": {
    kind: "library", deployment: "self-hosted", license: "Apache-2.0", language: "Python", cost: "free",
    roles: ["applied"],
    useWhen: "Token-level constrained generation from a JSON schema or grammar.",
    skipWhen: "Post-hoc validation is enough for your use case.",
    alternatives: ["Guidance", "Instructor"],
  },

  // ---- 09 Evaluation & Observability -----------------------------------
  "LangSmith": {
    kind: "platform", deployment: "saas", license: "proprietary", language: null, cost: "usage-based",
    roles: ["production"],
    useWhen: "Teams already deep in LangChain needing tracing and datasets.",
    skipWhen: "Traces cannot leave your infrastructure.",
    alternatives: ["Langfuse", "Braintrust", "Arize Phoenix"],
  },
  "Braintrust": {
    kind: "platform", deployment: "saas", license: "proprietary", language: null, cost: "usage-based",
    roles: ["production"],
    useWhen: "Making evaluation, rather than tracing, the primary workflow.",
    skipWhen: "You need open formats and self-hosting.",
    alternatives: ["LangSmith", "Langfuse", "DeepEval"],
  },
  "Arize Phoenix": {
    kind: "library", deployment: "self-hosted", license: "Apache-2.0", language: "Python", cost: "free",
    roles: ["production"],
    useWhen: "OpenTelemetry-native evaluation you can run yourself.",
    skipWhen: "You want a vendor support contract behind it.",
    alternatives: ["Langfuse", "Opik", "Gentrace"],
  },
  "promptfoo": {
    kind: "library", deployment: "self-hosted", license: "MIT", language: "TypeScript", cost: "free",
    roles: ["production"],
    useWhen: "Declarative red-teaming and regression tests that run in CI.",
    skipWhen: "You need a managed UI rather than a test runner.",
    alternatives: ["DeepEval", "garak"],
  },
  "DeepEval": {
    kind: "library", deployment: "self-hosted", license: "Apache-2.0", language: "Python", cost: "free",
    roles: ["production"],
    useWhen: "pytest-style evaluation you can run next to your unit tests.",
    skipWhen: "You need a platform rather than a library.",
    alternatives: ["promptfoo", "Braintrust"],
  },
  "Helicone": {
    kind: "platform", deployment: "saas", license: "proprietary", language: null, cost: "free-tier",
    roles: ["production"],
    useWhen: "Gateway-level observability with per-request cost and latency.",
    skipWhen: "You need eval primitives more than traffic logs.",
    alternatives: ["Langfuse", "Gentrace"],
    secondHomes: [
      {
        section: "routing-gateways",
        because: "It observes at the gateway, so the requests it reports on have already passed through layer 2.",
      },
    ],
  },
  "Weights & Biases": {
    kind: "platform", deployment: "saas", license: "proprietary", language: null, cost: "usage-based",
    roles: ["production"],
    useWhen: "Experiment tracking and a model registry, with eval surfaces on top.",
    skipWhen: "You need an open, exportable format.",
    alternatives: ["Weights & Biases Launch", "LangSmith"],
    secondHomes: [
      {
        section: "fine-tuning",
        because: "The model registry and experiment ledger it is known for are training-time surfaces; this entry carries its eval half.",
      },
      {
        section: "workflow-orchestration",
        because: "Sweeps and artifact tracking are the orchestration of many training runs, which is the layer 6 job.",
      },
    ],
  },
  "OpenTelemetry": {
    kind: "library", deployment: "self-hosted", license: "Apache-2.0", language: "multi", cost: "free",
    roles: ["production"],
    useWhen: "A vendor-neutral standard for emitting traces and metrics.",
    skipWhen: "You want a product with a user interface.",
  },
  "Vellum": {
    kind: "platform", deployment: "saas", license: "proprietary", language: null, cost: "usage-based",
    roles: ["production"],
    useWhen: "Prompt and eval work with a visual debugger for chains.",
    skipWhen: "Self-hosting or reproducibility is a requirement.",
    alternatives: ["Humanloop", "Braintrust"],
    secondHomes: [
      {
        section: "prompt-engineering",
        because: "Prompts are versioned artifacts here, diffed and promoted rather than edited in place.",
      },
    ],
  },
  "Gentrace": {
    kind: "platform", deployment: "self-hosted", license: "Apache-2.0", language: "TypeScript", cost: "free-tier",
    roles: ["production"],
    useWhen: "Open-source tracing and dashboards for LLM applications.",
    skipWhen: "You want eval depth more than traffic visibility.",
    alternatives: ["Arize Phoenix", "Helicone", "Opik"],
  },
  "Opik": {
    kind: "platform", deployment: "self-hosted", license: "Apache-2.0", language: "Python", cost: "free",
    roles: ["production"],
    useWhen: "Open-source observability and evaluation you run yourself.",
    skipWhen: "You need enterprise support behind it.",
    alternatives: ["Arize Phoenix", "Gentrace"],
  },
  "Evidently AI": {
    kind: "library", deployment: "self-hosted", license: "Apache-2.0", language: "Python", cost: "free",
    roles: ["production", "data"],
    useWhen: "One evaluation model for both classical ML and LLM systems.",
    skipWhen: "You only need LLM-specific tracing.",
    alternatives: ["DeepEval", "promptfoo"],
  },

  // ---- 10 Learning & Reference (off-stack) -----------------------------
  "Hugging Face": {
    kind: "platform", deployment: "saas", license: "proprietary", language: null, cost: "free-tier",
    roles: ["data", "applied"],
    useWhen: "The model hub, the datasets and the open-source library ecosystem.",
    skipWhen: "You need a self-hosted artefact registry.",
  },
  "Full Stack Deep Learning": { ...READ, roles: ["applied"],
    useWhen: "The practical side of shipping LLM systems, taught end to end.",
    skipWhen: "You want an API reference." },
  "Sebastian Raschka": { ...READ, roles: ["applied"],
    useWhen: "Essays and books that distil research into working knowledge.",
    skipWhen: "You need primary sources." },
  "arXiv": { ...READ, roles: ["applied"],
    useWhen: "The primary preprint record for machine learning research.",
    skipWhen: "You need a curated and explained version." },
  "Papers with Code": { ...READ, roles: ["applied"],
    useWhen: "Linking papers to their reference implementations.",
    skipWhen: "You are offline — it is a live index." },
  "Jay Alammar": { ...READ, roles: ["applied", "data"],
    useWhen: "Visual explanations of transformers, RAG and model internals.",
    skipWhen: "You want depth beyond the intuition." },
  "AI Engineer": { ...READ, roles: ["applied"],
    useWhen: "A community and conference focused on shipping LLM products.",
    skipWhen: "You need technical reference rather than practice." },
  "Hugging Face Cookbook": { ...READ, roles: ["applied"],
    useWhen: "Task-oriented notebooks for fine-tuning, serving and RAG.",
    skipWhen: "You need maintained library documentation." },
  "Made With ML": { ...READ, roles: ["platform"],
    useWhen: "Designing, building and deploying ML systems as a discipline.",
    skipWhen: "You only need LLM-specific material." },
  "Distill": { ...READ, roles: ["production"],
    useWhen: "Carefully explained model and method write-ups — though the publication is now archived.",
    skipWhen: "You need recent work; the archive stopped years ago." },
};
