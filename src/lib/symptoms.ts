import { getComparison } from "./comparisons";
import { categories, getToolByName } from "./data";
import { bandOf, type Band } from "./layer";
import { getPost } from "./posts";
import type { QA } from "./seo";

/**
 * Symptom-first entry points: /fix/<symptom>.
 *
 * Every directory in the category routes by *what a tool is*. A reader almost
 * never arrives that way — they arrive with "it is slow" or "it is wrong", and
 * the band a symptom lives in is the question they came with. These pages turn
 * a symptom into an ordered checklist through the stack, cheapest check
 * first, with the tools worth reaching for at each step and — the part no
 * vendor writes — when to skip each one.
 *
 * Tools are named, not linked, so the checklist cannot drift from the index:
 * the resolver below fails the build on any name that no longer exists or
 * that sits in a different layer from the check that cites it.
 */

export type SymptomCheck = {
  /** Stack layer the check happens in. */
  layer: number;
  /** The action, imperative. */
  check: string;
  /** Why it comes at this point in the order. */
  why: string;
  /** Tools worth reaching for at this step, by display name. */
  tools: string[];
};

export type Symptom = {
  slug: string;
  /**
   * The band the symptom presents in — what the reader would call it, per
   * `BANDS[].sounds`. Not where the checklist spends most steps: "too slow"
   * is a compute symptom even though the first check is a trace.
   */
  band: Band;
  /** Short label, as a reader would say it: "Too slow". */
  label: string;
  /** H1, phrased as the query: "Why is my LLM app slow?" */
  title: string;
  /** Meta description. */
  description: string;
  /** 40–75 words that answer the title on their own. */
  answer: string;
  /** Ordered cheapest-first, not by layer. */
  checks: SymptomCheck[];
  /** The moves that look like fixes and are not. */
  notTheFix: string[];
  /** Comparison slugs to read next. */
  comparisons: string[];
  /** Essay slugs to read next. */
  related: string[];
};

