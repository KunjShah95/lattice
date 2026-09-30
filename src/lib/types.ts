export type Tool = {
  /** URL-safe identifier, unique within a category. */
  slug: string;
  name: string;
  /** Bare hostname, e.g. "github.com". Used for search matching and display. */
  domain: string;
  url: string;
  /** One-line factual summary. Original copy. */
  blurb: string;
  /** Optional short qualifier shown as a mono tag. */
  tag?: string;
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
