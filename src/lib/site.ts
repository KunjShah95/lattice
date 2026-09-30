/**
 * Single place for placeholder branding and copy.
 * Swap these values to rebrand the directory — nothing else needs to change.
 */
export const site = {
  /** Wordmark shown in the header and footer. */
  name: "Lattice",
  /** Domain used for canonical URLs and og: tags. */
  url: "https://lattice.example",
  /** <title> template. %s is replaced per-route. */
  titleTemplate: "%s · Lattice",
  defaultTitle: "Lattice — a working directory for AI tooling",
  description:
    "A curated, opinionated index of the tools that make AI systems actually work: inference, evaluation, agents, retrieval, routing, fine-tuning, guardrails and orchestration.",
  /** Shown under the hero. */
  tagline:
    "A curated index of the infrastructure behind working AI systems.",
  /** Counts rendered in the header nav, keyed by category slug. */
  navItems: [
    { label: "Inference", href: "/inference-serving", countKey: "inference-serving" },
    { label: "Evals", href: "/evaluation-observability", countKey: "evaluation-observability" },
    { label: "Agents", href: "/agent-frameworks", countKey: "agent-frameworks" },
    { label: "Retrieval", href: "/retrieval-vector-stores", countKey: "retrieval-vector-stores" },
    { label: "Guardrails", href: "/guardrails-safety", countKey: "guardrails-safety" },
  ],
  copyrightHolder: "Your Name",
  copyrightYear: new Date().getFullYear(),
  contact: {
    email: "hello@example.com",
    x: "https://x.com/yourhandle",
  },
} as const;
