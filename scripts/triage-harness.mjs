/**
 * Offline harness for `site/scripts/triage-submission.mjs`.
 *
 * The script runs under bare node with no build step, and its whole job is a
 * sequence of irreversible side effects: edit two source files, push a branch,
 * open a PR, comment on an issue. That combination cannot be exercised from
 * vitest without a live token, and — more importantly — it must not be
 * exercised against the real repository. An earlier version of this harness ran
 * the target with `cwd` set to the checkout, and the target's `git checkout -b`
 * moved the working tree onto a submission branch and appended a junk entry to
 * `src/lib/data.ts`. Everything it touched had to be restored by hand.
 *
 * So this builds a throwaway repository: copies the two files the script edits,
 * gives it a local bare remote, stubs `@next/env` and `fetch`, and runs the
 * target there. Nothing outside the temp directory is reachable from it.
 *
 * It is a script rather than a test case because the fetch stub has to be
 * installed before the target's module graph is evaluated — ESM imports are
 * hoisted, so replacing `globalThis.fetch` from inside a test cannot happen in
 * time. A child process with `--import` can. See `triage-stub.mjs`.
 *
 * Run: node scripts/triage-harness.mjs
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));
const site = join(here, "..");
const STUB = join(here, "triage-stub.mjs");

let failures = 0;
const check = (name, fn) => {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (error) {
    failures++;
    console.error(`FAIL  ${name}\n      ${error.message}`);
  }
};

/** A submission body, shaped exactly as `ISSUE_TEMPLATE` emits it. */
const ISSUE = [
  "<!-- filler -->",
  "",
  "### Tool name",
  "",
  "```",
  "Example Guard",
  "```",
  "",
  "### Homepage",
  "",
  "```",
  "https://example.com",
  "```",
  "",
  "### Repository",
  "",
  "```",
  "https://github.com/example/guard",
  "```",
  "",
  "### Which layer do you think it belongs in?",
  "",
  "```",
  "07 Guardrails & Safety",
  "```",
  "",
  "### One sentence: why it belongs on this index at all",
  "",
  "```",
  "It classifies prompt injection before the request reaches the model.",
  "```",
  "",
  "### Use it when",
  "",
  "```",
  "Untrusted input reaches the model.",
  "```",
  "",
  "### Skip it when",
  "",
  "```",
  "You need request-level rate limiting instead.",
  "```",
  "",
  "### Anything the reviewer should know",
  "",
  "```",
  "Pricing changes monthly.",
  "```",
  "",
].join("\n");

/** What the stubbed repo endpoint returns. `null` makes it 404. */
const REPO_JSON = {
  name: "guard",
  full_name: "example/guard",
  license: { spdx_id: "Apache-2.0" },
  language: "Python",
  archived: false,
  pushed_at: "2026-09-20T10:00:00Z",
  stargazers_count: 812,
  owner: { type: "Organization" },
};

/** `@next/env`, stubbed: it exists in the sandbox only to satisfy the import. */
function writeEnvStub(dir) {
  const pkg = join(dir, "node_modules", "@next", "env");
  mkdirSync(pkg, { recursive: true });
  writeFileSync(
    join(pkg, "package.json"),
    JSON.stringify({ name: "@next/env", version: "0.0.0-stub", main: "index.js", type: "commonjs" }),
  );
  // `loadEnvConfig` reads .env files. In the sandbox there are none and none are
  // wanted, so a no-op is both correct and the reason the sandbox does not need
  // the real dependency tree.
  writeFileSync(join(pkg, "index.js"), "module.exports = { loadEnvConfig() {} };\n");
}

/**
 * Run the target against a stubbed GitHub inside a throwaway repository.
 *
 * Returns the captured result plus a `cleanup`. Two separate things rather than
 * one, because a function that both cleans up and holds the assertions invites
 * calling it for one and losing the other.
 */
