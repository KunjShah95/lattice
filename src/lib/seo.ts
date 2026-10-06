import { AS_OF } from "./attributes";
import { site } from "./site";
import type { Category, CostModel, Tool } from "./types";

/**
 * Answer-engine copy and structured data, derived entirely from the dataset.
 *
 * AI answer engines (Google AI Overviews, ChatGPT search, Perplexity, Claude)
 * extract passages, not pages. A passage gets cited when it answers a question
 * on its own: names the subject, says what it is, and stands up without the
 * surrounding layout. The tool pages already hold those facts, but as a grid of
 * labels ("licence Apache-2.0") that only reads as an answer to a human looking
 * at it. Everything here turns the same facts into self-contained sentences
 * and the schema.org graph that describes them.
 *
 * Nothing is invented. Every sentence is a rephrasing of a field in
 * `data.ts` / `attributes.ts`, so a correction there corrects the answer too.
 */

/** Stable node ids, so pages can reference the site and publisher by @id. */
export const ids = {
  website: `${site.url}/#website`,
  organization: `${site.url}/#organization`,
};

/** Licences approved by the OSI. Anything else with source is source-available. */
const OSI_LICENSES = new Set([
  "Apache-2.0",
  "MIT",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "MPL-2.0",
  "PostgreSQL",
  "GPL-2.0",
  "GPL-3.0",
  "LGPL-3.0",
  "AGPL-3.0",
  "ISC",
]);

/** SPDX ids that resolve to a page on spdx.org. */
const SPDX_LICENSES = new Set([...OSI_LICENSES, "BSL-1.1", "Elastic-2.0"]);

export type Openness = "open-source" | "source-available" | "proprietary" | "unknown";

export function openness(license: string | null): Openness {
  if (!license) return "unknown";
  if (license === "proprietary") return "proprietary";
  return OSI_LICENSES.has(license) ? "open-source" : "source-available";
}

const COST_SENTENCE: Record<CostModel, string> = {
  free: "It is free to use.",
  "free-tier": "It has a free tier, with paid plans above it.",
  "usage-based": "It is paid for by usage.",
  subscription: "It is paid for by subscription.",
};

const DEPLOYMENT_WORD = {
  "self-hosted": "self-hosted",
  managed: "managed",
  saas: "SaaS",
} as const;

/** "a self-hosted runtime", "a SaaS platform", "a reading resource". */
export function describeKind(tool: Pick<Tool, "kind" | "deployment">): string {
  if (tool.kind === "reading") return "a reading resource";
  const deployment = tool.deployment ? `${DEPLOYMENT_WORD[tool.deployment]} ` : "";
  return `a ${deployment}${tool.kind}`;
}

/** Strip a trailing full stop so a fragment can be embedded in a sentence. */
const clause = (s: string) => s.trim().replace(/\.$/, "");

/** Proper nouns that open a phrase in the dataset and must keep their capital. */
const PROPER_NOUNS = new Set(["Python", "Rust", "Go", "Java", "Kubernetes", "Postgres"]);

/**
 * Lower-case the first letter so a sentence-case phrase can follow a colon or
 * sit mid-sentence. Leaves the phrase alone when its first word is an acronym
 * or camel-cased name ("GPU", "KV cache", "PyTorch-native", "LoRA") or a
 * known proper noun ("Python-native").
 */
export function lowerFirst(s: string): string {
  const firstWord = s.split(/[\s-]/, 1)[0];
  if (!/^[A-Z][a-z]*$/.test(firstWord) || PROPER_NOUNS.has(firstWord)) return s;
  // Title Case is a name ("Model Context Protocol"), not a sentence.
  const words = s.split(/\s+/);
  if (words.length > 1 && words.every((w) => /^[A-Z]/.test(w))) return s;
  return s[0].toLowerCase() + s.slice(1);
}

/** "A, B and C". */
export function listNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * The tool page's `<meta name="description">`.
 *
 * This used to append the blurb and then close with "When to use it, when to
 * skip it, licence and alternatives." — and because the blurb runs long, that
 * closing clause fell past the ~160-character point where a search engine stops
 * rendering, on 130 of 193 tool pages. The differentiator was being cut off on
 * two-thirds of the index, which is the worst possible place to lose it: the
 * use/skip pair is the entire argument for this site over a list of vendor
 * links.
 *
 * So the blurb is out and the hook leads. Nothing is actually lost by dropping
 * it — the same sentence already appears in three other places a reader or an
 * engine will hit: the JSON-LD `WebPage.description`, the visible lead paragraph
 * (`toolDefinition`), and the `ItemList` entry for this tool on `/all`. It was
 * only ever duplicated in the one field with a hard ceiling.
 */
export function toolMetaDescription(tool: Tool, category: Category): string {
  return (
    `${tool.name} is ${describeKind(tool)} for ${category.title.toLowerCase()}: ` +
    `when to use it, when to skip it, licence, cost and alternatives.`
  );
}

