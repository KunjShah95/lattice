/**
 * The "verified" badge: a README-sized SVG that says when an entry's facts were
 * last confirmed.
 *
 * Borrowed from the README-badge idea (shieldcn on designeer.xyz) and made to do
 * the one thing this index can say that a stars badge cannot: *how recently a
 * human checked the licence and cost*. It carries no popularity figure on
 * purpose — `strategy/02` refuses a ranking by traffic, and a badge is the most
 * copied artefact the site will ever produce.
 *
 * ## It must not become a tracking or monetised surface
 *
 * `strategy/04` §4 forbids a monetised URL in any machine-readable route, and a
 * badge is fetched by every README that embeds it. So the SVG is self-contained
 * — no `<image>`, no external font, no link — and the route behind it sets no
 * cookie and reads no header. `badge.test.ts` pins the self-containment.
 *
 * Pure, with text measured by a fixed advance rather than a font: the badge has to
 * render identically in a GitHub README, an npm page and a browser tab, none of
 * which share a font, so a monospaced stack with a conservative advance is the
 * only width model that never clips.
 */

/** Advance per character at 11px in the badge's monospace stack. Deliberately a hair wide. */
const CHAR = 6.8;
const PAD = 8;
const HEIGHT = 20;

/** Escape the five XML specials. Tool names are ours, but the function does not rely on that. */
export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export type BadgeInput = {
  /** Left half. */
  label: string;
  /** Right half, e.g. `verified 2026-09`. */
  value: string;
};

export function badgeSvg({ label, value }: BadgeInput): string {
  const lw = Math.round(label.length * CHAR + PAD * 2);
  const rw = Math.round(value.length * CHAR + PAD * 2);
  const w = lw + rw;
  const title = escapeXml(`${label}: ${value}`);
  const l = escapeXml(label);
  const v = escapeXml(value);

  // Palette is the site's own light-theme ink and paper. A README badge is shown
  // on both white and near-black pages, so the right half carries its own border
  // and fill instead of relying on the page behind it.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${HEIGHT}" viewBox="0 0 ${w} ${HEIGHT}" role="img" aria-label="${title}">
  <title>${title}</title>
  <rect width="${w}" height="${HEIGHT}" rx="3" fill="#f4f4f2"/>
  <rect width="${lw}" height="${HEIGHT}" rx="3" fill="#16161a"/>
  <rect x="${lw - 3}" width="3" height="${HEIGHT}" fill="#16161a"/>
  <rect x="0.5" y="0.5" width="${w - 1}" height="${HEIGHT - 1}" rx="2.5" fill="none" stroke="#16161a" stroke-opacity="0.35"/>
  <g font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" font-size="11" text-anchor="middle">
    <text x="${lw / 2}" y="14" fill="#fbfbfa">${l}</text>
    <text x="${lw + rw / 2}" y="14" fill="#16161a">${v}</text>
  </g>
</svg>
`;
}

/** The badge for one entry. */
export function verifiedBadge(asOf: string): string {
  return badgeSvg({ label: "lattice", value: `verified ${asOf}` });
}

/**
 * The Markdown a README pastes in: the badge, linked to the entry it describes.
 *
 * Both URLs are bare canonical paths. No query string and no parameter, which is
 * the same rule `neutrality.test.ts` holds the citation feed to — an embed that
 * every README copies is the last place a referral parameter should be able to
 * appear by accident.
 */
export function badgeMarkdown(origin: string, section: string, tool: string, name: string, asOf: string): string {
  const page = `${origin}/${section}/${tool}`;
  return `[![${name} on Lattice: verified ${asOf}](${page}/badge.svg)](${page})`;
}
