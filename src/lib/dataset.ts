import { AS_OF } from "./attributes";
import { allTools, categories, STALE_AFTER_MONTHS } from "./data";
import { bandOf } from "./layer";
import { ROLES } from "./roles";
import { site } from "./site";

/**
 * The whole index as one JSON document, for agents and tools rather than
 * readers. HTML is a lossy way to hand structured data to a machine: a coding
 * agent asked "which vector store should I use" does better with the use/skip
 * pair as fields than scraped from a page.
 *
 * Every row carries its canonical URL so anything built on this links back,
 * and the citation line asks for exactly that.
 */
export function buildDataset(origin: string = site.url) {
  return {
    name: `${site.name} — AI infrastructure index`,
    description: site.description,
    homepage: origin,
    verified: AS_OF,
    staleAfterMonths: STALE_AFTER_MONTHS,
    verification: `${origin}/verification.json`,
    citation: `Cite as "${site.name}" and link the tool's canonical url field.`,
    /**
     * The specialisation vocabulary, resolved from the ids on each tool. Shipped
     * inline rather than linked because an agent that has to fetch a second
     * document to learn what "applied" means will not do it.
     */
    roles: ROLES.map((r) => ({
      id: r.id,
      title: r.title,
      owns: r.owns,
      url: `${origin}/roles/${r.id}`,
    })),
    sections: categories.map((c) => ({
      slug: c.slug,
      title: c.title,
      layer: c.layer,
      role: c.role,
      band: bandOf(c.layer),
      responsibility: c.responsibility,
      url: `${origin}/${c.slug}`,
    })),
    tools: allTools.map((t) => ({
      name: t.name,
      url: `${origin}/${t.category.slug}/${t.slug}`,
      homepage: t.url,
      section: t.category.slug,
      layer: t.category.layer,
      band: bandOf(t.category.layer),
      kind: t.kind,
      // Ids, not display names: this document is for machines, and an agent
      // asking "what is an applied engineer's stack" wants the stable token.
      // `rolesByRole` at the top of the document resolves one to a title.
      roles: t.roles,
      deployment: t.deployment,
      license: t.license,
      language: t.language,
      cost: t.cost,
      useWhen: t.useWhen,
      skipWhen: t.skipWhen,
      alternatives: t.alternatives ?? [],
      verified: t.asOf,
    })),
  };
}