/** The one-paragraph definition: what it is, where it sits, what it does. */
export function toolDefinition(tool: Tool, category: Category): string {
  // Cross-cutting and off-stack sections are not layers; calling them one
  // would put a false claim in the most-quoted sentence on the page.
  const where =
    category.role === "layer"
      ? `the ${category.title} layer of the AI stack`
      : `the ${category.title} section of ${site.name}`;
  return `${tool.name} is ${describeKind(tool)} in ${where}. ${clause(tool.blurb)}.`;
}

export type QA = { question: string; answer: string };

/**
 * Question/answer pairs for a tool page, phrased the way people ask.
 *
 * `alternatives` falls back to section siblings when the dataset declares
 * none, because "what are the alternatives to X" is one of the most common
 * queries a directory can answer and an empty answer is a wasted page.
 */
export function toolQuestions(
  tool: Tool,
  category: Category,
  alternatives: string[],
  siblings: string[],
): QA[] {
  const qas: QA[] = [
    { question: `What is ${tool.name}?`, answer: toolDefinition(tool, category) },
  ];

  if (tool.kind !== "reading") {
    qas.push(
      {
        question: `When should you use ${tool.name}?`,
        answer: `Use ${tool.name} when: ${lowerFirst(tool.useWhen)}`,
      },
      {
        question: `When should you not use ${tool.name}?`,
        answer: `Skip ${tool.name} when: ${lowerFirst(tool.skipWhen)}`,
      },
    );

    const cost = COST_SENTENCE[tool.cost];
    switch (openness(tool.license)) {
      case "open-source":
        qas.push({
          question: `Is ${tool.name} open source?`,
          answer: `Yes. ${tool.name} is open source under the ${tool.license} licence. ${cost}`,
        });
        break;
      case "source-available":
        qas.push({
          question: `Is ${tool.name} open source?`,
          answer: `Not under an OSI-approved licence. ${tool.name} is source-available under ${tool.license}, which restricts some commercial uses. ${cost}`,
        });
        break;
      case "proprietary":
        qas.push({
          question: `Is ${tool.name} open source?`,
          answer: `No. ${tool.name} is proprietary. ${cost}`,
        });
        break;
      case "unknown":
        break;
    }
  }

  if (alternatives.length) {
    qas.push({
      question: `What are the alternatives to ${tool.name}?`,
      answer: `The closest alternatives to ${tool.name} are ${listNames(alternatives)}.`,
    });
  } else if (siblings.length) {
    const top = siblings.slice(0, 5);
    qas.push({
      question: `What are the alternatives to ${tool.name}?`,
      answer: `Other options in ${category.title} include ${listNames(top)}.`,
    });
  }

  return qas;
}

export function faqPageJsonLd(qas: QA[], pageUrl: string) {
  return {
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    mainEntity: qas.map((qa) => ({
      "@type": "Question",
      name: qa.question,
      acceptedAnswer: { "@type": "Answer", text: qa.answer },
    })),
  };
}

/** The tool itself, as distinct from Lattice's page about it. */
export function toolEntityJsonLd(tool: Tool, category: Category, pageUrl: string) {
  const license =
    tool.license && SPDX_LICENSES.has(tool.license)
      ? `https://spdx.org/licenses/${tool.license}.html`
      : undefined;

  if (tool.kind === "reading") {
    return {
      "@type": "CreativeWork",
      "@id": `${pageUrl}#subject`,
      name: tool.name,
      description: tool.blurb,
      url: tool.url,
      about: category.title,
    };
  }

  return {
    "@type": "SoftwareApplication",
    "@id": `${pageUrl}#subject`,
    name: tool.name,
    description: tool.blurb,
    url: tool.url,
    sameAs: [tool.url],
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: category.title,
    ...(license ? { license } : {}),
    isAccessibleForFree: tool.cost === "free" || tool.cost === "free-tier",
    keywords: [tool.kind, tool.deployment, tool.license, tool.language]
      .filter(Boolean)
      .join(", "),
  };
}

/** Site identity, referenced by @id from every page's graph. */
export function siteJsonLd() {
  return [
    {
      "@type": "WebSite",
      "@id": ids.website,
      name: site.name,
      url: site.url,
      description: site.description,
      publisher: { "@id": ids.organization },
      inLanguage: "en",
    },
    {
      "@type": "Organization",
      "@id": ids.organization,
      name: site.name,
      url: site.url,
      // The 180px Apple touch icon doubles as the logo Google shows beside
      // results: it is raster, square and over the 112px minimum, which the
      // SVG icon is not. Regenerate with `npm run icons:render`.
      logo: `${site.url}/apple-icon.png`,
      sameAs: [site.contact.x],
    },
  ];
}

/** The dataset's verification month as a full ISO date (first of the month). */
export const datasetModified = `${AS_OF}-01`;

/**
 * The absolute URL of a page, for `openGraph.url`.
 *
 * Next does not derive `og:url` from `alternates.canonical`. Left unset, the tag
 * is omitted entirely; set once in the root layout, it is inherited by every page
 * and points all of them at the home page — which puts `og:url` and `canonical`
 * in direct contradiction on every route that has its own path. Both failure
 * modes are worse than just spelling the URL out per page, and this keeps that
 * spelling in one place so it cannot drift from `site.url`.
 */
