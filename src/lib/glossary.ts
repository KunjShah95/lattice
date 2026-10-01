/**
 * Glossary of the terms an engineer meets while working through this index.
 *
 * Why this exists: the essays explain reasoning, but a reader arriving from a
 * search engine usually wants the term defined first. A definition that only
 * exists inside an essay is a definition nobody finds.
 *
 * `aliases` exist so auto-linking works on the phrase a reader would actually
 * type, not only on the canonical heading. `tools` are names in the dataset,
 * resolved at build time — a typo fails the build rather than rendering a link
 * to nowhere.
 */

export type GlossaryTerm = {
  slug: string;
  term: string;
  /** One sentence. The thing you would tell someone in a corridor. */
  definition: string;
  /** What it implies for a decision — the part an index should carry. */
  detail: string;
  /** Stack layer this belongs to, for colour and grouping. Null if cross-cutting. */
  layer: number | null;
  tools?: string[];
  /** Other glossary slugs. */
  see?: string[];
  /** Lowercase phrases that should also auto-link. */
  aliases?: string[];
};

export const glossary: GlossaryTerm[] = [
  // ---- Layer 1: inference -------------------------------------------------
  {
    slug: "paged-attention",
    term: "Paged attention",
    definition:
      "Managing the KV cache in fixed-size blocks rather than one contiguous allocation, so memory is not fragmented and sequences can share a batch.",
    detail:
      "This is the change that made GPU serving practical at scale, and the reason vLLM became the default. Before it, a batch was sized for the worst-case sequence in it. After it, you size for the average and grow dynamically. If you are choosing a runtime and do not know any other criterion, this is the one to know.",
    layer: 1,
    tools: ["vLLM"],
    see: ["kv-cache", "continuous-batching"],
    aliases: ["paged attention"],
  },
  {
    slug: "kv-cache",
    term: "KV cache",
    definition:
      "The saved attention keys and values from tokens already processed, so the model does not recompute them for every new token.",
    detail:
      "It is what makes generation incremental rather than quadratic, and its size is the main thing that determines how many concurrent sequences fit on a GPU. It grows with context length and batch size, which is why long contexts and high concurrency compete for the same memory.",
    layer: 1,
    see: ["paged-attention", "prefix-caching", "context-window"],
  },
  {
    slug: "continuous-batching",
    term: "Continuous batching",
    definition:
      "Adding new sequences to a batch as others finish, rather than waiting for the whole batch to complete.",
    detail:
      "It exploits the fact that sequence lengths vary wildly within a batch — waiting for the longest wastes most of the slot. Under steady, low-concurrency traffic there is never enough in flight to fill a batch, so this buys you nothing. That traffic-shape dependency is the biggest single factor in picking a runtime.",
    layer: 1,
    tools: ["vLLM", "SGLang"],
    see: ["time-to-first-token", "throughput"],
  },
  {
    slug: "prefix-caching",
    term: "Prefix caching",
    definition:
      "Reusing the KV cache for a prompt prefix that has already been processed, instead of recomputing it.",
    detail:
      "If a large share of your requests begin with the same few hundred tokens — a long system prompt, a cached document, a shared tool schema — this is worth more than every other optimisation combined. If your prompts are short and unrelated, neither vLLM's automatic prefix caching nor SGLang's RadixAttention will do much. It also makes a stable system prompt dramatically cheaper than a per-request one.",
    layer: 1,
    tools: ["SGLang", "vLLM"],
    see: ["kv-cache", "prompt-caching"],
  },
  {
    slug: "quantisation",
    term: "Quantisation",
    definition:
      "Storing and computing model weights in fewer bits than they were trained in, to trade accuracy for memory and speed.",
    detail:
      "8-bit is nearly free in quality; 4-bit usually is not, and the method matters more than the bit count — AWQ and GPTQ are perceptually better than naive rounding at the same width. FP8 is the easier win on recent NVIDIA hardware. Quantisation changes your throughput numbers but not your architectural decisions, so do it after you have chosen a runtime, not before.",
    layer: 1,
    tools: ["llama.cpp", "Marlin", "TensorRT-LLM"],
    see: ["distillation"],
  },
  {
    slug: "tensor-parallelism",
    term: "Tensor parallelism",
    definition:
      "Splitting a single layer's computation across several GPUs, so every token passes through all of them.",
    detail:
      "It is the default answer to 'the model does not fit' and the easiest to get wrong, because it adds a collective operation to every forward pass and the cost grows with sequence length. If your model fits on one GPU with room for KV cache, do not do it. Two GPUs running two replicas behind a load balancer will usually beat one GPU running a sharded 70B.",
    layer: 1,
    see: ["throughput", "kv-cache"],
  },
  {
    slug: "speculative-decoding",
    term: "Speculative decoding",
    definition:
      "Using a small draft model to propose several tokens at once, which a large model then verifies in a single pass.",
    detail:
      "It is exact — the output distribution is unchanged — and speeds up decoding where it is bottlenecked on memory bandwidth rather than compute. The gain depends on the draft model agreeing with the target, so it helps most for predictable text and least for genuinely creative work. Worth trying when you have already exhausted batching and quantisation.",
    layer: 1,
    see: ["kv-cache", "continuous-batching"],
  },
  {
    slug: "time-to-first-token",
    term: "Time to first token",
    definition:
      "The delay between sending a request and receiving the first token of the response.",
    detail:
      "It is the latency number users actually perceive, and it is dominated by queueing rather than by model speed. A user-facing chatbot is judged on TTFT; a batch job is judged on total throughput. Conflating them is how teams end up optimising the wrong metric for months.",
    layer: 1,
    see: ["throughput", "continuous-batching"],
  },
  {
    // One entry, two senses. Throughput and latency trade against each other,
    // so separating them would give a reader half the idea.
    slug: "throughput",
    term: "Throughput and latency",
    definition:
      "Throughput is tokens per second across the whole deployment; latency is how long one request takes. They trade directly against each other.",
    detail:
      "Batching raises throughput by making each request slower, so the two cannot be optimised independently. What you want depends entirely on traffic shape: an interactive product needs bounded latency under whatever concurrency arrives, a batch job wants total tokens cheap. Benchmark on a concurrency sweep and plot both — never single-stream latency, which will point you at the wrong runtime.",
    layer: 1,
    see: ["time-to-first-token", "continuous-batching"],
    aliases: ["throughput vs latency"],
  },
  {
    slug: "constrained-output",
    term: "Constrained decoding",
    definition:
      "Masking the token space during generation so the output can only be a valid instance of a schema, grammar or regex.",
    detail:
      "Unlike asking a model politely for JSON, this cannot be violated — there is no way to emit a token that would break the grammar. The trade is that constraining generation can make a model look worse at reasoning than it is, so never benchmark reasoning through it. Reach for it when downstream code cannot tolerate malformed output; use validation-and-retry when ergonomics matter more.",
    layer: 1,
    tools: ["Outlines", "Guidance"],
    see: ["schema-enforcement"],
    aliases: ["constrained decoding", "constrained generation"],
  },
  {
    slug: "schema-enforcement",
    term: "Validation and repair",
    definition:
      "Generating freely, then validating the output against a schema and retrying with the error fed back.",
    detail:
      "Weaker than constrained decoding but far more ergonomic, and it handles messy extraction that token masking handles awkwardly. It gives a typed retry rather than a guarantee. If you cannot decide between the two, start here.",
    layer: 1,
    tools: ["Instructor"],
    see: ["constrained-output"],
  },

  // ---- Layer 2: routing ---------------------------------------------------
  {
    slug: "model-router",
    term: "Model router",
    definition:
      "A layer that chooses which model answers a given request, from signals known before the model is called.",
    detail:
      "The workable signals are explicit task identity, user tier, and deterministic input properties. The signal that does not work is a subjective read of how hard the prompt looks — that is where the escalation trap begins, where failures cluster on genuinely hard requests and you pay twice for exactly the cases the big model was needed for.",
    layer: 2,
    tools: ["LiteLLM", "RouteLLM", "Martian"],
    see: ["escalation-trap", "semantic-cache"],
  },
  {
    slug: "escalation-trap",
    term: "The escalation trap",
    definition:
      "Routing cheap-first and retrying on a bigger model when the answer looks bad, which usually costs more than routing correctly up front.",
    detail:
      "Three reasons it fails: the cheap model cannot judge its own output, failures cluster on hard cases so escalation doubles cost precisely where it was needed, and one provider hiccup away from a retry storm. It only works when a failure is externally observable — a schema check, a downstream test — in which case it is not a vibe but a validated retry.",
    layer: 2,
    see: ["model-router", "circuit-breaker"],
  },
  {
    slug: "semantic-cache",
    term: "Semantic cache",
    definition:
      "Reusing a previous response when a new request is sufficiently similar in meaning, skipping the model call entirely.",
    detail:
      "The fastest cost reduction available, and the easiest to get wrong: a cached answer goes stale in a way nobody notices. Scope it by embedding similarity *and* a version of everything that affected the answer, and never cache calls with side effects.",
    layer: 2,
    tools: ["Portkey", "Cloudflare AI Gateway"],
    see: ["model-router", "prompt-caching"],
  },
  {
    slug: "circuit-breaker",
    term: "Circuit breaker",
    definition:
      "A per-provider, per-model gate that stops sending traffic somewhere after repeated failures, then probes for recovery.",
    detail:
      "Provider error rates are real and are not independent across providers. A retry policy that assumes independence turns a partial outage into a total one by stampeding the survivor. Breaker plus jittered retries is the minimum for a gateway worth running.",
    layer: 2,
    see: ["escalation-trap"],
  },
  {
    slug: "prompt-caching",
    term: "Provider prompt caching",
    definition:
      "A discount providers apply when a request repeats a prefix they have already processed.",
    detail:
      "Completely separate from prefix caching in your own runtime: this is a billing discount, that is a computation saving. The practical consequence is that a large, stable system prompt is far cheaper than one rebuilt per request — which makes prompt structure a cost decision, not just a readability one.",
    layer: 2,
    see: ["prefix-caching", "cost-per-outcome"],
  },

  // ---- Layer 3: retrieval -------------------------------------------------
  {
    slug: "embedding",
    term: "Embedding",
    definition:
      "A vector representation of text such that semantically similar inputs land near each other.",
    detail:
      "The same model must produce embeddings for documents and queries, or the space is meaningless. The failure mode to know about: embeddings are bad at exact tokens — part numbers, error codes, names — because `ERR-4421` and `ERR-4412` really are nearly the same thing. Users type exact tokens constantly.",
    layer: 3,
    see: ["hybrid-search", "vector-index", "chunking"],
  },
  {
    slug: "chunking",
    term: "Chunking",
    definition:
      "Splitting documents into retrievable pieces, which is where RAG quality is mostly won and lost.",
    detail:
      "Fixed token count with overlap is close to the worst reasonable option: it cuts through sentences, tables and arguments. Chunk on structure — headings, paragraphs, table rows — and carry the heading path in the chunk metadata so retrieved text has its own context. Then check the number that correlates most with answer quality: how many chunks you actually feed the model. Fifty is almost always worse than five.",
    layer: 3,
    tools: ["Unstructured", "Docling"],
    see: ["embedding", "reranking", "context-window"],
  },
  {
    slug: "hybrid-search",
    term: "Hybrid search",
    definition:
      "Combining lexical retrieval (BM25) with vector retrieval, so exact matches and semantic matches are both found.",
    detail:
      "Pure vector search misses the specific tokens users type; pure lexical misses paraphrase. Unioning the candidates and then reranking gets both. Most vector databases support this as a single query, and managed ones often behind a flag. If yours does not, that alone justifies a migration.",
    layer: 3,
    tools: ["Elasticsearch", "Qdrant", "Weaviate"],
    see: ["reranking", "reciprocal-rank-fusion"],
  },
  {
    slug: "reranking",
    term: "Reranking",
    definition:
      "Re-scoring retrieved candidates with a slower, more accurate model before the generator sees them.",
    detail:
      "Bi-encoders embed query and document independently — that is what makes them fast enough to search millions of vectors, and also why they judge relevance poorly. A cross-encoder sees both at once and is far better, but far too slow for the whole corpus. So: cheap retrieval for fifty candidates, cross-encoder for the best five. The highest-leverage addition to an existing RAG system, and the cheapest to try.",
    layer: 3,
    tools: ["Rerankers", "Jina AI"],
    see: ["hybrid-search", "recall-at-k"],
  },
  {
    slug: "reciprocal-rank-fusion",
    term: "Reciprocal rank fusion",
    definition:
      "Merging ranked lists from several retrievers by summing the reciprocal of each result's rank, rather than comparing scores.",
    detail:
      "Score-based fusion requires the retrievers to be on a comparable scale, which they are not. RRF sidesteps that entirely by only using positions, which is why it is the default in hybrid search and almost always the right first attempt.",
    layer: 3,
    see: ["hybrid-search", "reranking"],
  },
  {
    slug: "vector-index",
    term: "Vector index",
    definition:
      "An approximate structure — usually HNSW or an IVF variant — that finds nearest neighbours without scanning every vector.",
    detail:
      "Approximate means a recall/latency trade controlled by a build parameter, which is why you should benchmark recall against a brute-force scan on your own data rather than trusting a published figure. If your corpus is under a few million vectors, brute force is often fast enough and exactly correct.",
    layer: 3,
    see: ["recall-at-k", "embedding"],
  },
  {
    slug: "recall-at-k",
    term: "Recall@k",
    definition:
      "Of the documents that should answer a query, the fraction that appear in the top k retrieved.",
    detail:
      "The single diagnostic that separates a retrieval problem from a generation problem: if the answer is not in the top k, no prompt change will help. Check it on twenty real queries before changing anything. It costs an hour and determines everything that follows.",
    layer: 3,
    see: ["reranking", "vector-index", "hybrid-search"],
  },
  {
    slug: "context-window",
    term: "Context window",
    definition:
      "The number of tokens a model can consider at once — a ceiling on what you can send, not a target for what you should.",
    detail:
      "Long contexts degrade silently rather than gracefully. Models reliably answer from the beginning and end of a long document and perform near chance on the middle. A 50k-token context is therefore a few thousand tokens of reliable signal plus a large quantity that is present, billed, and largely ignored.",
    layer: 3,
    see: ["chunking", "reranking", "kv-cache"],
  },

  // ---- Layer 4: training --------------------------------------------------
  {
    slug: "lora",
    term: "LoRA",
    definition:
      "Training small low-rank matrices alongside frozen weights, so you can adapt a large model without touching it.",
    detail:
      "Adapter weights are a few percent of the base model, so training needs a fraction of the memory. QLoRA additionally quantises the frozen base to 4-bit, which brings single-GPU adaptation of models that previously needed several. The practical cost is inference: adapters are only useful if someone is serving them.",
    layer: 4,
    tools: ["PEFT", "Unsloth"],
    see: ["quantisation", "distillation", "sft"],
  },
  {
    slug: "sft",
    term: "Supervised fine-tuning",
    definition:
      "Training on curated input/output pairs so the model adopts a specific task or response style.",
    detail:
      "The baseline post-training step. Its value depends entirely on example quality: a thousand mediocre pairs produce a model that is reliably mediocre. SFT teaches format and behaviour; it does not reliably teach knowledge, which is what people expect it to do and what it cannot do.",
    layer: 4,
    tools: ["TRL", "Axolotl", "LLaMA-Factory"],
    see: ["lora", "dpo", "distillation"],
  },
  {
    slug: "dpo",
    term: "Direct preference optimisation",
    definition:
      "Aligning a model to human preferences without an explicit reward model, by optimising on chosen-versus-rejected pairs.",
    detail:
      "Removes the reward-model training step and its instabilities, which is why it largely replaced RLHF in practice. It needs preference data, which is expensive to produce well — and is where most projects quietly stall.",
    layer: 4,
    tools: ["TRL"],
    see: ["sft", "rlhf", "grpo"],
  },
  {
    slug: "rlhf",
    term: "RLHF",
    definition:
      "Reinforcement learning from human feedback: training a reward model from preferences, then optimising the policy against it.",
    detail:
      "The method that made instruction-tuned assistants work, and now largely superseded in new work by DPO and GRPO because of its instability and cost. Still the reference point when you need to understand where the alternatives came from.",
    layer: 4,
    see: ["dpo", "grpo"],
  },
  {
    slug: "grpo",
    term: "GRPO",
    definition:
      "Group relative policy optimisation — a reinforcement-learning method that compares a group of sampled answers rather than learning a separate reward model.",
    detail:
      "Useful when you have a verifiable reward, a checker or a test, rather than human preference. It sidesteps reward-model training, which is the expensive and fragile part, and is why it shows up in reasoning-model post-training.",
    layer: 4,
    tools: ["TRL"],
    see: ["dpo", "rlhf"],
  },
  {
    slug: "distillation",
    term: "Distillation",
    definition:
      "Training a smaller model against the outputs of a larger one, to get most of the behaviour at a fraction of the cost.",
    detail:
      "The best-understood reason to fine-tune, because you have a reference and the training signal is mechanical. The result is a model slightly worse at the edges and dramatically cheaper, which for high-volume well-defined tasks is usually the right trade. Note this is different from quantisation, which changes no behaviour at all.",
    layer: 4,
    tools: ["Unsloth", "TRL"],
    see: ["quantisation", "sft", "cost-per-outcome"],
  },
  {
    slug: "zero",
    term: "ZeRO",
    definition:
      "Sharding optimiser states, gradients and parameters across data-parallel workers to fit a larger model on the same GPUs.",
    detail:
      "The memory optimisation that makes fine-tuning large models on modest clusters possible. If your model already fits on one device, ZeRO buys nothing and costs communication.",
    layer: 4,
    tools: ["DeepSpeed"],
    see: ["tensor-parallelism"],
  },

  // ---- Layer 5: agents ----------------------------------------------------
  {
    slug: "tool-calling",
    term: "Tool calling",
    definition:
      "A model emitting a structured request to call a function, which your code executes and returns the result of.",
    detail:
      "The mechanism almost all agent systems are built on. The security consequence is that a tool call is model output with the same failure modes as anything else the model produces — including injection arriving via retrieved content or a tool's own error message. Treat arguments as untrusted input.",
    layer: 5,
    tools: ["OpenAI Agents SDK", "Claude Agent SDK"],
    see: ["prompt-injection", "agent-loop"],
  },
  {
    slug: "agent-loop",
    term: "Agent loop",
    definition:
      "The control structure where a model decides an action, it is executed, and the result feeds the next turn until the task is done.",
    detail:
      "Twenty lines, and the least interesting part of an agent system. The engineering is in the host around it: surviving a deploy mid-loop, idempotent side effects, and a hard ceiling on turns and tokens. Prompts are advisory; only the host can stop a loop.",
    layer: 5,
    see: ["tool-calling", "durable-execution", "budget-ceiling"],
  },
  {
    slug: "mcp",
    term: "Model Context Protocol",
    definition:
      "An open protocol for exposing tools, resources and prompts to models, so integrations are written once rather than per model provider.",
    detail:
      "The main thing to know is that it moves the integration burden from 'an adapter per provider per tool' to 'one server per tool'. The corollary is a security one: an MCP server is a new dependency that can exfiltrate whatever it is given, so it deserves the same review as any other external service.",
    layer: 5,
    see: ["tool-calling", "prompt-injection"],
  },
  {
    slug: "budget-ceiling",
    term: "Budget ceiling",
    definition:
      "A hard limit on turns, tokens or wall-clock time, enforced by the host rather than requested in the prompt.",
    detail:
      "The instinct is to write 'you have at most ten turns' in the system prompt. That does not work: a prompt is a suggestion to a system good at generating plausible text, with no privileged access to its own budget. Every guarantee you give a user about an agent is a promise the host is keeping.",
    layer: 5,
    see: ["agent-loop", "cost-per-outcome"],
  },

  // ---- Layer 6: orchestration --------------------------------------------
  {
    slug: "durable-execution",
    term: "Durable execution",
    definition:
      "A workflow engine that checkpoints progress so work resumes after a crash, rather than restarting from nothing.",
    detail:
      "Long, multi-step, partially-completed work full of slow external calls is exactly what these engines were built for, and agent loops are a textbook use case. It solves durability — not idempotency. If the process dies between two side effects, replay will repeat the first unless you designed for it.",
    layer: 6,
    tools: ["Temporal", "Inngest", "DBOS"],
    see: ["idempotency-key", "agent-loop"],
  },
  {
    slug: "idempotency-key",
    term: "Idempotency key",
    definition:
      "A client-supplied identifier that lets a server recognise a repeated request and return the original result rather than acting twice.",
    detail:
      "The difference between 'the deploy interrupted my agent' and 'the deploy interrupted my agent and it charged the customer twice'. Durable execution gets you the retry; idempotency gets you safety under it. Side-effecting tools should require one.",
    layer: 6,
    see: ["durable-execution"],
  },

  // ---- Layer 7: safety ----------------------------------------------------
  {
    slug: "prompt-injection",
    term: "Prompt injection",
    definition:
      "An attacker getting instructions into your context that your model then follows as if they came from you.",
    detail:
      "Not a bug to be fixed but a property of systems that read untrusted text and act on it. Input filtering catches known patterns; the durable mitigation is not trusting the model's reasoning about permissions, and re-deriving authorisation from authoritative state rather than accepting its claim.",
    layer: 7,
    tools: ["Lakera Guard", "garak"],
    see: ["tool-calling", "guardrail"],
  },
  {
    slug: "guardrail",
    term: "Guardrail",
    definition:
      "Any control that keeps a model from doing something you have decided it must not do.",
    detail:
      "'Safety' is three distinct controls in three distinct places: input filtering in front of the model, output classification behind it, and tool permissions around the actions. Most incidents are one of them missing while the other two look fine. The third is the one that matters and the one almost always missing.",
    layer: 7,
    tools: ["NeMo Guardrails", "Guardrails AI"],
    see: ["prompt-injection", "llama-guard"],
  },
  {
    slug: "llama-guard",
    term: "Safety classifier",
    definition:
      "A model, distinct from the one you are serving, that labels content as safe or unsafe.",
    detail:
      "A probabilistic control, which means the error rate is multiplicative with volume: 1% false negatives on a million requests is ten thousand leaks. Treat the rate as a design input and layer independent checks on the actions that matter.",
    layer: 7,
    tools: ["Llama Guard"],
    see: ["guardrail", "pii-redaction"],
  },
  {
    slug: "pii-redaction",
    term: "PII redaction",
    definition:
      "Detecting and masking personal data before it enters a system you do not control.",
    detail:
      "Redact at write time, not at read time. A trace store holding unredacted personal data is a liability that grows with every request, and you cannot retroactively redact what you already logged.",
    layer: 7,
    tools: ["Microsoft Presidio"],
    see: ["guardrail", "llama-guard"],
  },

  // ---- Layer 8: prompting -------------------------------------------------
  {
    slug: "few-shot",
    term: "Few-shot prompting",
    definition:
      "Including worked examples in the prompt instead of only describing what you want.",
    detail:
      "The single highest-leverage prompting technique, and routinely skipped in favour of another paragraph of instructions. An example conveys format, tone and edge-case handling simultaneously, in a way that prose specifications approach but do not reach.",
    layer: 8,
    see: ["system-prompt", "constrained-output"],
  },
  {
    slug: "system-prompt",
    term: "System prompt",
    definition:
      "The instruction block that frames a conversation, separate from the user's messages.",
    detail:
      "Two things about it are easy to get wrong. It is usually where you put behaviour instructions that belong in a validation function, where they will be followed unreliably. And if it is stable, splitting it out and reusing it verbatim enables prefix caching, which is often the single largest cost win available.",
    layer: 8,
    see: ["few-shot", "prompt-caching"],
  },

  // ---- Layer 9: evaluation -----------------------------------------------
  {
    slug: "golden-set",
    term: "Golden set",
    definition:
      "A small, curated set of real cases, with expected behaviour written down, used to tell whether a change helped.",
    detail:
      "Twenty examples taken from real production traffic beats a thousand invented ones, because twenty real failures contain more information about your actual distribution. A golden set that is never updated becomes a benchmark you have overfitted to — you will improve your score and ship a regression.",
    layer: 9,
    tools: ["Braintrust", "DeepEval"],
    see: ["llm-as-judge", "eval-gate"],
  },
  {
    slug: "llm-as-judge",
    term: "LLM-as-judge",
    definition:
      "Using a model to score output against a written rubric, in place of a human.",
    detail:
      "It works, with two caveats that are frequently ignored. Position bias: the same rubric graded with the answer and the reference in swapped order produces different scores, so randomise it. And the judge must be stronger than what it is judging — a weak judge grading a strong model measures the judge.",
    layer: 9,
    tools: ["Braintrust", "Arize Phoenix"],
    see: ["golden-set", "eval-gate"],
  },
  {
    slug: "eval-gate",
    term: "Regression gate",
    definition:
      "A check in CI that blocks a merge when a change makes a scored dimension worse.",
    detail:
      "The thing that makes evals an asset rather than a dashboard. Without it you can still debug with traces; you just cannot tell whether anything you changed helped. Put it in CI on every commit and let it fail — a failing eval is the system telling you something true.",
    layer: 9,
    tools: ["promptfoo"],
    see: ["golden-set", "llm-as-judge", "shadow-traffic"],
  },
  {
    slug: "shadow-traffic",
    term: "Shadow traffic",
    definition:
      "Replaying a sample of production requests against a candidate model without serving the answers.",
    detail:
      "The only way to get a real answer to 'is the new model better' before you switch, and much cheaper than finding out from users. The limitation is that it measures agreement, not satisfaction — you still need an outcome signal.",
    layer: 9,
    see: ["eval-gate", "model-router"],
  },

  // ---- Cross-cutting ------------------------------------------------------
  {
    slug: "cost-per-outcome",
    term: "Cost per successful outcome",
    definition:
      "Total spend divided by the count of requests that passed whatever quality bar you can define.",
    detail:
      "The metric that inverts priorities. Work that fails often and retries becomes visibly expensive; long contexts that do not improve accuracy become visibly wasteful; model calls made 'just in case' stop being invisible. Tokens are an input to this, not the number itself.",
    layer: null,
    see: ["golden-set", "distillation", "semantic-cache"],
  },
  {
    slug: "open-weight",
    term: "Open weight vs open source",
    definition:
      "Open weights means you can download and run the model. Open source additionally means the training data, training code and licence permit modification and redistribution.",
    detail:
      "The distinction matters commercially and legally, and most tools called 'open source' are only open-weight. It is also the distinction that decides whether you can fine-tune it, host it for customers, or audit what was trained into it.",
    layer: null,
  },
  {
    slug: "mixture-of-experts",
    term: "Mixture of experts",
    definition:
      "A model with many parameter blocks, of which only a small number are activated per token.",
    detail:
      "It decouples parameter count from per-token compute, which is how you get a large model's quality at a small model's cost. The practical consequences are operational: the weights are large even though compute is not, and serving needs to be expert-aware.",
    layer: 1,
    see: ["distillation", "quantisation"],
  },
  {
    slug: "hallucination",
    term: "Hallucination",
    definition:
      "Fluent, confident output that is not supported by the input or by evidence.",
    detail:
      "Usually discussed as a model property. In practice it is overwhelmingly a *retrieval* and *verification* problem: the model was not given the fact, or was not asked to check. Constrained decoding, citation requirements and abstention do more than any amount of prompting.",
    layer: null,
    see: ["context-window", "recall-at-k", "schema-enforcement"],
  },
];

/** Terms whose definition should also appear under a plain-language label. */
export const getGlossaryTerm = (slug: string) =>
  glossary.find((t) => t.slug === slug);

/** Every phrase that should auto-link, mapped to the term it points at. */
export const glossaryLinkMap: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const t of glossary) {
    map[t.term] = `/glossary/${t.slug}`;
    for (const alias of t.aliases ?? []) map[alias] = `/glossary/${t.slug}`;
  }
  return map;
})();
