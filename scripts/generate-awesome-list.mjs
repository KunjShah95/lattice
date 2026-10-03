/**
 * Generates the GitHub distribution artefact.
 *
 * WHY THIS EXISTS
 *
 * The clearest finding in the competitor research is that positioning without
 * distribution is not a strategy. `samber/awesome-ai-native` publishes 266
 * items with stack-shaped curation copy almost identical to this index's own,
 * and has 11 stars. `hemanthgk10/awesome-ai` has the correct thesis and 4
 * Meanwhile `Shubhamsaboo/awesome-llm-apps` has 140,561 and
 * `punkpeye/awesome-mcp-servers` has 95,767, and neither has anything to say
 * about production infrastructure.
 *
 * The strongest distribution asset in this category is a GitHub repository,
 * not a website. This script produces one from the same dataset the site
 * renders, so the two cannot drift — a list that says "verified 2026-06" when
 * the site says 2026-09 is worse than no list, because it is the one artefact
 * that gets screenshotted.
 *
 * WHAT IS DELIBERATELY NOT HERE
 *
 * No stars column, and no popularity ranking. Star counts can be inflated,
 * they say nothing about whether a tool is right for a constraint, and
 * including one would make the list a copy of what it exists to replace.
 * `Tool | Layer | Kind | Deployment | Licence | Verified` instead: the columns
 * a reader actually filters on.
 *
 * Both directions of the substitutes graph are emitted, because "what do I
 * use instead of X" is the highest-intent query this index can serve and it is
 * the one a vendor cannot answer honestly about a competitor.
 *
 * The generated README is checked in at site/public/awesome-lattice.md and is
 * also served from /awesome.md so it is reachable as plain text. Run:
 *
 *   node scripts/generate-awesome-list.mjs
 */
import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import nextEnv from "@next/env";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// Same env resolution as the build, so the list links to the origin the site
// is actually served from. Plain `node` does not read .env.local on its own,
// which is how this once shipped links to a domain the site had left.
nextEnv.loadEnvConfig(root);
const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://lattice.kkshah2005.workers.dev"
).replace(/\/$/, "");

/**
 * The dataset, extracted from the TypeScript source.
 *
 * Parsed rather than imported because the site is TypeScript with path
 * aliases and a `"type": "module"` package that has no runtime for .ts. The
 * two tuple shapes this needs — category headers and tool rows — are
 * regular enough to read off the source without a build step, and the
 * staleness guard below means a silent parse failure cannot ship.
 */

const dataSrc = readFileSync(join(root, "src/lib/data.ts"), "utf8");
const attrSrc = readFileSync(join(root, "src/lib/attributes.ts"), "utf8");

/** `t("Name", "host", "blurb"),` — the tuple shape declared in data.ts. */
const TOOL_RE =
  /t\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/g;

/** Category headers: index, slug, title, short, ..., layer, role. */
const CATEGORY_RE =
  /\{\s*\n\s*index:\s*"([^"]*)",\s*\n\s*slug:\s*"([^"]+)",\s*\n\s*title:\s*"([^"]+)",\s*\n\s*short:\s*"([^"]+)",[\s\S]*?layer:\s*(\d+|null),\s*\n\s*role:\s*"([^"]+)"/g;

/**
 * `attributes.ts` entries.
 *
 * Two shapes exist in the source. Infrastructure tools spell their fields
 * out; reading material spreads the `READ` constant, which fixes kind to
 * "reading" and every other attribute to null. Both have to be matched or the
 * reading section silently loses its rows — which is exactly the drift the
 * count guard below exists to catch.
 *
 * `skipWhen` is read separately below. It used to be left out on the grounds
 * that long table cells are hard to read — but this README's headline claim
 * is that every entry says when to skip it, and a list that makes the claim
 * without showing one instance asks to be taken on trust. The skip sentence
 * replaces the Kind and Deployment columns, which the tool's page carries.
 */