export function absolute(path = "/"): string {
  return `${site.url}${path === "/" ? "" : path}`;
}

/**
 * JSON-LD author: the named editor when one is configured, otherwise the
 * organisation. Never a Person named after the organisation — that is a
 * false claim in the field engines read for authorship.
 */
export function authorNode(): object {
  const a = site.author;
  if (!a) return { "@id": ids.organization };
  return { "@type": "Person", name: a.name, ...(a.url ? { url: a.url } : {}) };
}

/** Visible byline text: "Jane Doe" or "Lattice editorial". */
export const bylineName = site.author?.name ?? `${site.name} editorial`;

/**
 * Authorship and verification fields for a page that is not an Article.
 *
 * A named editor with a visible update date was on every page answer engines
 * cited in the category audit — and `/compare`, `/fix` and `/blog`, the three
 * families that carry it, were the only ones declaring an author. The tool,
 * glossary and alternatives pages were the larger sets and declared none, which
 * is the wrong way round: most of the site was doing the harder half of the work
 * without the cheap half.
 *
 * `dateModified` is deliberately the dataset's verification month rather than
 * the build time. A definition does not expire and a licence does, and the whole
 * freshness argument on this site rests on the date meaning something — so a
 * field that said "rebuilt 4 minutes ago" would be the one place the claim
 * quietly stopped being true.
 *
 * Spreads onto any node; `Article` callers already set these themselves.
 */
export function credit() {
  return {
    author: authorNode(),
    publisher: { "@id": ids.organization },
    dateModified: datasetModified,
  };
}

/** A BreadcrumbList node for a @graph. Paths are site-relative ("" is home). */
export function breadcrumbNode(
  pageUrl: string,
  crumbs: Array<{ name: string; path: string }>,
) {
  return {
    "@type": "BreadcrumbList",
    "@id": `${pageUrl}#breadcrumb`,
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${site.url}${c.path}`,
    })),
  };
}

/**
 * Wrap nodes in a single JSON-LD document.
 *
 * `undefined` is dropped rather than rejected: a node built conditionally — an
 * ItemList only where the page actually has a collection to list — is written
 * as `items?.length ? { ... } : undefined`, and filtering here is what lets that
 * read as one expression. A `null` in `@graph` is a parse error for a consumer
 * even though `JSON.stringify` writes it happily, so it never leaves here.
 */
export function graph(...nodes: Array<object | object[] | undefined>) {
  return { "@context": "https://schema.org", "@graph": nodes.flat().filter(Boolean) };
}

/** One entry in a collection page's ItemList. */
export type ListEntry = { name: string; url: string; description?: string };

/**
 * An index page: a CollectionPage whose reason for existing is the set of pages
 * it links to.
 *
 * Seven routes are exactly this shape — `/all`, `/blog`, `/compare`,
 * `/stack-builder`, `/glossary`, `/methodology`, `/fix` — and all seven shipped
 * with no structured data at all, while `/roles` and every section page carried
 * a full graph. The failure was silent in every way that matters: the pages
 * render, the sitemap lists them, `route-metadata.test.ts` passes, and the audit
 * only reports it as "JSON-LD: none found" on a line next to four non-HTML
 * endpoints. An index that names no collection is prose to a crawler, and the
 * sub-pages it is the only parent of become reachable only by following a
 * rendered link.
 *
 * `items` may be omitted for an index whose argument is not a set of pages —
 * `/methodology` is a page *about* the index and lists nothing, so declaring a
 * mainEntity it does not have would be the kind of small false claim this site
 * exists to avoid. Those pages still get the WebPage node and the breadcrumb.
 */
export function collectionPageNodes({
  pageUrl,
  name,
  description,
  items,
  crumbs,
  listId = "items",
}: {
  pageUrl: string;
  name: string;
  description: string;
  items?: ListEntry[];
  crumbs: Array<{ name: string; path: string }>;
  listId?: string;
}) {
  const list = items?.length ? `${pageUrl}#${listId}` : undefined;

  return graph(
    {
      "@type": "CollectionPage",
      "@id": pageUrl,
      url: pageUrl,
      name,
      description,
      dateModified: datasetModified,
      isPartOf: { "@id": ids.website },
      ...(list ? { mainEntity: { "@id": list } } : {}),
      breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
    },
    items?.length
      ? {
          "@type": "ItemList",
          "@id": list!,
          name,
          numberOfItems: items.length,
          itemListElement: items.map((item, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: item.name,
            ...(item.description ? { description: item.description } : {}),
            url: item.url,
          })),
        }
      : undefined,
    breadcrumbNode(pageUrl, crumbs),
  );
}

/** The trailing crumb every index page shares: home, then the page itself. */
export function indexCrumbs(name: string, path: string) {
  return [
    { name: site.name, path: "" },
    { name, path },
  ];
}
