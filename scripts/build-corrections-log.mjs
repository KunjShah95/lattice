/**
 * Extracts the corrections log from git history, for `/corrections`.
 *
 * ## Why this is generated rather than written
 *
 * `/methodology` §06 describes how corrections are handled. Nothing recorded that
 * they happened. So the claim "we publish our limits and fix what we get wrong"
 * was a promise with no evidence behind it — and stated uncertainty only earns
 * citations when the uncertainty is visibly *acted on*.
 *
 * Deriving the page from `git log` means it cannot drift from what actually
 * happened. A hand-written corrections page would be a list someone maintains,
 * and a list someone maintains is the first thing that goes stale.
 *
 * ## What counts as a correction
 *
 * Commits that touch `src/lib/attributes.ts` or `src/lib/data.ts` — the two files
 * that hold what a tool *is* and what it *is for*. Those are the edits where a
 * licence, a cost, a layer or a skip-when sentence can change, and they are
 * exactly the claims the build's freshness guard is about.
 *
 * Commit *subjects* are the log. Reading diffs to classify "this was a correction
 * rather than a feature" would mean either guessing at intent or hand-labelling,
 * and both would put a human judgement in a supposedly automatic pipeline. The
 * subjects here are written in the imperative and say what changed, which is
 * already the convention this repository follows.
 *
 * ## Not a substitute for the guard
 *
 * This is a *narrative* of the dataset changing. The machine-readable receipt is
 * still `/verification.json`, and it is the one with an enforcement mechanism
 * behind it. A changelog can be edited; a build that throws cannot.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "src", "content", "corrections.generated.ts");

/** The files whose history is the corrections log. */
const WATCHED = ["src/lib/attributes.ts", "src/lib/data.ts"];

/**
 * How many entries to publish.
 *
 * Bounded because a page that grows without limit stops being readable, and
 * because the interesting corrections are the recent ones. `AS_OF` is the anchor
 * rather than "today", so the page does not change shape depending on when the
 * build ran.
 */
const LIMIT = 25;

function git(args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 8 << 20 });
}

/**
 * `git log` for the watched paths.
 *
 * Two calls rather than one: `--pretty` has no placeholder for the changed file
 * list (`%f` is not one), and passing `--name-only` alongside `--format` mixes the
 * two outputs into a single unparseable stream. Same arguments for both, so the
 * two lists line up index for index.
 *
 * `--no-merges`: a merge commit touching `data.ts` is a conflict resolution
 * carrying someone else's subject line, not a correction.
 */
/**
 * Shared `git log` arguments.
 *
 * Options first, pathspec last, and the `--` is load-bearing: everything after it
 * is a path. Passing `--format=` *after* the pathspec silently makes it a
 * pathspec too, which is why an earlier version of this read zero commits with
 * no error anywhere.
 */
const LOG_ARGS = ["log", "--date=short", "--no-merges", "-n", String(LIMIT)];
const PATHS = ["--", ...WATCHED];

const RECORD = "\u001e";
const FIELD = "\u001f";

