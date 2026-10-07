"use client";

import Link from "next/link";
import { useState } from "react";
import { layerStyle } from "@/lib/layer";

/**
 * "Where do I start?" — a short decision path through the index.
 *
 * A directory can only answer the question it is asked. The stack diagram
 * answers "what exists"; this answers "given what I am building, which parts
 * matter". The answers below are deliberately few and coarse: the point is to
 * route a reader to three or four sections, not to prescribe an architecture.
 *
 * The heading counts the questions instead of repeating the CTA above it. It
 * used to read "Start here", directly under a button reading "Find my starting
 * layers" — the same instruction twice, which made the button look like a
 * section label rather than an action. "Two questions" also states the cost up
 * front, which is the cheapest friction reduction available: a reader can tell
 * before committing whether this is worth their scroll.
 */

type Step = {
  id: string;
  question: string;
  /** Rendered under the question to explain what the reader is deciding. */
  hint: string;
  options: Array<{
    label: string;
    detail: string;
    /** Sections to surface, in order. */
    sections: Array<{ slug: string; short: string; why: string }>;
  }>;
};

const STEPS: Step[] = [
  {
    id: "shape",
    question: "What are you running?",
    hint: "This decides almost everything downstream — the failure modes of an agent and of a summariser are not the same.",
    options: [
      {
        label: "A model, behind an API",
        detail: "One call, maybe a system prompt, maybe a schema.",
        sections: [
          { slug: "routing-gateways", short: "Routing", why: "So swapping providers is not a refactor" },
          { slug: "evaluation-observability", short: "Evals", why: "You cannot tell if a prompt change helped" },
          { slug: "prompt-engineering", short: "Prompts", why: "Where most of your quality actually lives" },
        ],
      },
      {
        label: "A question over my data",
        detail: "Retrieval, then a grounded answer with citations.",
        sections: [
          { slug: "retrieval-vector-stores", short: "Retrieval", why: "Start here — most failures are ranking failures" },
          { slug: "prompt-engineering", short: "Prompts", why: "Grounding, abstention and citation behaviour" },
          { slug: "evaluation-observability", short: "Evals", why: "Retrieval quality is only measurable" },
        ],
      },
      {
        label: "An agent that takes actions",
        detail: "Multi-step, tool use, possibly long-running.",
        sections: [
          { slug: "agent-frameworks", short: "Agents", why: "The orchestration layer" },
          { slug: "workflow-orchestration", short: "Workflows", why: "Durability — how it survives a deploy" },
          { slug: "guardrails-safety", short: "Guardrails", why: "Tool permissions are the real control" },
          { slug: "evaluation-observability", short: "Evals", why: "Multi-step systems fail in ways traces reveal" },
        ],
      },
      {
        label: "Something at scale",
        detail: "Volume, latency or cost is the primary constraint.",
        sections: [
          { slug: "routing-gateways", short: "Routing", why: "Cheapest lever, and attribution lives here" },
          { slug: "inference-serving", short: "Inference", why: "Whether to self-host at all" },
          { slug: "evaluation-observability", short: "Evals", why: "Quality bar you are trading against" },
        ],
      },
    ],
  },
  {
    id: "bottleneck",
    question: "What is currently hardest?",
    hint: "Pick the one that is actually hurting. Most teams have several, and improving the wrong one is a common way to ship nothing.",
    options: [
      {
        label: "The answers are wrong",
        detail: "Quality problem.",
        sections: [
          { slug: "retrieval-vector-stores", short: "Retrieval", why: "Is the evidence even in the context?" },
          { slug: "prompt-engineering", short: "Prompts", why: "Examples beat descriptions" },
          { slug: "fine-tuning", short: "Training", why: "Only after the other two plateau" },
        ],
      },
      {
        label: "I cannot tell if a change helped",
        detail: "Measurement problem. Blocks everything else.",
        sections: [
          { slug: "evaluation-observability", short: "Evals", why: "The only durable asset here" },
          { slug: "prompt-engineering", short: "Prompts", why: "Versioned, diffable prompts" },
        ],
      },
      {
        label: "It costs too much",
        detail: "Cost problem.",
        sections: [
          { slug: "routing-gateways", short: "Routing", why: "Route by task, not by habit" },
          { slug: "inference-serving", short: "Inference", why: "Caching and batching" },
        ],
      },
      {
        label: "It breaks in production",
        detail: "Reliability problem.",
        sections: [
          { slug: "routing-gateways", short: "Routing", why: "Failover, retries, circuit breakers" },
          { slug: "workflow-orchestration", short: "Workflows", why: "If work spans more than one request" },
          { slug: "guardrails-safety", short: "Guardrails", why: "Tool permissions and PII" },
        ],
      },
    ],
  },
];

