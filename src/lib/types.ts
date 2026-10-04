/**
 * Deployment model. This is the constraint that decides most real
 * adoptions — whether a tool can run inside your own network is a
 * compliance question before it is a technical one.
 */
export type Deployment = "self-hosted" | "managed" | "saas";

/**
 * What kind of thing a tool is. Replaces the old overloaded `tag`, which was
 * doing three jobs at once (kind, vendor and topic) and produced 45
 * uncontrolled values.
 */
export type ToolKind =
  | "runtime"
  | "database"
  | "framework"
  | "library"
  | "service"
  | "platform"
  | "reading";

/**
 * How the thing is paid for. Deliberately coarse: the point is the filter
 * ("can I try this without a procurement conversation?"), not the price list,
 * which changes too often to belong in a curated index.
 */
export type CostModel =
  | "free"
  | "free-tier"
  | "usage-based"
  | "subscription";

/**
 * Engineering specialisation — the thing you are accountable for, not the
 * level you are at. Vocabulary and rationale live in `roles.ts`.
 */
export type Role = "platform" | "serving" | "data" | "applied" | "production";

export type Tool = {
  /** URL-safe identifier, unique within a section. */
  slug: string;
  name: string;
  /** Bare hostname, e.g. "github.com". Used for search matching and display. */
  domain: string;
  url: string;
  /** One-line factual summary. Original copy. */
  blurb: string;

  // ---- Structured attributes -------------------------------------------
  // These replaced a single overloaded `tag`. Each is a controlled value, so
  // facets on them are meaningful rather than a list of vendor names.

  kind: ToolKind;
  /**
   * Specialisations this tool is part of. One or two; three is allowed only
   * where a tool genuinely spans roles, and the count is guarded at build time.
   *
   * Multi-valued on purpose: an eval framework really is part of what a
   * platform engineer owns and part of what an applied engineer owns, and
   * forcing a single value hides it from one of them.
   */
  roles: Role[];
  /** Null for reading material, where deployment does not apply. */
  deployment: Deployment | null;
  /**
   * SPDX identifier, "proprietary" for a closed service, or null where the
   * licence could not be confirmed. Null is a real answer: guessing here would
   * be worse than saying nothing, because licence choice drives architecture.
   */
  license: string | null;
  /** Primary implementation language, or null for a managed service. */
  language: string | null;
  cost: CostModel;

  // ---- The decision fields ----------------------------------------------
  // The site's thesis is decisions, not listings. These two are the payload
  // that makes that thesis actionable per tool, and they are what the
  // comparison tables are currently written by hand.

  /** One clause: the situation in which this is the right choice. */
  useWhen: string;
  /** One clause: the situation in which it is the wrong choice. */
  skipWhen: string;

  // ---- Relationships ----------------------------------------------------

  /**
   * Slugs of genuine substitutes, searched in the same section first. These
   * seed the alternatives graph and the hand-written comparisons.
   */
  alternatives?: string[];

  // ---- Provenance -------------------------------------------------------

  /**
   * YYYY-MM. When `license` and `cost` were last confirmed against the
   * project. Both rot, and a stale-but-confident figure is worse than an
   * absent one, so the staleness test fails when this ages out.
   */
  asOf: string;
};

/**
 * How a section relates to the production stack.
 * - `layer`      sits in the stack; `layer` gives its depth, 1 = substrate.
 * - `crosscutting` spans every layer rather than sitting in one of them.
 * - `offstack`   is not part of the system at all (reading, courses, archives).
 */
export type LayerRole = "layer" | "crosscutting" | "offstack";

export type Category = {
  /** Ordinal rendered in the section header. "—" for off-stack sections. */
  index: string;
  slug: string;
  title: string;
  /** Compact label for the header nav, where horizontal space is scarce. */
  short: string;
  /** One-line framing of what belongs in this section. */
  description: string;
  /** Stack depth, 1 = substrate. Null for sections that are not a layer. */
  layer: number | null;
  role: LayerRole;
  /** The single job this layer is answerable for. */
  responsibility: string;
  tools: Tool[];
};
