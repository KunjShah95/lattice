import { stackLayers } from "./data";
import { encodeStackInput } from "./stack-url";
import { recommendStack, WORKLOADS, type StackInput, type StackResult } from "./stacks";

/**
 * What a stack's share card draws, as plain data.
 *
 * ## Why a card at all
 *
 * A stack is the one thing on this site a reader makes and then sends to
 * someone. Every link to the builder used to unfurl as the same static card
 * ("Tell me what infrastructure to use"), so a post that said "here is my RAG
 * stack" showed a picture that said nothing about it, and looked identical to
 * every other builder link in the timeline. The card now draws the stack
 * itself: the nine layers, each with the tool picked for it, and the cost band.
 *
 * ## Why this is separate from the drawing
 *
 * `lib/og.tsx` draws; this decides what is drawn. Keeping them apart is what
 * lets the content be tested without rendering an image, and lets three callers
 * (the on-demand card for any shared case, the prerendered card for each
 * workload's own page, and the tests) share one definition of "the stack, as a
 * card".
 */

/** The case a workload's own `/stack/<id>` page and card describe. */
export const WORKLOAD_PAGE_CASE = { queriesPerMonth: 100_000 } as const;

export type StackCardRow = {
  /** The layer's index as the site prints it ("09"). */
  index: string;
  /** The layer's short name ("Evals"). */
  name: string;
  /** Stack depth 1 to 9: picks the band colour. */
  layer: number;
  /** The tool picked for this layer, or null when the workload does not use it. */
  tool: string | null;
};

export type StackCardData = {
  /** "RAG application", as the builder labels the workload. */
  label: string;
  /** What the card is about, in one line: volume and any hard constraint. */
  case: string;
  /** Monthly cost band, formatted. A heuristic, said as one. */
  cost: string;
  /** Surface-first, like the live stack diagram, so the card reads the same way. */
  rows: StackCardRow[];
  /** The picked tools, substrate first: also the text of the card's alt and og:description. */
  tools: string[];
};

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** 200000 as "200K", 2000000 as "2M": how a person says a request volume. */
export function volumeLabel(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${+(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function stackCardData(input: StackInput, result: StackResult = recommendStack(input)): StackCardData {
  const label = WORKLOADS.find((w) => w.id === input.workload)?.label ?? "AI";
  const bySection = new Map(result.picks.map((p) => [p.sectionSlug, p.tool]));

  const rows = [...stackLayers]
    .sort((a, b) => (b.layer ?? 0) - (a.layer ?? 0))
    .map((c) => ({
      index: c.index,
      name: c.short,
      layer: c.layer ?? 0,
      tool: bySection.get(c.slug) ?? null,
    }));

  const tools = [...rows]
    .reverse()
    .map((r) => r.tool)
    .filter((t): t is string => t !== null);

  const volume = `${volumeLabel(input.queriesPerMonth || 0)} requests a month`;
  const parts = [
    volume,
    ...(input.documents ? [`${volumeLabel(input.documents)} documents`] : []),
    ...(input.selfHosted ? ["self-hosted"] : []),
    ...(input.openSource ? ["open source only"] : []),
  ];

  return {
    label,
    case: parts.join(" · "),
    cost: `${usd(result.costLow)} to ${usd(result.costHigh)} a month`,
    rows,
    tools,
  };
}

/** The `og:description` for a shared case: the answer, said once. */
export function stackCardDescription(card: StackCardData): string {
  return `${card.tools.join(", ")}. About ${card.cost} at ${card.case.split(" · ")[0]}, as a heuristic. Every pick comes with when to skip it.`;
}

/** The query string that identifies a case to the on-demand card: normalised, so equal cases share one cached image. */
export function stackCardQuery(input: StackInput): string {
  return encodeStackInput(input);
}

/**
 * Can this runtime render a card for an arbitrary stack on request?
 *
 * The card reads its fonts from disk (`lib/og.tsx`), which a Cloudflare Worker
 * does not have. Vercel's functions do, and `LATTICE_DYNAMIC_CARDS=1` turns it
 * on for any other Node host (a self-hosted `next start`, the e2e suite). Off,
 * a shared stack's page names the prerendered default card instead, so the link
 * still unfurls with an image; it is just not that stack's.
 */
export function perCaseCardsEnabled(): boolean {
  return process.env.VERCEL === "1" || process.env.LATTICE_DYNAMIC_CARDS === "1";
}

/** Where a card for this case lives, or the default card when none can be drawn. */
export function stackCardUrl(origin: string, input: StackInput | null): string {
  return input && perCaseCardsEnabled()
    ? `${origin}/stack-card?${stackCardQuery(input)}`
    : `${origin}/stack-card/default`;
}