export function StartHere() {
  const [stepIndex, setStepIndex] = useState(0);
  const [picks, setPicks] = useState<Array<number | null>>([]);

  const step = STEPS[stepIndex];

  function choose(optionIndex: number) {
    const next = [...picks];
    next[stepIndex] = optionIndex;
    setPicks(next);

    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
      return;
    }
    // Fall through to the result once every step is answered.
  }

  function reset() {
    setPicks([]);
    setStepIndex(0);
  }

  const answered = picks.every((p) => p != null) && picks.length === STEPS.length;

  /**
   * Merge the section recommendations, keeping first-seen order. Earlier steps
   * win ties, because the first question is the coarser one.
   */
  const recommended = (() => {
    const order: string[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < STEPS.length; i++) {
      const pick = picks[i];
      if (pick == null) continue;
      for (const s of STEPS[i].options[pick].sections) {
        if (seen.has(s.slug)) continue;
        seen.add(s.slug);
        order.push(s.slug);
      }
    }
    return order;
  })();

  const whyFor = (slug: string) => {
    const reasons: string[] = [];
    for (let i = 0; i < STEPS.length; i++) {
      const pick = picks[i];
      if (pick == null) continue;
      const s = STEPS[i].options[pick].sections.find((x) => x.slug === slug);
      if (s) reasons.push(s.why);
    }
    return reasons;
  };

  if (answered) {
    return (
      <div>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
            Two questions, answered
          </h2>
          <button
            type="button"
            onClick={reset}
            className="press group inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[11px] text-fg-subtle hover:bg-bg-sunken hover:text-fg"
          >
            <span aria-hidden="true" className="inline-block transition-transform duration-500 ease-[var(--ease-spring)] group-hover:-rotate-180">↺</span>
            Start over
          </button>
        </div>

        <ol className="mt-5 space-y-3">
          {recommended.map((slug) => {
            const reasons = whyFor(slug);
            const first = reasons[0];
            return (
              <li key={slug} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
                <Link
                  href={`/${slug}`}
                  className="group -mx-2 flex items-start gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-bg-sunken"
                >
                  <span className="mt-1.5 h-6 w-[3px] shrink-0 rounded-full" style={layerStyle(slugToLayer(slug))} />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-[15px] font-medium transition-colors group-hover:text-accent">
                      {first ?? slug}
                      <span aria-hidden="true" className="nudge inline-block text-fg-subtle">→</span>
                    </span>
                    <span className="mt-0.5 block text-pretty text-[13px] leading-relaxed text-fg-muted">
                      {reasons.join(" · ")}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>

        <p className="editorial-justify mt-6 text-pretty text-[13px] leading-relaxed text-fg-subtle">
          A starting order, not an architecture. If you are still unsure, read{" "}
          <Link
            href="/blog/evals-are-the-asset"
            className="text-fg-muted underline decoration-border-strong underline-offset-4 hover:decoration-accent"
          >
            evals are the asset
          </Link>{" "}
          first — it unblocks every other decision on this list.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline gap-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
          Two questions
        </h2>
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
        {/* Step pips, not just a fraction — the reader sees how far through
            they are at a glance. */}
        <span className="flex items-center gap-2 font-mono text-[11px] text-fg-subtle">
          <span aria-hidden="true" className="flex gap-1">
            {STEPS.map((s, i) => (
              <span
                key={s.id}
                className={`h-1 rounded-full transition-all duration-500 ease-[var(--ease-out)] ${
                  i === stepIndex ? "w-4 bg-accent" : i < stepIndex ? "w-1.5 bg-fg-muted" : "w-1.5 bg-border-strong"
                }`}
              />
            ))}
          </span>
          {stepIndex + 1} / {STEPS.length}
        </span>
      </div>

      <p className="mt-5 text-pretty text-[15px] leading-relaxed text-fg-muted">
        {step.hint}
      </p>

      <h3 className="mt-4 text-balance font-serif text-[21px] font-medium tracking-[-0.01em]">
        {step.question}
      </h3>

      <ul className="mt-5 space-y-2.5">
        {step.options.map((option, i) => (
          <li key={option.label}>
            <button
              type="button"
              onClick={() => choose(i)}
              data-spot=""
              className="btn-paper crop group relative w-full rounded-xl px-4 py-3.5 text-left [--crop-inset:-5px]"
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="flex items-baseline gap-3">
                  {/* Option letters, as on a specification form. */}
                  <span
                    aria-hidden="true"
                    className="grid h-5 w-5 shrink-0 translate-y-[-1px] place-items-center rounded border border-border font-mono text-[10px] text-fg-subtle transition-colors group-hover:border-fg-subtle group-hover:text-fg"
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-[14.5px] font-medium">{option.label}</span>
                </span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="nudge shrink-0 text-fg-subtle transition-colors group-hover:text-fg"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </span>
              <span className="mt-1 block pl-8 text-pretty text-[13px] leading-relaxed text-fg-muted">
                {option.detail}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Section slug → layer, resolved lazily to keep this module import-light. */
function slugToLayer(slug: string): number | null {
  const known: Record<string, number> = {
    "inference-serving": 1,
    "routing-gateways": 2,
    "retrieval-vector-stores": 3,
    "fine-tuning": 4,
    "agent-frameworks": 5,
    "workflow-orchestration": 6,
    "guardrails-safety": 7,
    "prompt-engineering": 8,
    "evaluation-observability": 9,
  };
  return known[slug] ?? null;
}
