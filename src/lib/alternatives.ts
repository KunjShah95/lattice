import { allTools, getAlternativeTo, getTool, stackLayers } from "@/lib/data";
import type { Category, Tool } from "@/lib/types";

/**
 * Alternatives: the substitutes graph, turned into pages.
 *
 * A directory that only lists tools leaves the actual decision unmade, and a
 * tool page that names three alternatives still leaves the reader to assemble
 * the comparison themselves. "Alternatives to X" is, on the available
 * evidence, the query shape with the best citation behaviour in this category —
 * it is what a reader types after they have already decided to leave something,
 * and it is the query a vendor-authored comparison page is *trying* to win.
 *
 * Neutrality is the whole advantage. Langfuse publishes `langfuse.com/compare/braintrust`
 * and Braintrust publishes `braintrust.dev/articles/langfuse-alternatives-2026`. Both
 * are arguing. Neither can be the tiebreaker, because both sell one of the
 * options. This index sells neither, which is the only reason the page can be
 * trusted on the question.
 */

export type AlternativeEntry = {
  tool: Tool;
  category: Category;
  /** Why the two are substitutes, in one clause. Distinct from the blurb. */
  angle: string;
};

/**
 * How this tool is described *as a substitute for the one being asked about*.
 *
 * Reusing each alternative's own blurb would be a bug: "Rust vector database
 * with rich filtering payloads" tells you what Qdrant is, not what it is
 * instead of Pinecone. The comparison the reader is actually making is
 * second-order — pgvector vs Qdrant is a different question from pgvector vs
 * Pinecone — so the framing has to be derived from the pair.
 */
function angleFor(subject: Tool, alt: Tool, sameSection: boolean): string {
  // Same layer: the reader is choosing within a category, so the honest
  // framing is the axis they differ on.
  if (sameSection) return `Same layer — ${alt.blurb.charAt(0).toLowerCase()}${alt.blurb.slice(1)}`;

  // Different layers: the question is not "which is better" but "are these
  // substitutes at all", which is almost always no. Saying so is the useful
  // answer and it is the one a cross-category list would hide.
  return `Different layer (${alt.kind}) — not a drop-in substitute; adjacent to ${subject.kind}`;
}

/** Every tool that names `tool` as an alternative, i.e. points *at* it. */
export function getSubstitutes(categorySlug: string, toolSlug: string): AlternativeEntry[] {
  const found = getTool(categorySlug, toolSlug);
  if (!found) return [];
  const { tool } = found;

  const inbound = getAlternativeTo(categorySlug, toolSlug);
  const direct = inbound.map(({ tool: alt, category }) => ({
    tool: alt,
    category,
    angle: angleFor(tool, alt, category.slug === categorySlug),
  }));

  // Tools this one names as alternatives. These are usually the better
  // answer — they are the ones an editor put on the page deliberately rather
  // than the ones that happened to point back.
  const outbound = (tool.alternatives ?? [])
    .map((name) => allTools.find((t) => t.name === name))
    .filter((t): t is (typeof allTools)[number] => Boolean(t))
    .map((entry) => ({
      tool: entry,
      category: entry.category,
      angle: angleFor(tool, entry, entry.category.slug === categorySlug),
    }));

  // Direct edges win, then outbound, then name order for stability.
  const seen = new Set<string>();
  return [...direct, ...outbound]
    .filter((e) => e.tool.slug !== toolSlug)
    .filter((e) => {
      const key = `${e.category.slug}/${e.tool.slug}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

/**
 * Whether there is enough substance here to justify a page.
 *
 * A page with two rows and no comparison is worse than no page: it looks like
 * an answer and is not one. Below this threshold the tool gets a section on
 * its own page instead, which is where the same information already lives.
 */
export const MIN_ALTERNATIVES = 3;

export function hasAlternativesPage(categorySlug: string, toolSlug: string) {
  return getSubstitutes(categorySlug, toolSlug).length >= MIN_ALTERNATIVES;
}

/** Every tool that earns an alternatives page. Drives `generateStaticParams`. */
export function allAlternativesPages() {
  return allTools
    .filter((t) => hasAlternativesPage(t.category.slug, t.slug))
    .map((t) => ({ slug: t.category.slug, tool: t.slug }));
}

/**
 * The one-line verdict.
 *
 * Derived, not authored, which is the honest constraint: this is a directory
 * with no sponsorship, so the recommendation can only be assembled from the
 * data it already holds. It says which substitute is closest to the subject on
 * deployment and licence — the two facts that most often decide it — and it
 * refuses to name an overall winner, because without knowing the reader's
 * constraints that claim is not verifiable.
 */
export function verdictFor(
  subject: Tool,
  subjectCategory: Category,
  subs: AlternativeEntry[],
): string {
  if (!subs.length) return "";

  const sameDeployment = subs.filter(
    (s) => s.tool.deployment === subject.deployment,
  );
  const permissive = subs.filter(
    (s) => s.tool.license && /MIT|Apache|BSD|PostgreSQL|ISC|CDLA/i.test(s.tool.license),
  );

  const parts: string[] = [];

  if (sameDeployment.length) {
    parts.push(
      `${sameDeployment.length} of these ${sameDeployment.length === 1 ? "runs" : "run"} the same way you already deploy ${subject.name} (${subject.deployment ?? "unspecified"})`,
    );
  }
  if (permissive.length) {
    parts.push(
      `${permissive.length} ${permissive.length === 1 ? "is" : "are"} permissively licensed, so ${permissive.length === 1 ? "it does" : "they do"} not change what you can ship`,
    );
  }

  const crossLayer = subs.filter(
    (s) => s.category.layer !== subjectCategory.layer,
  ).length;

  const head =
    `${subs.length} ${subs.length === 1 ? "tool" : "tools"} on this index ${subs.length === 1 ? "is" : "are"} recorded as a substitute for ${subject.name}.`;

  const caveat = crossLayer
    ? ` ${crossLayer} of them sit in a different layer, which means adjacent rather than interchangeable — check the section before treating ${crossLayer === 1 ? "it" : "them"} as a swap.`
    : ` All of them sit in ${subjectCategory.title}, so the choice is a real one rather than a category change.`;

  return `${head}${parts.length ? ` ${parts.join(", and ")}.` : ""}${caveat} There is no overall winner here: which one is right depends on traffic shape, operational budget and how much of ${subject.name} you have already built around.`;
}

/** Section pages are the other half of the alternatives story. */
export function alternativesBySection() {
  return stackLayers.map((c) => ({
    category: c,
    tools: allTools.filter((t) => t.category.slug === c.slug),
  }));
}