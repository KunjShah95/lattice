/**
 * Turns a submission issue into a draft pull request.
 *
 * Run under bare `node` in CI with no build step — the same constraint as
 * `generate-awesome-list.mjs`, and the reason the shared logic lives in
 * `src/lib/submissions.mjs` as plain ESM rather than as TypeScript. That module
 * owns the format; this file owns the side effects.
 *
 * WHAT IT FILLS, AND WHAT IT REFUSES TO FILL
 *
 * Facts come from the GitHub API: the licence the repository reports, the
 * language GitHub infers, whether public releases exist. A reviewer can check
 * every one of those against the page it was read from.
 *
 * Judgements are left as `TODO`: whether the tool is infrastructure at all,
 * which layer it belongs to, `cost`, `roles`, and the use-when/skip-when pair.
 * Those are the argument `methodology` §01 says a person makes, and a pipeline
 * that fills them in produces a plausible layer assignment nobody checked —
 * the exact failure mode the site exists to argue against.
 *
 * So the PR cannot merge as written. It carries a marker in its body, and the
 * workflow's `submission-check` step fails while that marker says blocked. That
 * is the design, not a gap in it.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";

import {
  PR_TITLE_PREFIX,
  NOT_READY_MARKER,
  READY_MARKER,
  branchFor,
  draftEntry,
  factsFromRepo,
  hostOf,
  parseSubmission,
  repoSlug,
} from "../src/lib/submissions.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
nextEnv.loadEnvConfig(root);

const {
  GITHUB_TOKEN: token,
  ISSUE_NUMBER: issueNumber,
  ISSUE_AUTHOR: issueAuthor = "unknown",
  ISSUE_URL: issueUrl = "",
  REPO_SLUG: repoSlugEnv,
} = process.env;

if (!token || !issueNumber) {
  console.error("GITHUB_TOKEN and ISSUE_NUMBER are required.");
  process.exit(1);
}

const [owner, repo] = (repoSlugEnv ?? "").split("/");
if (!owner || !repo) {
  console.error("REPO_SLUG is required, as owner/name.");
  process.exit(1);
}

/** The public API root. Issues and PRs are repo-scoped; repo reads are not. */
const REPO_API = `https://api.github.com/repos/${owner}/${repo}`;
const PUBLIC_API = "https://api.github.com";

const headers = {
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "lattice-submission-triage",
};

const git = (...args) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

async function gh(url, init = {}) {
  const response = await fetch(url, { ...init, headers });
  if (!response.ok) {
    throw new Error(
      `GitHub ${init.method ?? "GET"} ${url} → ${response.status}: ${await response.text()}`,
    );
  }
  return response.json();
}

/**
 * Write a workflow output.
 *
 * `::set-output` is deprecated and warns on every run; `$GITHUB_OUTPUT` is the
 * supported replacement. Written as a function so the one deprecated call in
 * this file is the only place the format appears.
 */
function setOutput(name, value) {
  const file = process.env.GITHUB_OUTPUT;
  if (!file) return;
  // Multiline-safe: GitHub's own parser needs the heredoc form for a value
  // containing newlines, and this one does (the PR URL is joined into a note).
  const delim = `ghadelim_${name}`;
  writeFileSync(file, `${name}<<${delim}\n${value}\n${delim}\n`, { flag: "a" });
}

/** Comment on the issue. A failed comment must not fail the run. */
async function comment(text) {
  try {
    await gh(`${REPO_API}/issues/${issueNumber}/comments`, {
      method: "POST",
      body: JSON.stringify({ body: text }),
    });
  } catch (error) {
    console.warn(`Could not comment on the issue: ${error.message}`);
  }
}

const fail = async (reason) => {
  console.error(reason);
  await comment(reason);
  process.exit(1);
};

// ---------------------------------------------------------------- read issue

let issue;
try {
  issue = await gh(`${REPO_API}/issues/${issueNumber}`);
} catch (error) {
  // Almost always a bad token or a wrong issue number. Failing without
  // commenting, because commenting is what just failed.
  console.error(`Could not read issue #${issueNumber}: ${error.message}`);
  process.exit(1);
}

// `issues: [labeled]` also fires on pull requests, which arrive with the same
// payload shape. Triaging a PR as a submission would push a branch with no
// review at all.
if (issue.pull_request) {
  console.log(`#${issueNumber} is a pull request, not a submission. Skipping.`);
  process.exit(0);
}

const parsed = parseSubmission(issue.body ?? "");

// Every missing field in one comment. One field per run would cost a round trip
// per field and a day per submission.
if (parsed && !parsed.ok) {
  await fail(
    `Nothing to draft yet — ${parsed.missing.length} field(s) missing:\n\n` +
      parsed.missing.map((f) => `- **${f}**`).join("\n") +
      "\n\nThe form is at `/submit`. The field names and the fence markers have " +
      "to survive editing: the bot reads them, and a renamed field arrives empty.",
  );
}

