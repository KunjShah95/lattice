/**
 * Crawl the deployed site and report technical SEO / answer-engine findings.
 *
 * Why a crawler rather than reading the source: the SEO layer here is derived
 * from `data.ts` and rendered per route, so the only way to know what a crawler
 * actually receives is to fetch it. This reads the deployed HTML, which is also
 * the only place three of the checks below can be observed at all — `og:url`
 * disagreement, JSON-LD parse failures and duplicate titles are invisible in the
 * component tree and obvious in the response.
 *
 * Deliberately dependency-free and read-only: it fetches, it never writes, and
 * it holds no credentials. It reports; it does not fix.
 *
 * The origin is an argument rather than an import of `lib/site.ts`: this is a
 * standalone script, and importing a TypeScript module would drag the Next
 * build's env loading (and its placeholder fallback) into it. Running it
 * without an argument audits whatever `NEXT_PUBLIC_SITE_URL` says in the
 * ambient shell, and fails loudly rather than crawling `lattice.invalid`.
 *
 *   node scripts/audit-seo.mjs https://example.com    # audit an origin
 *   node scripts/audit-seo.mjs <origin> --json         # machine-readable
 *
 * Local verification: a local server renders the same pages but the sitemap
 * still names the canonical origin, so every fetch would escape to
 * production. `--rewrite` requests each sitemap URL from the audited origin
 * instead, and compares canonicals by path (both still name the canonical
 * host, which is what you want to confirm).
 *
 *   npm start & node scripts/audit-seo.mjs http://localhost:3000 --rewrite
 */

const arg = process.argv.find((a) => a.startsWith("http"));
if (!arg) {
  console.error(
    "usage: node scripts/audit-seo.mjs <origin> [--json] [--rewrite]\n  e.g. node scripts/audit-seo.mjs https://lattice.example",
  );
  process.exit(2);
}

const ORIGIN = arg.replace(/\/$/, "");
const REWRITE = process.argv.includes("--rewrite");
const AS_JSON = process.argv.includes("--json");
const CONCURRENCY = 6;

