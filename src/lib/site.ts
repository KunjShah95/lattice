/**
 * Single place for branding and copy.
 *
 * ## Before deploying
 *
 * Four values here are still placeholders and are the root of every canonical
 * URL, every `og:url` and every generated share image on the site, because
 * `metadataBase` resolves relative og:image URLs against `url`.
 *
 * They read from the environment so rebranding does not need a code change:
 *
 * ```bash
 * NEXT_PUBLIC_SITE_URL=https://your-domain.com
 * NEXT_PUBLIC_CONTACT_EMAIL=you@your-domain.com
 * NEXT_PUBLIC_CONTACT_X=https://x.com/yourhandle
 * NEXT_PUBLIC_COPYRIGHT_HOLDER=Your Name
 * ```
 *
 * `src/lib/brand.test.ts` fails the suite while any of them is still a
 * placeholder, so this cannot ship unnoticed.
 */
import { resolveSiteUrl } from "@/lib/origin.mjs";
import { REPO } from "@/lib/submissions.mjs";

const env = process.env;

/**
 * The named human behind the index, for pages that ask "who maintains this".
 * Falls back to the copyright holder so the two can never disagree: an author
 * byline and a footer that name different people is the kind of small
 * inconsistency that costs a reader's trust in the whole page.
 */
const MAINTAINER_NAME =
  env.NEXT_PUBLIC_AUTHOR_NAME || env.NEXT_PUBLIC_COPYRIGHT_HOLDER || "Kunj Shah";

/**
 * The maintainer's own site. Named in the README ("Built by Kunj Shah") and
 * home to the project's case study, so it is the page that proves the byline
 * belongs to a real, accountable person, which is what E-E-A-T, and the
 * answer engines that lean on it, look for behind an author name.
 */
const MAINTAINER_URL = env.NEXT_PUBLIC_AUTHOR_URL || "https://kunjshah.in";

/**
 * Contact, without placeholders. An unset email used to render as
 * `todo@example.invalid` on every page: a dead address in the footer of a
 * site whose pitch is that its facts are checked. Unset, the channel falls
 * back to the repository's issue tracker, which is real and public.
 */
const CONTACT_EMAIL = env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || null;
const CONTACT_X = env.NEXT_PUBLIC_CONTACT_X?.trim() || null;

/**
 * Public repository, overridable so a fork or a second deployment is not
 * hardcoded to the upstream owner. Issues are the durable channel for
 * corrections; email is the fast one.
 *
 * The default is derived from `REPO` rather than typed out again, because it was
 * already `owner/repo` here and a full URL next to it in `submissions.mjs`
 * two spellings of one fact, free to drift, and drifting apart means the
 * contact page links to a repo that is not the one issues get filed against.
 * `submissions.mjs` imports nothing, so this direction cannot cycle.
 */
const REPO_URL = env.NEXT_PUBLIC_REPO_URL || `https://github.com/${REPO}`;