export const symptoms: Symptom[] = [
  {
    slug: "llm-app-too-slow",
    band: "compute",
    label: "Too slow",
    title: "Why is my LLM app slow?",
    description:
      "A layer-by-layer checklist for LLM latency: where the time usually goes, which check to run first, and which tools help — or do not — at each step.",
    answer:
      "Most LLM latency comes from output length and sequential calls, not the model server. Trace one slow request end to end, count the tokens it generates, and look for calls that could run in parallel. Cache repeats and stream the response. Only tune or replace the serving runtime once a trace shows the time is actually spent inside it.",
    checks: [
      {
        layer: 9,
        check: "Trace one slow request end to end",
        why: "Latency hides in sequential tool calls, retries and retrieval as often as in generation. You cannot shorten a span you have not seen.",
        tools: ["Langfuse", "Arize Phoenix", "OpenTelemetry"],
      },
      {
        layer: 8,
        check: "Count the output tokens, then ask for fewer",
        why: "Generation time grows with tokens produced. A tighter output format is often the largest single win and costs nothing to try.",
        tools: ["Instructor"],
      },
      {
        layer: 5,
        check: "Find sequential calls that could run in parallel",
        why: "An agent that calls tools one at a time multiplies its latency by the number of steps. Independent steps should not wait for each other.",
        tools: ["Pydantic AI", "OpenAI Agents SDK"],
      },
      {
        layer: 2,
        check: "Cache repeated prompts and add a faster fallback",
        why: "A repeated prompt should never reach a model, and a provider having a slow hour should fail over rather than stall every request.",
        tools: ["LiteLLM", "Cloudflare AI Gateway", "Portkey"],
      },
      {
        layer: 1,
        check: "Only then, tune the serving runtime",
        why: "If you self-host and traces show queueing or slow prefill, batching and prefix caching are the levers. Before that, this is the most expensive place to look.",
        tools: ["vLLM", "SGLang"],
      },
    ],
    notTheFix: [
      "Buying a bigger GPU before measuring where the time goes.",
      "Switching provider on a latency benchmark whose prompt lengths look nothing like yours.",
      "Turning off streaming to simplify the client — it makes the wait feel longer.",
    ],
    comparisons: ["inference-runtimes", "llm-gateways"],
    related: ["choosing-an-inference-runtime", "the-gateway-is-the-product", "observability-is-not-logging"],
  },
  {
    slug: "llm-costs-too-high",
    band: "compute",
    label: "Too expensive",
    title: "Why is my LLM bill so high?",
    description:
      "Where LLM spend usually concentrates, the order to cut it in, and which tools help at each layer — with the trade-off each cut makes against quality.",
    answer:
      "LLM spend is rarely spread evenly: a few features, long prompts or silent retries usually dominate it. Attribute cost per request and feature first. Then shorten prompts and outputs, cache repeats, and route easy queries to cheaper models — with an eval confirming quality held. Self-host only when sustained utilisation makes GPU-hours cheaper than tokens.",
    checks: [
      {
        layer: 9,
        check: "Attribute spend per request, user and feature",
        why: "It is the only cut with no quality risk, and it tells you which of the others is worth doing.",
        tools: ["Helicone", "Langfuse"],
      },
      {
        layer: 8,
        check: "Shrink the prompt and the context you send",
        why: "Input tokens are paid on every call. Context stuffed in just in case is the most common silent cost.",
        tools: ["DSPy"],
      },
      {
        layer: 2,
        check: "Cache repeats and enforce budgets at the gateway",
        why: "A budget is only enforceable where spend is attributed, and a cache hit is a call you do not pay for.",
        tools: ["LiteLLM", "Portkey"],
      },
      {
        layer: 2,
        check: "Route easy queries to a cheaper model",
        why: "A real saving when many queries are easy — but it trades quality for cost by design, so it needs an eval first.",
        tools: ["RouteLLM", "Not Diamond"],
      },
      {
        layer: 1,
        check: "Self-host, if utilisation is high and steady",
        why: "GPU-hours beat per-token pricing only when the GPUs stay busy. Below that line it raises the bill.",
        tools: ["vLLM"],
      },
    ],
    notTheFix: [
      "Negotiating a volume discount before you know which feature spends the money.",
      "Routing to a cheaper model with no eval to say what it loses.",
      "Self-hosting at low utilisation — idle GPUs still bill by the hour.",
    ],
    comparisons: ["cutting-inference-cost", "llm-gateways"],
    related: ["the-cost-model", "context-is-a-budget", "the-gateway-is-the-product"],
  },
  {
    slug: "llm-wrong-answers",
    band: "state",
    label: "Wrong answers",
    title: "Why does my LLM give wrong answers?",
    description:
      "Diagnose wrong LLM answers by layer: retrieval, prompt or weights. The check to run first, what each fix needs, and why fine-tuning comes last.",
    answer:
      "First establish whether the right fact ever reached the model. If it did not, the problem is retrieval or parsing, and no prompt will fix it. If it did and the answer is still wrong, fix the prompt and examples before considering fine-tuning. Either way, collect the failing cases into an eval set first, so you can tell when it is actually fixed.",
    checks: [
      {
        layer: 9,
        check: "Collect the failing cases into an eval set",
        why: "Twenty real failures tell you more than a thousand invented ones, and every fix below needs them to prove it worked.",
        tools: ["promptfoo", "DeepEval", "Braintrust"],
      },
      {
        layer: 3,
        check: "Read the retrieved context for each failure",
        why: "If the answer was not in the context, the ranking is wrong, not the model. Reranking is the cheapest fix with the largest effect.",
        tools: ["Rerankers"],
      },
      {
        layer: 3,
        check: "Check parsing and chunking of the source documents",
        why: "Tables flattened into prose and chunks cut mid-sentence produce context that looks relevant and answers nothing.",
        tools: ["Docling", "Unstructured"],
      },
      {
        layer: 8,
        check: "Fix the prompt: grounding, abstention, output schema",
        why: "When the fact was present and misused, instructions and examples are cheap to change and cheap to revert.",
        tools: ["DSPy", "Instructor"],
      },
      {
        layer: 4,
        check: "Fine-tune last, for narrow and stable behaviour",
        why: "Fine-tuning teaches behaviour, not facts, and leaves you a new model to serve and retrain. Use it when prompting has measurably plateaued.",
        tools: ["Unsloth", "Axolotl"],
      },
    ],
    notTheFix: [
      "Rewriting the prompt when the retrieved context never contained the answer.",
      "Fine-tuning to teach facts — anything that changes monthly belongs in retrieval.",
      "Moving to a larger model before checking what context the current one was given.",
    ],
    comparisons: ["retrieval-finetuning-prompting", "vector-databases", "structured-output"],
    related: ["fix-the-ranking-not-the-prompt", "prompt-or-finetune", "context-is-a-budget"],
  },
  {
    slug: "ai-agent-unreliable",
    band: "control",
    label: "Agent keeps failing",
    title: "Why does my AI agent keep failing?",
    description:
      "Why AI agents fail in production — timeouts, lost state, unvalidated tool calls — and the layer-by-layer order to make one reliable.",
    answer:
      "Agents usually fail at the seams rather than in the model: a tool call times out, a step is retried without being idempotent, or a long run dies with the process that hosted it. Trace every step, validate tool inputs and outputs against schemas, and run the loop on a durable host so steps survive crashes. Narrow the agent's tools before adding instructions.",
    checks: [
      {
        layer: 9,
        check: "Trace every step and tool call",
        why: "An agent failure is a sequence. Without the trace you are debugging the last message, not the step that went wrong.",
        tools: ["LangSmith", "Langfuse"],
      },
      {
        layer: 8,
        check: "Validate tool inputs and outputs against a schema",
        why: "A malformed tool call that is silently accepted fails three steps later, where it is hard to see.",
        tools: ["Instructor"],
      },
      {
        layer: 6,
        check: "Move the loop onto a durable host",
        why: "Long runs need checkpoints, retries and timeouts that survive a deploy. A web request is not a place to run a ten-minute agent.",
        tools: ["Temporal", "Inngest", "Restate"],
      },
      {
        layer: 7,
        check: "Put guardrails at the tool boundary",
        why: "The dangerous moment is an action, not a sentence. Check what the agent is about to do, not only what it says.",
        tools: ["Guardrails AI", "NeMo Guardrails"],
      },
      {
        layer: 5,
        check: "Give it fewer tools and a narrower job",
        why: "Every extra tool is another way to choose wrongly. A narrow agent with three tools beats a general one with twenty.",
        tools: ["Pydantic AI", "OpenAI Agents SDK"],
      },
    ],
    notTheFix: [
      "Adding another paragraph to the system prompt for each new failure.",
      "Giving the agent more tools when it already misuses the ones it has.",
      "Running long agent loops inside a web request with no checkpointing.",
    ],
    comparisons: ["durable-workflows", "gateway-guardrails-evals"],
    related: ["agents-need-a-durable-host", "where-guardrails-belong", "observability-is-not-logging"],
  },
  {
    slug: "measure-llm-changes",
    band: "control",
    label: "Can't tell if it improved",
    title: "How do I know if my LLM changes actually helped?",
    description:
      "How to measure whether a prompt, model or retrieval change improved an LLM app: build an eval set from real failures, score it, and gate changes on it.",
    answer:
      "You need an eval set: real inputs from production with a way to score each output. Start from failures you have actually seen, score them with code checks where possible and a model grader where not, and run the set on every prompt, model or retrieval change. Traces show what happened; only evals show whether it got better.",
    checks: [
      {
        layer: 9,
        check: "Capture production traces you can sample from",
        why: "An eval set built from invented inputs measures your imagination. Real traffic is where the failures are.",
        tools: ["Langfuse", "Arize Phoenix", "Helicone"],
      },
      {
        layer: 9,
        check: "Turn real failures into a scored golden set",
        why: "Start small and real. A golden set that is never updated becomes a benchmark you overfit to.",
        tools: ["Braintrust", "promptfoo"],
      },
      {
        layer: 9,
        check: "Score with code first, a model grader second",
        why: "Deterministic checks are cheap and do not drift. Reserve model graders for what code cannot judge, and spot-check them.",
        tools: ["DeepEval", "promptfoo"],
      },
      {
        layer: 8,
        check: "Version prompts so every score maps to a change",
        why: "A score you cannot tie to a specific prompt version is an anecdote.",
        tools: ["Agenta", "PromptLayer"],
      },
    ],
    notTheFix: [
      "Judging a change by reading a handful of outputs by eye.",
      "Treating a public benchmark score as a proxy for your task.",
      "Building a dashboard of traffic metrics and calling it evaluation.",
    ],
    comparisons: ["llm-observability", "gateway-guardrails-evals"],
    related: ["evals-are-the-asset", "observability-is-not-logging"],
  },
];

