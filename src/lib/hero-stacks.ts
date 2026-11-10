import { stackLayers } from "./data";
import { encodeStackInput } from "./stack-url";
import { VOICE_CAVEAT, WORKLOADS, recommendStack, type StackInput, type Workload } from "./stacks";

/**
 * The stacks behind the home page's mini builder, computed at build time.
 *
 * ## Why precomputed
 *
 * The hero has to be the product, and the product is `recommendStack`. Running
 * the engine in the browser would put the whole dataset in the home page's
 * bundle, which is the one route whose weight every visitor pays. The hero
 * asks a single question, and a single question over a closed set has a closed
 * set of answers: so the engine runs here, on the server, once per workload,
 * and the client component only switches between finished results.
 *
 * ## Why it cannot drift from the real builder
 *
 * Each stack carries the `/stack-builder?…` link for the exact input it was
 * computed from. The builder decodes that link and runs the same engine, so
 * the reader who clicks through sees the picks the hero showed, and then gets
 * the questions the hero did not ask. `hero-stacks.test.ts` pins that round
 * trip, because a hero that shows one stack and opens another is worse than a
 * plain link.
 */

/**
 * The workloads offered in the hero, in the order they are shown.
 *
 * Voice is offered, with the engine's own caveat (`VOICE_CAVEAT`) printed
 * under the chips whenever it is chosen: Lattice has no voice layer, so the
 * stack is "a starting proxy, not a verdict", and the hero says so in the
 * same breath as the picks rather than leaving it to the full builder.
 */
export const HERO_WORKLOADS: readonly Workload[] = [
  "rag",
  "agent",
  "chatbot",
  "search",
  "llm-api",
  "finetuned",
  "voice",
];

/** A mid-sized product, not a prototype and not a platform team. */
const HERO_QUERIES = 200_000;
const HERO_DOCUMENTS = 1_000_000;

/** The volume the hero assumes, for the sentence that states it. */
export const HERO_VOLUME_LABEL = "200K requests a month";

/**
 * The case the hero assumes for a workload: the volume above, an interactive
 * latency target, and no hard constraints. Only the questions the builder
 * itself asks for that workload are set (it neutralises the rest), so the
 * link reproduces this input exactly.
 */
export function heroInput(workload: Workload): StackInput {
  const retrieval = workload === "rag" || workload === "search";
  return {
    workload,
    queriesPerMonth: HERO_QUERIES,
    ...(retrieval ? { documents: HERO_DOCUMENTS } : {}),
    ...(workload === "finetuned" ? {} : { latency: "fast" as const }),
  };
}

export type HeroStack = {
  id: Workload;
  label: string;
  detail: string;
  /** The full builder, opened on this exact case. */
  href: string;
  /** Monthly cost band, already formatted. A heuristic, labelled as one. */
  cost: string;
  /** Picked tools, substrate first: the one-line answer under the chips. */
  tools: string[];
  /** Said under the answer when the stack needs a caveat the picks cannot carry. */
  note: string | null;
  /** Section slug → the pick shown in that layer's row of the diagram. */
  picks: Record<string, { tool: string; fit: string; tiedWith: string | null }>;
};

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

const layerOf = new Map(stackLayers.map((c) => [c.slug, c.layer ?? 0]));

export const heroStacks: HeroStack[] = HERO_WORKLOADS.map((id) => {
  const profile = WORKLOADS.find((w) => w.id === id)!;
  const input = heroInput(id);
  const result = recommendStack(input);
  const picks = [...result.picks].sort(
    (a, b) => (layerOf.get(a.sectionSlug) ?? 0) - (layerOf.get(b.sectionSlug) ?? 0),
  );
  return {
    id,
    label: profile.label,
    detail: profile.detail,
    href: `/stack-builder?${encodeStackInput(input)}`,
    cost: `${usd(result.costLow)} to ${usd(result.costHigh)} a month`,
    tools: picks.map((p) => p.tool),
    note: id === "voice" ? VOICE_CAVEAT : null,
    picks: Object.fromEntries(
      picks.map((p) => [p.sectionSlug, { tool: p.tool, fit: p.fitLabel, tiedWith: p.tiedWith }]),
    ),
  };
});
