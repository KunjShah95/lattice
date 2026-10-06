/**
 * Projects the MDX essay bodies to Markdown, for the MCP server's resources.
 *
 * ## Why this exists
 *
 * `posts.ts` imports each essay as an MDX module, which gives the site a React
 * component and nothing else — the prose is compiled away. The MCP server's
 * `resources/read` has to return the essay as text, and there is no way to get
 * it back out of a component.
 *
 * So it is read from the source files at build time and written to a generated
 * module. Not at request time: the Worker has no filesystem, and `new URL(…,
 * import.meta.url)` does not survive the OpenNext bundle. Not by hand either —
 * a copy of the prose that is not derived from the prose is exactly the kind of
 * second source of truth this repo keeps refusing, and it would drift silently
 * the first time an essay was reworded.
 *
 * ## `--check`
 *
 * Regenerates into memory and compares. `npm run generate:check` fails on a
 * difference, so a reworded essay cannot ship with a stale resource body — which
 * is the same reason `generate-awesome-list.mjs` has a check mode.
 *
 * ## What is stripped
 *
 * - `import` / `export` lines. The frontmatter `export const meta` block is not
 *   prose; the metadata is already served as the resource description and the
 *   tool list, so duplicating it would put two copies of a title in one
 *   document.
 * - Figure components (`<RagPipeline />`) and their surrounding blank lines.
 *   They render as diagrams on the page and have no text form here. They are
 *   replaced with a one-line marker rather than deleted, so a reader of the
 *   resource can tell something was in that position instead of silently
 *   getting a paragraph break where a diagram was.
 * - MDX comment syntax `{/* … *\/}`, which is invisible on the page and would
 *   otherwise show up as stray braces.
 */

import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BLOG_DIR = join(ROOT, "src", "content", "blog");
const OUT = join(ROOT, "src", "content", "essay-text.generated.ts");

/** PascalCase figure components registered in `components/diagrams/index.tsx`. */
const FIGURES = [
  "RequestPath",
  "RagPipeline",
  "AgentLoop",
  "EvalFlywheel",
  "PromptVsTune",
];

function toMarkdown(source) {
  const lines = source.split(/\r?\n/);
  const out = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Imports, and the multi-line `export const meta = { … }` frontmatter
    // block. Skipped by advancing past the closing brace rather than by
    // re-scanning, because `indexOf` would find the *first* occurrence of a
    // duplicated line and skip the wrong span.
    if (/^import\s/.test(trimmed)) continue;
    if (/^export\s/.test(trimmed)) {
      if (/^export const meta\s*=\s*\{/.test(trimmed)) {
        while (i + 1 < lines.length && !/^\s*\}\s*;?\s*$/.test(lines[i + 1])) i++;
        i++; // and skip the closing brace itself
      }
      continue;
    }

    // A figure on its own line becomes a marker, not a deletion.
    const figure = FIGURES.find((f) => new RegExp(`^<${f}\\s*/>$`).test(trimmed));
    if (figure) {
      out.push(`*[Figure: ${figure} — see the canonical page]*`);
      continue;
    }

    out.push(line.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, ""));
  }

  // Collapse the blank-line runs that stripping leaves behind, and trim. Two
  // blank lines in Markdown is a hard paragraph break, and leaving them where a
  // figure used to be would reformat the surrounding prose.
  return out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Built module text, and the number of essays in it. */
function build() {
  if (!existsSync(BLOG_DIR)) {
    console.error(`No blog directory at ${BLOG_DIR}`);
    process.exit(1);
  }

  const files = readdirSync(BLOG_DIR).filter((f) => f.endsWith(".mdx")).sort();
  const entries = [];

  for (const file of files) {
    const slug = file.replace(/\.mdx$/, "");
    const markdown = toMarkdown(readFileSync(join(BLOG_DIR, file), "utf8"));
    if (!markdown) {
      throw new Error(`${file} produced no text — the stripper is probably too aggressive.`);
    }
    entries.push([slug, markdown]);
  }

  const module = `/**
 * GENERATED — do not edit. Run \`npm run generate\` after changing any essay.
 *
 * The prose of each MDX essay, projected to Markdown for the MCP server's
 * \`resources/read\`. See \`scripts/build-essay-text.mjs\` for why this is a
 * build artefact and not read at request time.
 *
 * \`npm run generate:check\` fails the build if this drifts from the MDX source,
 * so a reworded essay cannot ship with a stale resource body.
 */

/** Essay slug to its Markdown body. */
export const essayBodies: Record<string, string> = {
${entries.map(([slug, md]) => `  ${JSON.stringify(slug)}: ${JSON.stringify(md)},`).join("\n")}
};
`;

  return { module, count: entries.length };
}

const { module: generated, count } = build();

if (process.argv.includes("--check")) {
  const existing = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
  if (existing !== generated) {
    console.error(
      [
        "",
        "src/content/essay-text.generated.ts is out of step with the MDX essays.",
        "",
        "Run `npm run generate` and commit the result. The MCP server serves",
        "these bodies as resources, so a stale copy ships an essay that no longer",
        "matches the page it links to.",
      ].join("\n"),
    );
    process.exit(1);
  }
  console.log("essay text is in step with the MDX source");
  process.exit(0);
}

writeFileSync(OUT, generated, "utf8");
console.log(`wrote ${count} essay bodies to src/content/essay-text.generated.ts`);