/**
 * Resolve names and slugs, and fail the build on anything that drifted.
 * Each check's band is derived from its layer, so a page can show which part
 * of the stack its checklist walks through.
 */
export const resolvedSymptoms = symptoms.map((s) => {
  const checks = s.checks.map((c) => {
    const section = categories.find((cat) => cat.layer === c.layer);
    if (!section) {
      throw new Error(`Symptom "${s.slug}": no section at layer ${c.layer}.`);
    }
    const tools = c.tools.map((name) => {
      const tool = getToolByName(name);
      if (tool.category.layer !== c.layer) {
        throw new Error(
          `Symptom "${s.slug}" cites ${name} at layer ${c.layer}, but it sits at layer ${tool.category.layer}.`,
        );
      }
      return {
        name,
        href: `/${tool.category.slug}/${tool.slug}`,
        useWhen: tool.useWhen,
        skipWhen: tool.skipWhen,
      };
    });
    return { ...c, section: { slug: section.slug, title: section.title }, band: bandOf(c.layer), tools };
  });

  const comparisons = s.comparisons.map((slug) => {
    const c = getComparison(slug);
    if (!c) throw new Error(`Symptom "${s.slug}" links to missing comparison "${slug}".`);
    return { slug, title: c.title };
  });

  const related = s.related.map((slug) => {
    const p = getPost(slug);
    if (!p) throw new Error(`Symptom "${s.slug}" links to missing essay "${slug}".`);
    return { slug, title: p.meta.title, dek: p.meta.dek };
  });

  return { ...s, checks, comparisons, related };
});

export type ResolvedSymptom = (typeof resolvedSymptoms)[number];

export const getSymptom = (slug: string) => resolvedSymptoms.find((s) => s.slug === slug);

/** Visible FAQ + FAQPage JSON-LD for a symptom page. */
export function symptomQuestions(
  s: Pick<Symptom, "title" | "answer" | "notTheFix"> & {
    checks: ReadonlyArray<Pick<SymptomCheck, "check" | "why">>;
  },
): QA[] {
  return [
    { question: s.title, answer: s.answer },
    {
      question: "What should I check first?",
      answer: `${s.checks[0].check}. ${s.checks[0].why}`,
    },
    {
      question: "What looks like a fix but is not?",
      answer: s.notTheFix.join(" "),
    },
  ];
}