export const site = {
  /** Wordmark shown in the header and footer. */
  name: "Lattice",
  /**
   * Domain used for canonical URLs, og: tags and as `metadataBase`.
   * No trailing slash: joined paths would otherwise double up.
   *
   * `||` rather than `??`, deliberately. An empty string is not a usable origin:
   * it makes every canonical a bare path and every `new URL(path, site.url)` throw
   * `TypeError: Invalid URL`. `??` does not catch it, and the empty string is easy
   * to produce: `vitest.config.mts` defines `NEXT_PUBLIC_SITE_URL` unconditionally
   * so the branding tests can see it, defaulting to `""` when there is no
   * `.env.local` (which is every CI run, the file being gitignored). Under `??`
   * that made `site.url` empty in CI and only in CI, and four URL tests failed on
   * every push while passing on every machine. `||` also catches the whitespace
   * case. `brand.test.ts` still fails on the placeholder fallback, so this widens
   * what counts as *unconfigured* without widening what ships.
   */
  //
  // Defaults to the canonical origin (`lib/origin.mjs`) rather than a
  // placeholder, and folds legacy hosts (workers.dev, vercel.app) onto it, so
  // no build can publish a canonical anywhere but lattice.kunjshah.in unless a
  // fork deliberately sets its own domain.
  url: resolveSiteUrl(env.NEXT_PUBLIC_SITE_URL),
  /** <title> template. %s is replaced per-route. */
  titleTemplate: "%s · Lattice",
  defaultTitle: "Lattice: AI infrastructure tools, ordered by stack layer",
  description:
    // 129 characters. Search engines truncate around 155-160 on desktop and
    // nearer 120 on mobile, so the differentiator and the head keywords are
    // front-loaded: "AI infrastructure tools" is the query this homepage
    // exists to answer, and "when to skip it" is the clause that separates
    // this from every other directory. `brand.test.ts` fails the build if
    // this grows past the budget.
    "A curated index of AI infrastructure tools, ordered by stack layer: every tool with when to use it and when to skip it.",
  /**
   * Other names people and models use for this site, for `alternateName`.
   * "Lattice" alone is a common word and the name of unrelated companies, so a
   * query for the brand has to be resolvable to *this* entity.
   */
  alternateNames: ["Lattice AI infrastructure index", "Lattice by Kunj Shah", "lattice.kunjshah.in"],
  /**
   * One sentence that tells a search engine or a model which "Lattice" this is.
   * Shipped as `disambiguatingDescription` in JSON-LD and as the second line of
   * llms.txt: the two places an answer engine reads when a name is ambiguous.
   */
  disambiguation:
    "Lattice (lattice.kunjshah.in) is an independent, neutral index of AI infrastructure tools maintained by Kunj Shah. It is not affiliated with Lattice the HR software company or with Lattice Semiconductor.",
  /** Shown in the footer. */
  tagline:
    "A curated index of the infrastructure behind working AI systems, ordered by depth.",
  copyrightHolder: env.NEXT_PUBLIC_COPYRIGHT_HOLDER || MAINTAINER_NAME,
  /**
   * The named human who writes and verifies the index. Optional: unset, pages
   * are attributed to the organisation. A named author with a visible update
   * date was common to every page answer engines cited in the category audit,
   * so set this, but never to a name that is not a real, accountable editor.
   */
  author: { name: MAINTAINER_NAME, url: MAINTAINER_URL } as { name: string; url: string | null } | null,
  copyrightYear: new Date().getFullYear(),
  /**
   * Exported separately from `site` because these are identity facts rather than
   * metadata, and they need to be importable on their own: `/contact` states
   * them in prose, and a page should not have to destructure the whole config
   * object to name the person who maintains it.
   */
  maintainer: MAINTAINER_NAME,
  repo: REPO_URL,
  contact: {
    email: CONTACT_EMAIL,
    x: CONTACT_X,
    /** Where "contact us" links go: email when configured, else the issue tracker. */
    href: CONTACT_EMAIL ? `mailto:${CONTACT_EMAIL}` : `${REPO_URL}/issues/new`,
    /** How that channel is named in running text. */
    label: CONTACT_EMAIL ?? "GitHub issues",
  },
  /**
   * Profiles that are the same entity as this site, for `Organization.sameAs`.
   *
   * This is how a search engine, and the answer engines built on its
   * knowledge graph, learns that the Product Hunt launch, the GitHub repo and
   * the awesome-list are all *Lattice*, so mentions on any of them accrue to
   * one entity instead of four unrelated strings. Only pages the project
   * actually controls belong here.
   */
  profiles: [
    "https://www.producthunt.com/products/lattice-12",
    "https://usefulshelf.co/apps/lattice-9fc3de",
    "https://smolrank.com/projects/lattice",
    "https://peerlist.io/kunjshah/project/lattice",
    REPO_URL,
    "https://github.com/KunjShah95/awesome-ai-infrastructure",
    ...(CONTACT_X ? [CONTACT_X] : []),
  ],
} as const;