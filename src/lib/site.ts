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
import { REPO } from "@/lib/submissions.mjs";

const env = process.env;

/**
 * The named human behind the index, for pages that ask "who maintains this".
 * Falls back to the copyright holder so the two can never disagree — an author
 * byline and a footer that name different people is the kind of small
 * inconsistency that costs a reader's trust in the whole page.
 */
const MAINTAINER_NAME =
  env.NEXT_PUBLIC_AUTHOR_NAME || env.NEXT_PUBLIC_COPYRIGHT_HOLDER || null;

/**
 * Public repository, overridable so a fork or a second deployment is not
 * hardcoded to the upstream owner. Issues are the durable channel for
 * corrections; email is the fast one.
 *
 * The default is derived from `REPO` rather than typed out again, because it was
 * already `owner/repo` here and a full URL next to it in `submissions.mjs` —
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
   * No trailing slash — joined paths would otherwise double up.
   *
   * `||` rather than `??`, deliberately. An empty string is not a usable origin:
   * it makes every canonical a bare path and every `new URL(path, site.url)` throw
   * `TypeError: Invalid URL`. `??` does not catch it, and the empty string is easy
   * to produce — `vitest.config.mts` defines `NEXT_PUBLIC_SITE_URL` unconditionally
   * so the branding tests can see it, defaulting to `""` when there is no
   * `.env.local` (which is every CI run, the file being gitignored). Under `??`
   * that made `site.url` empty in CI and only in CI, and four URL tests failed on
   * every push while passing on every machine. `||` also catches the whitespace
   * case. `brand.test.ts` still fails on the placeholder fallback, so this widens
   * what counts as *unconfigured* without widening what ships.
   */
  url: (env.NEXT_PUBLIC_SITE_URL || "https://lattice.invalid").replace(/\/$/, ""),
  /** <title> template. %s is replaced per-route. */
  titleTemplate: "%s · Lattice",
  defaultTitle: "Lattice — AI infrastructure tools, ordered by stack layer",
  description:
    // 129 characters. Search engines truncate around 155-160 on desktop and
    // nearer 120 on mobile, so the differentiator and the head keywords are
    // front-loaded: "AI infrastructure tools" is the query this homepage
    // exists to answer, and "when to skip it" is the clause that separates
    // this from every other directory. `brand.test.ts` fails the build if
    // this grows past the budget.
    "A curated index of AI infrastructure tools, ordered by stack layer — every tool with when to use it and when to skip it.",
  /** Shown in the footer. */
  tagline:
    "A curated index of the infrastructure behind working AI systems, ordered by depth.",
  copyrightHolder: env.NEXT_PUBLIC_COPYRIGHT_HOLDER ?? "TODO holder",
  /**
   * The named human who writes and verifies the index. Optional: unset, pages
   * are attributed to the organisation. A named author with a visible update
   * date was common to every page answer engines cited in the category audit,
   * so set this — but never to a name that is not a real, accountable editor.
   */
  author: env.NEXT_PUBLIC_AUTHOR_NAME
    ? { name: env.NEXT_PUBLIC_AUTHOR_NAME, url: env.NEXT_PUBLIC_AUTHOR_URL ?? null }
    : null,
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
    email: env.NEXT_PUBLIC_CONTACT_EMAIL ?? "todo@example.invalid",
    x: env.NEXT_PUBLIC_CONTACT_X ?? "https://x.com/todo",
  },
} as const;