function run({ body = ISSUE, repo = REPO_JSON, issueNumber = "42" } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "lattice-triage-"));
  const log = join(dir, "call-log.json");
  const fixtures = join(dir, "fixtures.json");
  const remote = join(dir, "remote.git");

  // A sandbox with the same layout the target expects, so the `../src/lib/…`
  // import and the `root` it derives from the script path both resolve.
  mkdirSync(join(dir, "scripts"), { recursive: true });
  mkdirSync(join(dir, "src", "lib"), { recursive: true });
  writeEnvStub(dir);
  copyFileSync(join(site, "scripts", "triage-submission.mjs"), join(dir, "scripts", "triage-submission.mjs"));
  copyFileSync(join(site, "src", "lib", "submissions.mjs"), join(dir, "src", "lib", "submissions.mjs"));
  copyFileSync(join(site, "src", "lib", "data.ts"), join(dir, "src", "lib", "data.ts"));
  copyFileSync(join(site, "src", "lib", "attributes.ts"), join(dir, "src", "lib", "attributes.ts"));

  // Fixtures go in a file rather than into generated source: an issue body is
  // markdown full of backticks, and embedding one inside a template literal
  // terminates it. That failure surfaces as a syntax error in the stub on an
  // unrelated line, which is why the stub is a real file instead.
  writeFileSync(fixtures, JSON.stringify({ body, repo }));

  const git = (...args) =>
    execFileSync("git", args, { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  git("init", "--initial-branch=main");
  git("config", "user.email", "harness@example.invalid");
  git("config", "user.name", "Harness");
  git("add", "-A");
  git("commit", "-m", "sandbox");
  execFileSync("git", ["init", "--bare", "--initial-branch=main", remote], { encoding: "utf8" });
  git("remote", "add", "origin", remote);
  git("push", "origin", "main");

  let stdout = "";
  let threw = null;
  try {
    stdout = execFileSync(
      process.execPath,
      // `pathToFileURL` rather than the raw path: `--import` takes a specifier,
      // and on Windows a bare `C:\...` path parses as a URL with an unsupported
      // `c:` scheme. The error names node's ESM loader, a long way from here.
      ["--import", pathToFileURL(STUB).href, "scripts/triage-submission.mjs"],
      {
        cwd: dir,
        encoding: "utf8",
        env: {
          ...process.env,
          GITHUB_TOKEN: "stub",
          ISSUE_NUMBER: issueNumber,
          ISSUE_AUTHOR: "tester",
          ISSUE_TITLE: "Add Example Guard",
          ISSUE_URL: "https://github.com/KunjShah95/lattice/issues/42",
          REPO_SLUG: "KunjShah95/lattice",
          TRIAGE_STUB_LOG: log,
          TRIAGE_STUB_FIXTURES: fixtures,
          // The target refuses to run outside CI unless this is set. The harness
          // earns the exception because it runs inside a throwaway repository —
          // the guard exists to stop the script touching a working tree, and
          // there is no working tree here.
          TRIAGE_ALLOW_LOCAL: "1",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
  } catch (error) {
    threw = error;
    stdout = `${error.stdout ?? ""}\n${error.stderr ?? ""}`;
  }

  let calls = [];
  try {
    calls = JSON.parse(readFileSync(log, "utf8"));
  } catch {
    // An absent log means the stub never ran, which the assertions below report
    // more usefully than throwing here would.
  }

  const dataAfter = readFileSync(join(dir, "src", "lib", "data.ts"), "utf8");
  const attrsAfter = readFileSync(join(dir, "src", "lib", "attributes.ts"), "utf8");
  // `git branch --list` prefixes the current branch with `*`, which is noise for
  // an assertion about names.
  const branches = git("branch", "--list", "submission/*")
    .split("\n")
    .map((line) => line.replace(/^[* ]+/, ""))
    .filter(Boolean);

  return {
    stdout,
    threw,
    calls,
    dataAfter,
    attrsAfter,
    branches,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

/** The single POST to /pulls, or undefined. */
const pullCall = (calls) => calls.find((c) => c.url.endsWith("/pulls") && c.method === "POST");

/** Every comment body the script posted, joined. */
const commentText = (calls) =>
  calls
    .filter((c) => c.url.endsWith("/comments") && c.payload)
    .map((c) => c.payload.body)
    .join("\n");

const prBody = (calls) => pullCall(calls)?.payload?.body ?? "";

/** Blank out one fenced value, as a submitter who skipped a field would. */
const blankField = (body, heading) =>
  body.replace(
    new RegExp(`(### ${heading}\\n\\n\\x60\\x60\\x60\\n)[\\s\\S]*?(\\n\\x60\\x60\\x60)`),
    "$1$2",
  );

/**
 * One section's source block, from its `slug:` line to the next section header.
 *
 * Bounded the same way the target bounds its own search, because the assertion
 * about placement has to look at the same region the script wrote into —
 * otherwise "the row is in the section" can be true of the whole file.
 */
function sectionBlock(src, slug) {
  const start = src.indexOf(`slug: "${slug}"`);
  assert.notEqual(start, -1, `section ${slug} not found`);
  const next = src.slice(start + 1).search(/\n\s*\{\n\s*index:/);
  return next === -1 ? src.slice(start) : src.slice(start, start + 1 + next);
}

console.log("\ntriage-submission.mjs");

// ------------------------------------------------------------ the CI guard

{
  // The guard first, before anything else runs, because it is the check that
  // protects a working tree rather than an assertion about the output.
  const dir = mkdtempSync(join(tmpdir(), "lattice-triage-guard-"));
  let threw = null;
  let stdout = "";
  try {
    stdout = execFileSync(
      process.execPath,
      [join(site, "scripts", "triage-submission.mjs")],
      {
        cwd: dir,
        encoding: "utf8",
        env: {
          ...process.env,
          // Explicitly cleared, since `npm test` in CI would otherwise inherit
          // CI=true and the guard would never be exercised.
          CI: "",
          GITHUB_ACTIONS: "",
          TRIAGE_ALLOW_LOCAL: "",
          GITHUB_TOKEN: "stub",
          ISSUE_NUMBER: "42",
          REPO_SLUG: "KunjShah95/lattice",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
  } catch (error) {
    threw = error;
    stdout = `${error.stdout ?? ""}\n${error.stderr ?? ""}`;
  }

  check("refuses to run outside CI", () => {
    assert.notEqual(threw, null, "ran locally with a token and no complaint");
    assert.match(stdout, /Refusing to run outside CI/);
  });

  rmSync(dir, { recursive: true, force: true });
}

// --------------------------------------------------------------- happy path

{
  const { stdout, threw, calls, branches, cleanup } = run();

  check("exits cleanly on a complete submission", () => {
    assert.equal(threw, null, stdout.slice(0, 600));
  });

  check("reads the issue body", () => {
    assert.ok(
      calls.some((c) => /\/issues\/\d+$/.test(c.url) && c.method === "GET"),
      "never fetched the issue",
    );
  });

  check("reads the repository the submitter linked", () => {
    assert.ok(calls.some((c) => c.url.includes("/repos/example/guard")), "no repo lookup");
  });

  check("pushes a submission branch", () => {
    assert.equal(branches.length, 1, `branches: ${JSON.stringify(branches)}`);
    assert.match(branches[0], /^submission\//);
  });

  check("opens the PR as a draft", () => {
    const pull = pullCall(calls);
    assert.ok(pull, "never opened a pull request");
    assert.equal(pull.payload.draft, true, "PR is not a draft");
  });

  check("prefixes the title so the queue triages by reading it", () => {
    assert.match(pullCall(calls).payload.title, /^\[submission\]/);
  });

  check("tells the submitter what happened", () => {
    assert.match(commentText(calls), /pull\/7/);
  });

  check("reports the licence it read, so a wrong one is visible", () => {
    assert.match(commentText(calls), /Apache-2\.0/);
  });

  check("reports the PR url as a workflow output", () => {
    assert.match(stdout, /pull\/7/);
  });

  cleanup();
}

// --------------------------------------------- where the row actually landed

{
  const { dataAfter, attrsAfter, cleanup } = run();

  check("puts the row in the section the submitter proposed", () => {
    // The bug this pins: slicing to end-of-file and taking the last match
    // appended every submission to the final section, mangling the Distill row
    // it landed inside of. The branch is discarded, so a reviewer would never
    // have seen it happen.
    const block = sectionBlock(dataAfter, "guardrails-safety");
    assert.match(block, /Example Guard/, "the row is not inside the proposed section");
  });

  check("does not corrupt the last tool in the file", () => {
    assert.match(
      dataAfter,
      /t\("Distill", "distill\.pub", "Archive of carefully explained model and method explainers\."\),/,
      "the Distill row was rewritten",
    );
  });

  check("writes a syntactically intact row", () => {
    assert.match(
      dataAfter,
      /t\("Example Guard", "example\.com", "TODO[^"]*"\),/,
      "the inserted row is malformed",
    );
  });

  check("appends exactly one attributes entry", () => {
    assert.equal((attrsAfter.match(/"Example Guard": \{/g) ?? []).length, 1);
  });

  check("does not touch the real repository", () => {
    // The reason the sandbox exists. Asserted here so the guarantee is visible
    // in the file rather than only in a comment.
    const real = readFileSync(join(site, "src", "lib", "data.ts"), "utf8");
    assert.doesNotMatch(real, /Example Guard/);
  });

  cleanup();
}

// --------------------------------------- the judgement fields it must not fill

{
  const { calls, cleanup } = run();
  const body = prBody(calls);

  check("leaves kind, cost and roles as TODO", () => {
    assert.match(body, /kind: "TODO"/);
    assert.match(body, /cost: "TODO"/);
    assert.match(body, /roles: \["TODO"\]/);
  });

  check("leaves the use and skip lines as TODO", () => {
    assert.match(body, /useWhen: "TODO"/);
    assert.match(body, /skipWhen: "TODO"/);
  });

  check("marks the blurb as drafted rather than finished", () => {
    assert.match(body, /DRAFTED/);
  });

  check("blocks the merge while TODOs remain", () => {
    // The whole design in one assertion: a submission cannot publish itself.
    assert.match(body, /lattice:submission-status=blocked/);
  });

  check("carries the submitted prose as a proposal, not an answer", () => {
    assert.match(body, /proposed, unverified/);
    assert.match(body, /Untrusted input reaches the model\./);
  });

  check("fills only the facts the API confirmed", () => {
    assert.match(body, /license: "Apache-2\.0"/);
    assert.match(body, /language: "Python"/);
  });

  cleanup();
}

// ------------------------------------------------------------ incomplete form

{
  const { stdout, threw, calls, cleanup } = run({ body: blankField(ISSUE, "Skip it when") });

  check("refuses to draft from an incomplete submission", () => {
    assert.notEqual(threw, null, "exited cleanly on a form with an empty field");
  });

  check("does not open a PR", () => {
    assert.equal(pullCall(calls), undefined, "opened a PR from an incomplete form");
  });

  check("names the missing field rather than saying 'invalid'", () => {
    assert.match(stdout, /Skip it when/);
  });

  cleanup();
}

// ------------------------------------------------------------- unknown layer

{
  const { calls, cleanup } = run({ body: ISSUE.replace("07 Guardrails & Safety", "10 Databases") });

  check("still opens a PR when the layer does not resolve", () => {
    // Refusing here would lose a real submission over a mistyped option. The PR
    // goes up unresolved and blocked; a human picks the layer.
    assert.ok(pullCall(calls), "silently dropped a submission over its layer");
  });

  check("says the layer is unresolved instead of guessing", () => {
    assert.match(prBody(calls), /did not resolve/);
  });

  check("stays blocked", () => {
    assert.match(prBody(calls), /lattice:submission-status=blocked/);
  });

  cleanup();
}

// ---------------------------------------------------- unresolvable repository

{
  const { threw, calls, cleanup } = run({ repo: null });

  check("continues when the repository cannot be read", () => {
    assert.equal(threw, null, "a 404 on the repo aborted the whole draft");
  });

  check("still opens the PR", () => {
    assert.ok(pullCall(calls));
  });

  check("says the licence is unconfirmed rather than inventing one", () => {
    // Null is a real answer the dataset already renders honestly. A guessed
    // SPDX id is a confident lie about someone's architecture.
    assert.match(prBody(calls), /could not confirm/);
    assert.match(prBody(calls), /license: null/);
  });

  cleanup();
}

// ------------------------------------------------------- closed-source entry

{
  const { threw, calls, cleanup } = run({
    body: ISSUE.replace("https://github.com/example/guard", "none"),
  });

  check("handles a submission with no repository", () => {
    assert.equal(threw, null, "a 'none' repository aborted the draft");
  });

  check("does not guess a licence for it", () => {
    assert.match(prBody(calls), /license: null/);
  });

  check("still blocks the merge", () => {
    assert.match(prBody(calls), /lattice:submission-status=blocked/);
  });

  cleanup();
}

console.log(
  failures === 0
    ? "\nAll triage harness checks passed.\n"
    : `\n${failures} check(s) failed.\n`,
);
process.exit(failures === 0 ? 0 : 1);