const ATTR_RE =
  /"([^"]+)":\s*\{\s*\n\s*kind:\s*"([^"]+)",\s*deployment:\s*("[^"]+"|null),\s*license:\s*("[^"]+"|null),\s*language:\s*("[^"]+"|null),\s*cost:\s*"([^"]+)"/g;

const READ_RE = /"([^"]+)":\s*\{\s*\.\.\.READ,/g;

/** Mirrors the `READ` constant in attributes.ts. */
const READ_ATTRS = {
  kind: "reading",
  deployment: null,
  license: null,
  language: null,
  cost: "free",
};

const attrs = new Map();
for (const m of attrSrc.matchAll(ATTR_RE)) {
  const unquote = (v) => (v === "null" ? null : v.replace(/^"|"$/g, ""));
  attrs.set(m[1], {
    kind: m[2],
    deployment: unquote(m[3]),
    license: unquote(m[4]),
    language: unquote(m[5]),
    cost: m[6],
  });
}
for (const m of attrSrc.matchAll(READ_RE)) {
  if (attrs.has(m[1]))
    throw new Error(
      `"${m[1]}" matched both the inline and the ...READ pattern — attributes.ts has two shapes for one tool`,
    );
  attrs.set(m[1], { ...READ_ATTRS });
}

/** `skipWhen: "..."` for each named entry, read from its own block. */
const skipWhen = new Map();
for (const name of attrs.keys()) {
  const start = attrSrc.indexOf(`"${name}": {`);
  const end = attrSrc.indexOf("\n  },", start);
  const m = attrSrc.slice(start, end).match(/skipWhen:\s*"((?:[^"\\]|\\.)*)"/);
  if (m) skipWhen.set(name, m[1].replace(/\\"/g, '"'));
}

/** Tool tuples in source order, then zipped to the category that owns them. */
const tools = [...dataSrc.matchAll(TOOL_RE)].map((m) => ({
  name: m[1],
  host: m[2],
  blurb: m[3],
}));

const categories = [...dataSrc.matchAll(CATEGORY_RE)].map((m) => ({
  index: m[1],
  slug: m[2],
  title: m[3],
  short: m[4],
  layer: m[5] === "null" ? null : Number(m[5]),
  role: m[6],
}));

/**
 * Guard against exactly the silent failure this script cannot afford: a
 * source refactor that stops the regexes matching, producing an empty or
 * truncated README that looks fine in a diff.
 */
const AS_OF = attrSrc.match(/export const AS_OF = "([^"]+)"/)?.[1];
if (!AS_OF) throw new Error("Could not read AS_OF from src/lib/attributes.ts");
if (!tools.length) throw new Error("Parsed zero tools from data.ts — regex drift?");
if (!categories.length)
  throw new Error("Parsed zero categories from data.ts — regex drift?");
if (attrs.size < tools.length)
  throw new Error(
    `Only ${attrs.size} attribute records for ${tools.length} tools — attributes.ts regex drift?`,
  );

/** Walk the tool list, assigning each to the category whose block it sits in. */
const sections = [];
let cursor = 0;
for (const cat of categories) {
  const start = dataSrc.indexOf(`slug: "${cat.slug}"`);
  const nextIdx = categories.indexOf(cat) + 1;
  const end =
    nextIdx < categories.length
      ? dataSrc.indexOf(`slug: "${categories[nextIdx].slug}"`)
      : dataSrc.length;
  const block = dataSrc.slice(start, end);
  const count = [...block.matchAll(TOOL_RE)].length;

  sections.push({
    ...cat,
    tools: tools.slice(cursor, cursor + count).map((t) => ({
      ...t,
      attrs: attrs.get(t.name) ?? null,
    })),
  });
  cursor += count;
}

const total = sections.reduce((n, s) => n + s.tools.length, 0);
if (total !== tools.length)
  throw new Error(
    `Assigned ${total} tools to sections but found ${tools.length} in data.ts`,
  );

/* -------------------------------------------------------------------------
   Output
   ------------------------------------------------------------------------- */

const bandOf = (layer) =>
  layer === null
    ? null
    : layer <= 2
      ? "compute"
      : layer <= 4
        ? "state"
        : "control";

const esc = (s) => String(s ?? "").replace(/\|/g, "\\|");

/**
 * ASCII-only output.
 *
 * The site copy uses typographic punctuation throughout, and none of it is
 * wrong. This artefact is a different consumer: it gets pasted into issues,
 * read in terminals with unpredictable encodings, diffed in review, and
 * rendered by third-party README pipelines that are not all UTF-8 clean. An
 * em-dash that survives a copy-paste into a bug report and comes back as a
 * stray box is a worse outcome than a hyphen, and this file is the one place
 * where being boring is worth more than being pretty.
 *
 * The `blurb` strings still come through from data.ts verbatim, so this only
 * affects the scaffolding written here.
 */
const ascii = (s) =>
  String(s)
    .replace(/\u2014/g, "--")
    .replace(/\u2013/g, "-")
    .replace(/\u2019/g, "'")
    .replace(/\u2018/g, "'")
    .replace(/\u201c/g, '"')
    .replace(/\u201d/g, '"')
    .replace(/\u00b7/g, "|")
    .replace(/\u2192/g, "->")
    .replace(/\u2261/g, "=");

/** Mirrors the slug rule in data.ts, so links land on the tool's page. */
const toolSlug = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const rowsFor = (list, sectionSlug) =>
  list
    .map((t) => {
      const a = t.attrs ?? {};
      const page = `${siteUrl}/${sectionSlug}/${toolSlug(t.name)}`;
      const skip = skipWhen.get(t.name) ?? "--";
      return `| [${esc(t.name)}](https://${t.host})<br>[use / skip](${page}) | ${esc(t.blurb)} | ${esc(skip)} | ${esc(a.license ?? "unknown")} | ${esc(a.cost ?? "--")} |`;
    })
    .join("\n");

const out = [];
out.push(`# Lattice — an index of the infrastructure behind working AI systems`);
out.push(``);
out.push(
  `<!-- GENERATED by scripts/generate-awesome-list.mjs — do not edit by hand. -->`,
);
out.push(`<!-- Source of truth: src/lib/data.ts + src/lib/attributes.ts -->`);
out.push(``);
out.push(
  `${total} tools across ${categories.length} sections, ordered as a production stack — layer 1 is the substrate everything else runs on. Not ordered by popularity, and not a list of AI apps.`,
);
out.push(``);
out.push(
  `Every entry on [${siteUrl}](${siteUrl}) carries two sentences: **when to use it** and **when to skip it**. The second one is the half almost nobody publishes, and it is the reason the first is worth reading.`,
);
out.push(``);
out.push(`## Why this list is different`);
out.push(``);
out.push(`- **Layered, not categorised.** The nine layers are a dependency chain: you cannot tune weights before you serve them, and you cannot evaluate what you cannot observe.`);
out.push(`- **Every entry states when to skip it.** A directory that only upsells has no reason to be accurate about anything else.`);
out.push(`- **Machine-checked freshness.** Licence and cost figures are dated, and the site's build fails if any is more than six months old. Dataset as of **${AS_OF}**.`);
out.push(`- **No sponsored placement.** Nothing here is ranked by who paid.`);
out.push(`- **No star counts.** They can be inflated and they say nothing about whether a tool fits your constraint.`);
out.push(``);
out.push(
  `**Something broken?** [Start from the symptom](${siteUrl}/fix) — slow, expensive, wrong answers, an agent that keeps failing — for an ordered checklist through the stack.`,
);
out.push(``);
out.push(
  `[Full index](${siteUrl}/all) · [Comparisons](${siteUrl}/compare) · [Methodology, including where this list is wrong](${siteUrl}/methodology) · [Essays](${siteUrl}/blog) · [Glossary](${siteUrl}/glossary)`,
);
out.push(``);

// Table of contents.
out.push(`## Contents`);
out.push(``);
for (const s of sections) {
  const label = s.layer === null ? s.title : `${s.index} — ${s.title}`;
  out.push(
    `- [${label}](#${slugify(s.title)}) — ${s.tools.length} entries`,
  );
}
out.push(``);

const HEADERS = {
  5: "| Tool | What it is | Skip it when | Licence | Cost |",
};

for (const s of sections) {
  const band = bandOf(s.layer);
  const tag =
    s.layer === null
      ? "off-stack"
      : `layer ${s.layer} · band ${band}`;
  out.push(`---`);
  out.push(``);
  out.push(`## ${s.title}`);
  out.push(``);
  out.push(
    `_${tag}_ — ${s.tools.length} ${s.tools.length === 1 ? "entry" : "entries"}.`,
  );
  out.push(``);
  out.push(HEADERS[5]);
  out.push(`| --- | --- | --- | --- | --- |`);
  out.push(rowsFor(s.tools, s.slug));
  out.push(``);
}

out.push(`---`);
out.push(``);
out.push(`## Machine-readable`);
out.push(``);
out.push(
  `This list is generated from the site's dataset. If you want the whole thing as structured data rather than markdown:`,
);
out.push(``);
out.push(`- \`${siteUrl}/tools.json\` — every entry with use/skip, layer, licence and cost as fields`);
out.push(`- \`${siteUrl}/verification.json\` — the freshness rule, and each entry's check and expiry`);
out.push(`- \`${siteUrl}/llms.txt\` — task-keyed index for AI agents`);
out.push(`- \`${siteUrl}/llms-full.txt\` — the full dataset as plain text`);
out.push(`- \`${siteUrl}/feed.xml\` — essays`);
out.push(``);
out.push(
  `Corrections and suggestions: [${siteUrl}/methodology](${siteUrl}/methodology#corrections). A submission only becomes an entry if it clears the same bar as everything already listed.`,
);
out.push(``);
out.push(
  `<!-- Dataset as of ${AS_OF}. Generated from the site build, so it cannot claim a different freshness than the pages it links to. -->`,
);
out.push(``);

/**
 * GitHub's heading anchor rule: lowercase, drop punctuation, each space
 * becomes a hyphen. So "Inference & Serving" is `#inference--serving` — the
 * ampersand disappears and both spaces stay. Anything else breaks every
 * Contents link on the page that matters most.
 */
function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/ /g, "-");
}

const markdown = ascii(out.join("\n"));

const targets = [
  join(root, "public/awesome-lattice.md"),
  join(root, "src/content/awesome-lattice.md"),
];

for (const target of targets) {
  try {
    writeFileSync(target, markdown, "utf8");
    console.log(
      `wrote ${target.replace(root + "\\", "")} — ${total} tools, ${sections.length} sections, dataset ${AS_OF}`,
    );
  } catch (err) {
    // The public/ copy is the one that matters; the content/ copy is a bonus
    // for anything that reads the content directory. Missing the second is
    // not a failure.
    console.log(
      `skipped ${target.replace(root + "\\", "")} — ${err.code ?? err.message}`,
    );
  }
}