if (!parsed) {
  await fail(
    "Could not read a submission out of this issue. The form is a set of " +
      "fenced code blocks under `###` headings — if the headings were reworded " +
      "beyond recognition or the fences removed, the fields arrive empty. " +
      "The template is at `/submit`.",
  );
}

// ------------------------------------------------------------------- dedupe

/**
 * Names already in the dataset.
 *
 * Read with the same shape `generate-awesome-list.mjs` uses rather than a second
 * regex: two regexes over one source file drift, and the drift surfaces as a
 * duplicate tool on the live site rather than as a failing script.
 */
const dataSrc = readFileSync(join(root, "src/lib/data.ts"), "utf8");
const existingNames = [...dataSrc.matchAll(/t\(\s*"([^"]+)"/g)].map((m) => m[1]);

// --------------------------------------------------------------- repo facts

/**
 * Facts from the submitter's repository, when they gave one that resolves.
 *
 * The lookup is what makes the licence checkable: the value written into
 * `attributes.ts` is read from the API response rather than copied from a
 * README, so a reviewer can re-read it and get the same string. A 404 leaves
 * every fact null, which the draft renders as "could not confirm" rather than
 * filling anything in.
 */
let facts = factsFromRepo(null);

const submittedRepo = repoSlug(parsed.values.repository ?? "");
if (submittedRepo) {
  try {
    const data = await gh(`${PUBLIC_API}/repos/${submittedRepo}`);
    facts = factsFromRepo(data, {
      archived: data.archived === true,
      pushedAt: data.pushed_at ?? null,
    });
  } catch (error) {
    console.warn(`Could not read ${submittedRepo}: ${error.message}`);
  }
}

// ------------------------------------------------------------------- draft

const slug =
  (hostOf(parsed.values.homepage) ?? parsed.values.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);

const draft = draftEntry(parsed, facts, { slug, existingNames });
const branch = branchFor(slug);
const title = `${PR_TITLE_PREFIX} ${parsed.values.name}`.slice(0, 72);

// ------------------------------------------------------- write the branch

/**
 * Insert the draft into the dataset and push it.
 *
 * The insertion is a string append rather than an AST edit on purpose: the
 * dataset is generated code shaped by hand, the exact placement of a new row is
 * a judgement (alphabetical within the section, usually), and a reviewer moving
 * one line is cheaper than a script guessing where it belongs. So the row lands
 * at the end of the proposed section's block and the PR says where it went.
 */
const dataPath = join(root, "src/lib/data.ts");
const attrPath = join(root, "src/lib/attributes.ts");

/**
 * The offset just past the last `t(...)` row in a named section's block.
 *
 * Bounded by the *next* section rather than by the end of the file. Slicing to
 * end-of-file and taking the final match looks equivalent and is not: it lands
 * on the last row of the last section in the file, so every submission was
 * appended to Learning & Reference and mangled the Distill row it landed in.
 * The bug is invisible in review because the branch is thrown away.
 */
function endOfSection(src, sectionSlug) {
  const start = src.indexOf(`slug: "${sectionSlug}"`);
  if (start === -1) return -1;

  // The next section header, or the end of the array.
  const nextHeader = src.slice(start + 1).search(/\n\s*\{\n\s*index:/);
  const end = nextHeader === -1 ? src.length : start + 1 + nextHeader;

  const rows = [...src.slice(start, end).matchAll(/t\(\s*"[^"]+"/g)];
  if (!rows.length) return -1;

  const last = rows[rows.length - 1];
  return start + last.index + last[0].length;
}

if (draft.section) {
  const insertAt = endOfSection(dataSrc, draft.section);
  if (insertAt === -1) {
    await fail(
      `The proposed section \`${draft.section}\` is not in \`src/lib/data.ts\`. ` +
        `That means the layer list and the dataset have drifted, which is a bug ` +
        `in the site rather than in the submission.`,
    );
  }
  writeFileSync(
    dataPath,
    dataSrc.slice(0, insertAt) + "\n      " + draft.dataBlock + dataSrc.slice(insertAt),
    "utf8",
  );
}

// attributes.ts is edited by appending to the named section's comment block
// rather than by locating the block, because attributes.ts is a flat record with
// section comments rather than nested objects. Appending to the end keeps the
// diff a pure addition, which is what a reviewer wants.
const attrSrc = readFileSync(attrPath, "utf8");
writeFileSync(
  attrPath,
  `${attrSrc.replace(/\s*$/, "")}\n\n${draft.attrBlock}`,
  "utf8",
);

try {
  git("checkout", "-b", branch);
  git("add", "src/lib/data.ts", "src/lib/attributes.ts");
  git(
    "commit",
    "-m",
    `${PR_TITLE_PREFIX} ${parsed.values.name} (#${issueNumber})\n\n` +
      `Drafted from a submission. Filled from the GitHub API; left TODO for\n` +
      `review: layer, cost, roles, use/skip, blurb.`,
  );
  git("push", "--force-with-lease", "origin", branch);
} catch (error) {
  console.error(`Could not push ${branch}: ${error.message}`);
  await fail(
    `I could not push the draft branch \`${branch}\`. The drafted entry is below — ` +
      `add it by hand and close this issue.\n\n` +
      `In \`src/lib/data.ts\` (section \`${draft.section ?? "?"}\`):\n\n` +
      "```ts\n" + draft.dataBlock + "\n```\n\n" +
      "In `src/lib/attributes.ts`:\n\n```ts\n" + draft.attrBlock + "\n```",
  );
}

// ------------------------------------------------------------------ open PR

const body = [
  `Submitted via \`/submit\` by @${issueAuthor} in #${issueNumber}.`,
  "",
  draft.judge,
  "",
  "### The entry, as it will read",
  "",
  draft.section
    ? `Appended to the end of \`${draft.section}\` in \`src/lib/data.ts\`. Move it if the position is wrong — alphabetical within a section is the convention.`
    : "**No section chosen**, because the submitted layer did not resolve. Pick one and place the row.",
  "",
  "```ts",
  draft.dataBlock,
  "```",
  "",
  "```ts",
  draft.attrBlock,
  "```",
  "",
  draft.duplicates.length
    ? `> **Already in the dataset:** ${draft.duplicates.join(", ")}. This may be a correction rather than a new entry — check before merging, and do not add a second page for one product.`
    : "",
  "### Before this merges",
  "",
  "1. Fill in every `TODO`. The build fails on the licence gate and the tests fail on the missing roles, so this cannot merge half-written.",
  "2. Confirm the layer. The submitter's guess is a starting point, not an answer.",
  "3. Decide whether the tool is infrastructure at all — that is §01 of the methodology, and no bot applied it.",
  "4. Rewrite the blurb. It is a one-sentence definition, not a tagline.",
  "5. Then set the marker below to `ready` and mark the PR ready for review.",
  "",
  "---",
  "",
  "The submitter's own words, unedited:",
  "",
  `> **Why it belongs here:** ${parsed.values.why}`,
  `> **Use when:** ${parsed.values.useWhen}`,
  `> **Skip when:** ${parsed.values.skipWhen}`,
  parsed.values.notes ? `> **Notes:** ${parsed.values.notes}` : "",
  "",
  issueUrl ? `Source: ${issueUrl}` : "",
  "",
  `<!-- ${draft.ready ? READY_MARKER : NOT_READY_MARKER} -->`,
]
  .filter((line) => line !== undefined && line !== "")
  .join("\n");

let prUrl = "";
try {
  const pr = await gh(`${REPO_API}/pulls`, {
    method: "POST",
    body: JSON.stringify({
      title,
      head: branch,
      base: "main",
      body,
      // Draft cannot be merged by accident even if the marker is edited. Two
      // independent guards: this one, and the failing CI check.
      draft: true,
    }),
  });
  prUrl = pr.html_url ?? "";
} catch (error) {
  // 422 means a PR already exists for this branch — the common case on an edited
  // submission, and not a failure worth failing the run for. The existing PR
  // already carries a draft somebody is working through.
  if (String(error.message).includes("422")) {
    console.log(`A PR already exists for ${branch}. Nothing to do.`);
    await comment(
      `This submission was already drafted from \`${branch}\`. Editing the issue ` +
        `body does not update it — edit the branch, or close the old PR and ` +
        `reopen the issue to re-draft.`,
    );
    setOutput("pr_url", "");
    process.exit(0);
  }
  throw error;
}

await comment(
  `Drafted: ${prUrl}\n\n` +
    `Filled from the GitHub API — licence ${
      facts.license ? `\`${facts.license}\`` : "**unconfirmed**"
    }, language ${facts.language ? `\`${facts.language}\`` : "**unconfirmed**"}.\n` +
    (facts.archived ? "> This repository is archived. Confirm it still works.\n" : "") +
    `\nLeft for review: the layer${
      draft.section ? ` (proposed ${draft.section})` : " (**unresolved**)"
    }, cost, roles, and the use-when/skip-when lines. Nothing publishes from here ` +
    `without a human editing it.`,
);

setOutput("pr_url", prUrl);
console.log(`Opened ${prUrl} from ${branch}`);