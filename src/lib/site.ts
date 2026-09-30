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
  defaultTitle: "Lattice — the layers behind working AI systems",
  description:
    "A curated, opinionated index of the tools that make AI systems actually work, ordered by where they sit in a production stack: inference, routing, retrieval, fine-tuning, agents, orchestration, guardrails, prompts and evaluation.",
  /** Shown in the footer. */
  tagline:
    "A curated index of the infrastructure behind working AI systems, ordered by depth.",
  copyrightHolder: "Your Name",
  copyrightYear: new Date().getFullYear(),
  contact: {
    email: "hello@example.com",
    x: "https://x.com/yourhandle",
  },
} as const;