function readLog() {
  const meta = git([
    ...LOG_ARGS,
    "--format=%H" + FIELD + "%ad" + FIELD + "%s" + RECORD,
    ...PATHS,
  ])
    .split(RECORD)
    .map((l) => l.trim())
    .filter(Boolean);

  /**
   * Files per commit, keyed by SHA rather than by position.
   *
   * `--name-only` separates records with a blank line, and git emits a leading
   * one, so splitting and zipping against the metadata list silently shifts every
   * entry by one — the first version did exactly that and reported an empty file
   * list for two commits out of eight. Prefixing each record with the SHA makes
   * the join explicit, which is what removes the dependency on ordering.
   */
  const filesBySha = new Map();
  for (const record of git([
    ...LOG_ARGS,
    "--name-only",
    // Both markers, in that order: the record separator has to be *in the
    // format*, not merely used to split. Without it git runs every record
    // together, the split returns one blob, and the parse succeeds with eight
    // entries and no files — which is exactly what it did.
    `--format=${RECORD}${FIELD}%H`,
    ...PATHS,
  ]).split(RECORD)) {
    // The record is `<marker><sha>` on its own line, then a blank line, then the
    // file list. Files come *after* the SHA — which is the second time this
    // parsing has assumed otherwise, and the empty `touched` arrays it produced
    // were the only symptom.
    // No leading comma here: the SHA *is* the first line. An earlier version
    // skipped it, so `shaLine` was the blank separator line, `sha` was always
    // empty, and the map stayed empty — silently, with the right number of
    // entries and no files on any of them.
    const [shaLine, ...rest] = record.replace(/^\u001f/, "").split("\n");
    const sha = (shaLine ?? "").trim();
    const listed = rest.map((f) => f.trim()).filter(Boolean);
    if (sha) filesBySha.set(sha, listed);
  }

  return meta.map((line) => {
    const [sha, date, subject] = line.split(FIELD);
    return { sha, date, subject, files: filesBySha.get(sha) ?? [] };
  });
}

/** Which dataset a path represents, as a label a reader can follow. */
function labelFor(file) {
  if (file.includes("attributes.ts")) return "classification";
  if (file.includes("data.ts")) return "the index";
  return file.replace(/^src\/lib\//, "");
}

function parse() {
  return readLog()
    .filter((r) => r.sha && r.subject)
    .map(({ sha, date, subject, files }) => ({
      date,
      // The commit subject verbatim. Not trimmed or re-titled: a paraphrased log
      // is a second claim about what happened, and this page's whole value is
      // that it is not one.
      title: subject,
      hash: sha.slice(0, 7),
      url: `https://github.com/KunjShah95/lattice/commit/${sha}`,
      touched: [...new Set(files.map(labelFor))].sort(),
    }));
}

function module(entries) {
  return `/**
 * GENERATED — do not edit. Run \`npm run generate\` to rebuild.
 *
 * The corrections log for \`/corrections\`, derived from git history over
 * \`src/lib/attributes.ts\` and \`src/lib/data.ts\`. See
 * \`scripts/build-corrections-log.mjs\` for why it is generated and what counts.
 */

/** Newest first. */
export type Correction = {
  /** YYYY-MM-DD */
  date: string;
  /** The commit subject, verbatim. */
  title: string;
  /** Abbreviated SHA. */
  hash: string;
  /** Canonical commit URL. */
  url: string;
  /** Which dataset the commit touched. */
  touched: string[];
};

export const corrections: Correction[] = ${JSON.stringify(entries, null, 2)};
`;
}

/**
 * Build, or verify.
 *
 * `--check` regenerates in memory and compares, so a dataset edit that was
 * committed without regenerating fails the build — the same contract
 * `generate-awesome-list.mjs --check` and `build-essay-text.mjs --check` have.
 *
 * A repository with no git history (a shallow CI clone, an exported tarball)
 * produces an empty list rather than throwing: a page with no corrections yet is
 * a correct page, and failing the build over it would be worse than useless.
 */
const entries = existsSync(join(root, ".git")) ? parse() : [];
const generated = module(entries);

if (process.argv.includes("--check")) {
  const existing = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
  if (existing !== generated) {
    console.error(
      [
        "",
        "src/content/corrections.generated.ts is out of step with git history.",
        "",
        "Run `npm run generate` and commit the result. /corrections is derived from",
        "the commit log, so a stale copy publishes a corrections page that does not",
        "match what has actually been corrected.",
      ].join("\n"),
    );
    process.exit(1);
  }
  console.log(`corrections log is in step (${entries.length} entries)`);
  process.exit(0);
} else {
  writeFileSync(OUT, generated, "utf8");
  console.log(`wrote ${entries.length} corrections to src/content/corrections.generated.ts`);
}