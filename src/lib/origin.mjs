/**
 * The one public origin of the site.
 *
 * Every canonical, og:url, sitemap entry, JSON-LD @id, llms.txt link and
 * awesome-list link resolves against this, so search engines and answer
 * engines see exactly one address for each page. The site has been served
 * from other hosts: the Cloudflare `workers.dev` subdomain and Vercel's
 * `*.vercel.app` aliases, and each of those is redirected here (see
 * `next.config.ts`). A page indexed under two hosts splits its ranking and its
 * citations between them; one origin keeps them together.
 *
 * Plain `.mjs` so the build scripts, which run under bare `node`, read the same
 * constant as the app.
 */
export const CANONICAL_HOST = "lattice.kunjshah.in";
export const CANONICAL_ORIGIN = `https://${CANONICAL_HOST}`;

/**
 * Hosts that have served the site and must never be emitted as its address.
 * Matched as patterns so every Vercel alias (`lattice-git-…`, `lattice-abc123…`)
 * is covered without listing each one.
 */
export const LEGACY_HOST_PATTERNS = [
  /(^|\.)workers\.dev$/i,
  /(^|\.)vercel\.app$/i,
];

/**
 * The origin to publish, given whatever `NEXT_PUBLIC_SITE_URL` holds.
 *
 * Unset, empty, or pointing at a legacy host → the canonical origin. Anything
 * else (a fork on its own domain) is honoured, minus a trailing slash. The
 * legacy rule is what stops a stale dashboard variable: the Cloudflare build
 * once had `NEXT_PUBLIC_SITE_URL` set to the `workers.dev` address: from
 * quietly publishing hundreds of canonicals at a host that now redirects.
 *
 * @param {string | undefined | null} value
 * @returns {string}
 */
export function resolveSiteUrl(value) {
  const raw = (value ?? "").trim().replace(/\/+$/, "");
  if (!raw) return CANONICAL_ORIGIN;
  let host;
  try {
    host = new URL(raw).hostname;
  } catch {
    return CANONICAL_ORIGIN;
  }
  if (LEGACY_HOST_PATTERNS.some((re) => re.test(host))) return CANONICAL_ORIGIN;
  return raw;
}
