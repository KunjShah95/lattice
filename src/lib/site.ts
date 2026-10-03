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
const env = process.env;

export const site = {
  /** Wordmark shown in the header and footer. */
  name: "Lattice",
  /**
   * Domain used for canonical URLs, og: tags and as `metadataBase`.
   * No trailing slash — joined paths would otherwise double up.
   */
  url: (env.NEXT_PUBLIC_SITE_URL ?? "https://lattice.invalid").replace(/\/$/, ""),
  /** <title> template. %s is replaced per-route. */
  titleTemplate: "%s · Lattice",
  defaultTitle: "Lattice — the layers behind working AI systems",
  description:
    // 126 characters. Search engines truncate around 155-160 on desktop and
    // nearer 120 on mobile, so the old 229-character version lost its second
    // half. The differentiator is front-loaded and the layer list is dropped:
    // "not by popularity" is the clause that separates this from every other
    // directory, and it is the part worth surviving the cut.
    // `brand.test.ts` fails the build if this grows past the budget.
    "A curated, opinionated index of the tools that make AI systems work in production — ordered by stack layer, not by popularity.",
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
  contact: {
    email: env.NEXT_PUBLIC_CONTACT_EMAIL ?? "todo@example.invalid",
    x: env.NEXT_PUBLIC_CONTACT_X ?? "https://x.com/todo",
  },
} as const;