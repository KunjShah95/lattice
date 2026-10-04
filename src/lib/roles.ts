import type { Role } from "./types";

/**
 * The specialisation axis: who needs a tool, as opposed to what it is.
 *
 * Every other axis on this site answers a question about the *tool*. The layer
 * ramp says where it sits in a stack, `kind` says what shape it is, `cost` and
 * `deployment` say what adopting it costs. None of them can answer "I am the
 * person who owns this", which is how a reader actually arrives — they know
 * their own job and they are looking for the three tools that job is
 * accountable for, not the ninety that sit in layers they do not touch.
 *
 * ## Why specialisation and not seniority
 *
 * The obvious framing is job titles: Principal, Staff, Senior. That axis does
 * not work, and it is worth being explicit about why rather than shipping it
 * because it sounds right. A Principal and a Staff engineer need *the same
 * tools*. Seniority changes who makes the decision and what the bar is, not
 * which parts of the stack you are responsible for — so every tool would carry
 * the same value on that axis and the facet would filter to nothing while
 * appearing to work. The useful axis is the specialisation inside the title:
 * the thing you are accountable for regardless of level.
 *
 * ## Why five
 *
 * Five is chosen so that every tool lands somewhere and no bucket is a
 * remainder. Four merges AI Infrastructure into ML Platform, which is the
 * distinction a serving engineer cares about most. Six splits Applied from
 * Agents, but very few tools are one without the other, so it would be a
 * distinction without a difference. The count that matters is not five — it is
 * that no role is defined by what it is *not*, which is how a facet starts
 * returning noise.
 *
 * These are deliberately *not* the bands. A band is a property of the stack
 * (where compute happens, where state lives); a role is a property of a person.
 * They correlate — most Platform tools sit in layer 2 or 6 — but a Principal
 * Platform Engineer owns routing *and* orchestration *and* the evals that prove
 * the whole thing works, which crosses all three bands. Collapsing the two would
 * lose exactly the cross-cutting rows that are most worth surfacing.
 */
export const ROLES: ReadonlyArray<{
  id: Role;
  /** Full name, used on headings and in metadata. */
  title: string;
  /** Compact label for chips and narrow columns. */
  short: string;
  /** The single thing this role is answerable for. */
  owns: string;
  /** The question a reader in this role arrives with. */
  question: string;
}> = [
  {
    id: "platform",
    title: "ML Platform",
    short: "Platform",
    owns: "The paved road other engineers build on.",
    question: "How does a model get called, and what does a teammate inherit?",
  },
  {
    id: "serving",
    title: "AI Infrastructure",
    short: "Infra",
    owns: "Tokens per second, per dollar, per GPU.",
    question: "Why is this slow, and what does the next hardware change buy me?",
  },
  {
    id: "data",
    title: "Data & Retrieval",
    short: "Data",
    owns: "What the model knows, and whether it is the right thing.",
    question: "Why does it know the wrong thing, or nothing?",
  },
  {
    id: "applied",
    title: "Applied Engineering",
    short: "Applied",
    owns: "The feature, end to end, in the product.",
    question: "How do I get from a model call to a working surface?",
  },
  {
    id: "production",
    title: "Production & Governance",
    short: "Production",
    owns: "Whether it can be trusted, and whether it can be let go.",
    question: "How do I know it still works, and what am I accountable for?",
  },
] as const;

export const ROLE_IDS: readonly Role[] = ROLES.map((r) => r.id);

/** Metadata for one role, or undefined for an id that is not in the vocabulary. */
export function roleMeta(id: Role) {
  return ROLES.find((r) => r.id === id);
}

/** Display name for a role, falling back to the id so nothing renders blank. */
export function roleTitle(id: Role): string {
  return roleMeta(id)?.title ?? id;
}

/** Compact label for a role. */
export function roleShort(id: Role): string {
  return roleMeta(id)?.short ?? id;
}

/**
 * Every tool a role is accountable for, in dataset order.
 *
 * A tool with several roles appears under each of them. That is the honest
 * reading — an eval framework is genuinely part of what a platform engineer owns
 * and part of what an applied engineer owns, and pretending otherwise would
 * hide the row from the person most likely to need it. The consequence is that
 * role counts do not sum to the tool count, which is expected.
 */
export function toolsForRole<T extends { roles: readonly Role[] }>(
  tools: readonly T[],
  role: Role,
): T[] {
  return tools.filter((t) => t.roles.includes(role));
}

/** Roles a tool carries, in vocabulary order rather than authoring order. */
export function rolesInOrder(roles: readonly Role[]): Role[] {
  return ROLE_IDS.filter((id) => roles.includes(id));
}