/** One sitemap fetch, then every URL in it. */
async function sitemapUrls() {
  const res = await fetch(`${ORIGIN}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap.xml returned ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

const attr = (tag, name) =>
  tag.match(new RegExp(`${name}=["']([^"']*)["']`))?.[1] ?? null;

/** All <script type="application/ld+json"> blocks, concatenated for parsing. */
function jsonLd(html) {
  const blocks = [
    ...html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ].map((m) => m[1].trim());
  if (!blocks.length) return { ok: false, nodes: [], types: [], error: "none found" };
  try {
    const parsed = JSON.parse(blocks.join("\n"));
    const nodes = parsed["@graph"] ?? [parsed];
    return { ok: true, nodes, types: [...new Set(nodes.map((n) => n["@type"]))] };
  } catch (e) {
    return { ok: false, nodes: [], types: [], error: e.message };
  }
}

const text = (html, re) => [...html.matchAll(re)].map((m) => m[1].trim());

/**
 * Lengths are measured as the reader sees them. The HTML carries `&amp;`
 * where the title has `&`, which inflates naive string lengths — one page
 * measured 64 characters escaped against a true 60, failing a budget it
 * meets. Only the five entities Next emits need decoding.
 */
const unescape = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

async function audit(url) {
  // --rewrite: fetch from the audited origin, for local servers whose pages
  // still name the canonical host everywhere (canonical, og:url, JSON-LD).
  const target = REWRITE ? url.replace(/^https?:\/\/[^/]+/, ORIGIN) : url;
  const res = await fetch(target, { redirect: "follow" });
  const html = await res.text();
  const path = new URL(url).pathname.replace(/\/$/, "") || "/";
  const ld = jsonLd(html);

  const head = html.slice(0, html.indexOf("</head>") > 0 ? html.indexOf("</head>") : 40000);
  const titles = text(head, /<title[^>]*>([\s\S]*?)<\/title>/gi);
  const descTag = head.match(
    /<meta[^>]*name=["']description["'][^>]*>/i,
  )?.[0];
  const linkTags = [...head.matchAll(/<link[^>]*>/gi)].map((m) => m[0]);
  const canonical = linkTags
    .filter((t) => /rel=["']canonical["']/i.test(t))
    .map((t) => attr(t, "href"))[0];
  const ogUrl = attr(
    head.match(/<meta[^>]*property=["']og:url["'][^>]*>/i)?.[0] ?? "<meta>",
    "content",
  );
  const ogTitle = /property=["']og:title["']/i.test(head);
  const ogDesc = /property=["']og:description["']/i.test(head);
  const ogImage = attr(
    head.match(/<meta[^>]*property=["']og:image["'][^>]*>/i)?.[0] ?? "<meta>",
    "content",
  );
  const twitterCard = attr(
    head.match(/<meta[^>]*name=["']twitter:card["'][^>]*>/i)?.[0] ?? "<meta>",
    "content",
  );

  return {
    url,
    path,
    status: res.status,
    finalUrl: res.url,
    title: titles[0] ? unescape(titles[0]) : null,
    titleLen: titles[0] ? unescape(titles[0]).length : 0,
    description: descTag ? unescape(attr(descTag, "content") ?? "") : null,
    descLen: descTag ? unescape(attr(descTag, "content") ?? "").length : 0,
    canonical,
    ogUrl,
    ogTitle,
    ogDesc,
    ogImage,
    twitterCard,
    h1: text(html, /<h1[^>]*>([\s\S]*?)<\/h1>/gi),
    jsonLdOk: ld.ok,
    jsonLdTypes: ld.types,
    jsonLdError: ld.ok ? null : ld.error,
    htmlBytes: html.length,
  };
}

async function pool(items, fn, size) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (i < items.length) out[i++] = await fn(items[i - 1]);
    }),
  );
  return out;
}

const urls = await sitemapUrls();
const rows = await pool(urls, audit, CONCURRENCY);

/* ---------- findings ---------- */

const dupe = (field, label, limit = 140) => {
  const seen = new Map();
  for (const r of rows) {
    const v = r[field];
    if (!v) continue;
    if (!seen.has(v)) seen.set(v, []);
    seen.get(v).push(r.path);
  }
  const bad = [...seen.entries()].filter(([, p]) => p.length > 1);
  return bad.length
    ? bad.map(([v, p]) => `  ${label} (${p.length}x): "${v.slice(0, limit)}"\n    ${p.slice(0, 6).join(", ")}${p.length > 6 ? ` +${p.length - 6} more` : ""}`)
    : [];
};

const bad = [];
const push = (p, msg) => bad.push(`  [${p}] ${msg}`);

for (const r of rows) {
  if (r.status !== 200) push(r.path, `status ${r.status}`);
  if (!r.title) push(r.path, "no <title>");
  else if (r.titleLen > 60) push(r.path, `title ${r.titleLen} chars (>60): "${r.title}"`);
  else if (r.titleLen < 25) push(r.path, `title ${r.titleLen} chars (<25)`);
  if (!r.description) push(r.path, "no meta description");
  else if (r.descLen > 160) push(r.path, `description ${r.descLen} chars (>160)`);
  else if (r.descLen < 70) push(r.path, `description ${r.descLen} chars (<70)`);
  if (!r.canonical) push(r.path, "no canonical");
  else if (r.canonical.replace(/\/$/, "") !== r.url.replace(/\/$/, ""))
    push(r.path, `canonical mismatch: ${r.canonical}`);
  if (r.ogUrl && r.canonical && r.ogUrl.replace(/\/$/, "") !== r.canonical.replace(/\/$/, ""))
    push(r.path, `og:url disagrees with canonical: ${r.ogUrl}`);
  if (!r.ogUrl) push(r.path, "no og:url");
  if (!r.ogTitle) push(r.path, "no og:title");
  if (!r.ogDesc) push(r.path, "no og:description");
  if (!r.ogImage) push(r.path, "no og:image");
  if (!r.twitterCard) push(r.path, "no twitter:card");
  if (r.h1.length === 0) push(r.path, "no <h1>");
  else if (r.h1.length > 1) push(r.path, `${r.h1.length} <h1> tags`);
  if (!r.jsonLdOk) push(r.path, `JSON-LD: ${r.jsonLdError}`);
}

const report = {
  origin: ORIGIN,
  urls: rows.length,
  failures: rows.filter((r) => r.status !== 200).length,
  jsonLdFailing: rows.filter((r) => !r.jsonLdOk).length,
  missing: {
    ogImage: rows.filter((r) => !r.ogImage).length,
    twitterCard: rows.filter((r) => !r.twitterCard).length,
    canonical: rows.filter((r) => !r.canonical).length,
    ogUrl: rows.filter((r) => !r.ogUrl).length,
  },
  duplicateTitles: dupe("title", "duplicate title"),
  duplicateDescriptions: dupe("description", "duplicate description"),
  jsonLdTypes: [...new Set(rows.flatMap((r) => r.jsonLdTypes))].sort(),
  perPage: rows,
};

if (AS_JSON) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`\nOrigin      ${ORIGIN}`);
  console.log(`URLs        ${report.urls} from sitemap.xml`);
  console.log(`Non-200     ${report.failures}`);
  console.log(`JSON-LD     ${rows.length - report.jsonLdFailing} valid / ${report.jsonLdFailing} failing`);
  console.log(`Types       ${report.jsonLdTypes.join(", ")}`);
  console.log(
    `Missing     og:image ${report.missing.ogImage} · twitter:card ${report.missing.twitterCard} · canonical ${report.missing.canonical} · og:url ${report.missing.ogUrl}`,
  );
  console.log(`\nDuplicates`);
  console.log(
    [...report.duplicateTitles, ...report.duplicateDescriptions].join("\n") ||
      "  none",
  );
  console.log(`\nPer-page findings (${bad.length})`);
  console.log(bad.join("\n") || "  none");
}