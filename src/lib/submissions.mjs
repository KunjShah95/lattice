/**
 * Submissions: the intake format, and the draft a submission becomes.
 *
 * ## Why this is a module and not a form handler
 *
 * Two consumers have to agree on the format exactly. The `/submit` page builds
 * an issue body a human is about to fill in, and the triage workflow parses one
 * back out again. If those two are written separately they drift, and the
 * failure is silent in the worst way: the form emits a field the parser does not
 * read, submissions arrive looking complete, and every one of them has to be
 * triaged by hand anyway.
 *
 * So the format is defined once, here, and both sides read it from here.
 *
 * ## The rule that shapes everything below
 *
 * The bot fills the fields that are **facts** and refuses to fill the ones that
 * are **judgements**.
 *
 * Facts come from the GitHub API and are checkable by anyone: the licence is
 * whatever the repository reports, the language is whatever GitHub infers, a
 * repo that was archived in 2023 is archived. A bot that writes those fields is
 * doing arithmetic, and a human reviewing the diff is checking its work rather
 * than redoing it.
 *
 * Judgements are the layer a tool belongs to, whether it is infrastructure at
 * all, and the use-when/skip-when pair. Those are the argument the site is
 * making. A bot that infers them produces a plausible layer assignment nobody
 * checked, which is precisely the failure mode `methodology` section 01 claims
 * this index does not have. So the draft marks them and the merge is refused
 * until a human has answered them.
 *
 * The submitter's prose is carried into the draft as a **proposal**, not as an
 * answer. Someone who has actually run the thing is the best source for when to
 * skip it, and discarding that to preserve a fiction about who writes the copy
 * would be silly. But it is marked as theirs so the reviewer knows which lines
 * are evidence and which are the index's claim.
 */

/** GitHub coordinates, from package.json rather than restated here. */
export const REPO = "KunjShah95/lattice";

/**
 * The label a workflow watches for.
 *
 * Label-gated rather than triggered on every issue because the repo also has
 * bugs, and a bug report is not a tool submission no matter how it is worded.
 */
export const SUBMISSION_LABEL = "submission";

/**
 * The issue body a submitter fills in.
 *
 * Fenced code blocks rather than loose prose, because the parser must be able to
 * tell a field boundary from a sentence boundary. A submitter who writes
 * "we use it for the routing layer" without a delimiter would otherwise have
 * their answer silently dropped, and the failure looks identical to them
 * submitting nothing.
 *
 * Every field carries its own instruction, including the length guidance and a
 * worked example, because the only place these instructions exist is here.
 */
export const ISSUE_TEMPLATE = `<!--
  Lattice submission. Everything below is read by a bot that drafts a pull
  request — you will not see the pull request yourself, a human reviews it.

  Edit the values between the fences. Keep the fence markers and the field
  names exactly as they are; if you change a field name, that field arrives
  empty.

  Nothing here is published as-is. A human decides whether the tool is
  infrastructure, which layer it belongs to, and whether the use/skip lines
  survive review.
-->

### Tool name

\`\`\`
The product name, as it writes its own name.
\`\`\`

### Homepage

\`\`\`
https://
\`\`\`

### Repository

\`\`\`
https://github.com/owner/repo

Leave as "none" if the project is closed source.
\`\`\`

### Which layer do you think it belongs in?

\`\`\`
01 Inference & Serving
02 Routing & Gateways
03 Retrieval & Vector Stores
04 Fine-tuning & Training
05 Agent Frameworks
06 Workflow Orchestration
07 Guardrails & Safety
08 Prompt Engineering
09 Evaluation & Observability
\`\`\`

### One sentence: why it belongs on this index at all

\`\`\`
Not "it's a great tool" — what does a production system *run on* because of it?
\`\`\`

### Use it when

\`\`\`
One clause. The situation in which this is the right choice.
\`\`\`

### Skip it when

\`\`\`
One clause. The situation in which it is the wrong choice.

This is the harder one, and the more useful one. An entry with a skip line is
one a reader can act on; an entry without one is a link.
\`\`\`

### Anything the reviewer should know

\`\`\`
Pricing that changes often, a licence that is unusual, a deployment that is
self-hosted in name only — whatever is not obvious from the links above.
\`\`\`
`;

/** Fields parsed out of an issue body, in the order the form asks for them. */
const FIELDS = [
  { key: "name", heading: "Tool name" },
  { key: "homepage", heading: "Homepage" },
  { key: "repository", heading: "Repository" },
  { key: "proposedLayer", heading: "Which layer do you think it belongs in?" },
  { key: "why", heading: "One sentence: why it belongs on this index at all" },
  { key: "useWhen", heading: "Use it when" },
  { key: "skipWhen", heading: "Skip it when" },
  { key: "notes", heading: "Anything the reviewer should know" },
];

/** The nine layers, as the form presents them. Kept in sync by test. */
export const LAYERS = [
  { index: "01", slug: "inference-serving", title: "Inference & Serving" },
  { index: "02", slug: "routing-gateways", title: "Routing & Gateways" },
  { index: "03", slug: "retrieval-vector-stores", title: "Retrieval & Vector Stores" },
  { index: "04", slug: "fine-tuning", title: "Fine-tuning & Training" },
  { index: "05", slug: "agent-frameworks", title: "Agent Frameworks" },
  { index: "06", slug: "workflow-orchestration", title: "Workflow Orchestration" },
  { index: "07", slug: "guardrails-safety", title: "Guardrails & Safety" },
  { index: "08", slug: "prompt-engineering", title: "Prompt Engineering" },
  { index: "09", slug: "evaluation-observability", title: "Evaluation & Observability" },
];

/**
 * Pull the fenced values out of an issue body.
 *
 * Returns `null` rather than a partial record when a field is missing, because
 * a partial submission and an empty one are the same thing operationally: both
 * need to go back to the submitter. The caller reports every missing field at
 * once, so the round trip costs one comment rather than seven.
 *
 * Tolerant of the headings being reworded, because people edit them. The match
 * is on the first few words of each heading rather than the whole string.
 */
export function parseSubmission(body) {
  if (typeof body !== "string" || body.trim() === "") return null;

  const sections = readSections(body);
  const values = {};
  const missing = [];

  for (const { key, heading } of FIELDS) {
    const value = readField(sections, heading);
    values[key] = value;
    // `notes` is genuinely optional. Everything else is the submission.
    if (key !== "notes" && value === "") missing.push(heading);
  }

  if (missing.length) return { ok: false, missing, values };

  // A hostname is the one thing worth validating before the bot spends an API
  // call on it, because a mistyped URL is the most common submission error and
  // it is invisible in a review diff.
  if (!isPlausibleUrl(values.homepage)) {
    return {
      ok: false,
      missing: ["Homepage (must be a full URL, e.g. https://example.com)"],
      values,
    };
  }

  const repository =
    values.repository && !/^none$/i.test(values.repository.trim())
      ? values.repository.trim()
      : null;

  return {
    ok: true,
    missing: [],
    values: { ...values, repository, notes: values.notes || null },
  };
}

/**
 * Every `### Heading` + fenced block in the body, in document order.
 *
 * Collected in one pass rather than matched field by field, because matching
 * eight fields against eight literal headings is exactly the design that breaks
 * the moment a submitter edits a heading: the field then reads as empty, the
 * submission is reported incomplete, and the bot bounces something the person
 * filled in. Collecting first means the fields can be matched by *meaning*
 * instead, which is tolerant of rewording without being tolerant of order.
 */
function readSections(body) {
  const sections = [];
  const pattern = /^###[ \t]+(.+?)[ \t]*\r?\n+```[^\n]*\r?\n([\s\S]*?)\r?\n?```/gm;
  for (const match of body.matchAll(pattern)) {
    sections.push({ heading: match[1].trim(), value: match[2].trim() });
  }
  return sections;
}

/** Content words a heading is *about`, with the filler removed. */
const STOP_WORDS = new Set([
  "a", "an", "and", "any", "are", "as", "at", "be", "but", "by", "do", "does",
  "for", "from", "has", "have", "i", "if", "in", "into", "is", "it", "its", "of",
  "on", "one", "or", "other", "should", "so", "that", "the", "their", "them",
  "then", "there", "they", "this", "to", "was", "what", "when", "where", "which",
  "who", "why", "will", "with", "you", "your",
]);

/** Lowercase, de-punctuated content words. */
function contentWords(text) {
  return String(text)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

/**
 * The value for a field, found by matching headings on meaning.
 *
 * Three passes, cheapest first:
 *
 *   1. exact heading, case- and whitespace-insensitive — the common case
 *   2. contains every content word of the canonical heading
 *   3. shares a content word with it
 *
 * The third pass is loose enough to catch a badly reworded heading, so each
 * field records the heading it actually matched. Two fields landing on the same
 * heading is reported as a missing field rather than silently duplicating one
 * answer into both: a wrong value in a PR is worse than an absent one.
 */
function readField(sections, heading) {
  const wanted = contentWords(heading);
  if (!wanted.length) return "";

  const exact = sections.find(
    (s) => normaliseHeading(s.heading) === normaliseHeading(heading),
  );
  if (exact) return exact.value;

  const byAllWords = sections.find((s) => {
    const words = contentWords(s.heading);
    return wanted.every((w) => words.includes(w));
  });
  if (byAllWords) return byAllWords.value;

  const byOverlap = sections.find((s) =>
    contentWords(s.heading).some((w) => wanted.includes(w)),
  );
  return byOverlap?.value ?? "";
}

function normaliseHeading(heading) {
  return heading.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * A submission's homepage is usable if it parses as an http(s) URL with a host.
 *
 * Deliberately loose about the rest: a trailing slash, a path, or a
 * `www.` prefix all still resolve, and rejecting them would bounce submissions
 * for reasons a submitter cannot see.
 */
export function isPlausibleUrl(value) {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && !!url.hostname;
  } catch {
    return false;
  }
}

/** The bare host of a URL, or null. Used for the duplicate check. */
export function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/** The `owner/repo` of a GitHub URL, or null for anything else. */
export function repoSlug(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "github.com") return null;
    const [owner, repo] = parsed.pathname.replace(/^\/+|\/+$/g, "").split("/");
    if (!owner || !repo) return null;
    return `${owner}/${repo.replace(/\.git$/, "")}`;
  } catch {
    return null;
  }
}

/**
 * The display name of a section, from its index, slug or title.
 *
 * Submitters paste the option straight out of the form, so the value arrives as
 * `"07 Guardrails & Safety"` — index, space, title — and also as the bare title,
 * the bare slug, or the title with a stray number typed first. All of those are
 * unambiguous to a person, so all of them resolve. Anything else is null, and
 * null means unresolved rather than best-guess: a wrong layer produces a
 * plausible assignment sitting in a pull request somebody is skimming.
 */
export function resolveLayer(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();

  // The bare ordinal is checked before normalisation, because normalising "07"
  // strips the digits and leaves nothing to compare.
  const byIndex = LAYERS.find((l) => l.index === trimmed);
  if (byIndex) return byIndex;

  const needle = normaliseLayer(value);
  if (!needle) return null;

  return (
    LAYERS.find(
      (l) =>
        l.slug.toLowerCase() === needle ||
        normaliseLayer(l.title) === needle ||
        // An abbreviated title. "04 fine-tuning" is what a submitter types
        // when they copy the ordinal across and shorten the rest; the words they
        // kept still identify the section unambiguously, because no other layer
        // contains "fine tuning".
        (() => {
          const words = normaliseLayer(l.title).split(" ");
          return needle.split(" ").every((w) => words.includes(w));
        })(),
    ) ?? null
  );
}

/**
 * Reduce a layer reference to comparable words.
 *
 * Drops a leading ordinal and everything that is not alphanumeric, so "07
 * Guardrails & Safety", "guardrails-safety", "Guardrails and Safety" and
 * "07. guardrails and safety" all reduce to the same string.
 */
function normaliseLayer(value) {
  return String(value)
    .toLowerCase()
    .replace(/^\s*\d{1,2}\s*[.):-]?\s*/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * What the bot knows about a project, from the GitHub API.
 *
 * Every field is nullable and null means "could not confirm", never a guess.
 * That distinction is the whole reason this is a separate type from a filled
 * draft: `license: null` is a legitimate answer that the build already accepts
 * and renders honestly, whereas a fabricated SPDX id is a confident lie that
 * happens to be wrong about someone's architecture.
 */
export function factsFromRepo(repo, { archived = false, pushedAt = null } = {}) {
  if (!repo) {
    return {
      license: null,
      language: null,
      deployment: null,
      kind: null,
      archived,
      pushedAt,
      stars: null,
      isOrg: null,
      hasReleases: null,
    };
  }

  // Deployment is the one classification the API answers. A public repository
  // with releases is something you can run yourself, whatever the vendor's
  // marketing says about its cloud — and "whatever the marketing says" is
  // exactly why it is derived rather than copied from the README.
  const selfHosted = repo.has_releases === true || repo.releases_url ? true : null;

  return {
    license: repo.license?.spdx_id ?? null,
    language: repo.language ?? null,
    deployment: selfHosted,
    kind: null,
    archived,
    pushedAt,
    // Recorded so a reviewer can sanity-check the project's scale, never
    // rendered: the README deliberately has no stars column and a submission
    // queue sorted by popularity would be the same mistake at a smaller scale.
    stars: repo.stargazers_count ?? null,
    isOrg: repo.owner?.type === "Organization",
    hasReleases: repo.has_releases ?? null,
  };
}

/**
 * The pull request a submission turns into.
 *
 * Two code blocks rather than a unified diff, because a reviewer needs to read
 * what the tool will say, not what line moved. A diff hides the prose inside
 * `+` prefixes; these blocks are the entry as it will appear in the source,
 * side by side with the reasoning for what the bot filled in and what it
 * refused to fill in.
 */
export function draftEntry(submission, facts, { slug, existingNames = [] } = {}) {
  const layer = resolveLayer(submission.values.proposedLayer);
  const submittedName = submission.values.name.trim();

  const judge = [
    `**Assigned to:** \`${layer ? `${layer.index} ${layer.title}` : "— unresolved —"}\``,
    layer
      ? ""
      : "> The proposed layer did not resolve to one of the nine. Pick one before merging, or close this with a note on why the tool does not belong on the index.",
    "",
    "**Filled from the GitHub API** (facts — verify, do not rewrite):",
    `- Licence: ${facts.license ? `\`${facts.license}\`` : "*could not confirm*"}`,
    `- Language: ${facts.language ? `\`${facts.language}\`` : "*could not confirm*"}`,
    `- Self-hostable: ${facts.deployment === true ? "yes, public releases" : facts.deployment === false ? "no public releases" : "*could not confirm*"}`,
    facts.archived ? "- **This repository is archived.** Confirm it still works before merging." : "",
    "",
    "**Left for a human, deliberately:**",
    "- Whether this is infrastructure at all. `methodology` §01 is the bar, and the bot cannot apply it.",
    "- The layer assignment above.",
    "- `cost`. Pricing pages rot and a stale price is worse than none.",
    "- `roles`. Nobody is accountable for a tool nobody owns.",
    "- Whether the submitted use/skip lines survive review. They are the submitter's claim, quoted below, not the index's.",
    "",
    "**Submitted use/skip — proposed, unverified:**",
    `> use: ${submission.values.useWhen}`,
    `> skip: ${submission.values.skipWhen}`,
    submission.values.notes ? `> notes: ${submission.values.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const dataBlock = [
    `// ${"─".repeat(70)}`,
    `// ${submittedName}`,
    `// Submitted: https://github.com/${REPO}/issues (via /submit)`,
    `// Blurb below is DRAFTED, not written. Rewrite it to what this thing is`,
    `// in one sentence — a blurb is not a tagline and not a feature list.`,
    `t(${JSON.stringify(submittedName)}, ${JSON.stringify(hostOf(submission.values.homepage))}, ${JSON.stringify(`TODO: one-sentence definition of ${submittedName}.`)}),`,
  ].join("\n");

  const attrBlock = [
    `  ${JSON.stringify(submittedName)}: {`,
    `    kind: "TODO", deployment: "TODO", license: ${facts.license ? JSON.stringify(facts.license) : "null"}, language: ${facts.language ? JSON.stringify(facts.language) : "null"}, cost: "TODO",`,
    `    roles: ["TODO"],`,
    `    useWhen: "TODO",`,
    `    skipWhen: "TODO",`,
    `  },`,
  ].join("\n");

  const duplicates = existingNames.filter(
    (n) => n.toLowerCase() === submittedName.toLowerCase(),
  );

  return {
    slug,
    name: submittedName,
    section: layer?.slug ?? null,
    dataBlock,
    attrBlock,
    judge,
    duplicates,
    /**
     * Whether this draft could be merged as it stands.
     *
     * Always false for a fresh draft, and that is the point — see
     * `isMergeable`. Exposed as a field so the PR body can carry the marker
     * without recomputing, and derived from the same predicate the gate uses so
     * the two cannot disagree.
     */
    ready: isMergeable({ section: layer?.slug ?? null, duplicates, dataBlock, attrBlock }),
  };
}

/**
 * The merge rule, in one place.
 *
 * A draft is mergeable when it names a section, is not a duplicate, and contains
 * no `TODO` anywhere in the entry it proposes. The TODO test is on the *blocks*,
 * not the submission, because that is what a reviewer edits on the branch — and
 * it is what makes the gate a check rather than a claim: a reviewer who fills the
 * fields in satisfies this without doing anything else.
 *
 * Exported so the workflow's grep and this function state the same rule. Two
 * copies of a merge policy drift, and the drift shows up as an unreviewed entry
 * on the live site.
 */
export function isMergeable({ section, duplicates, dataBlock, attrBlock }) {
  return Boolean(section) && duplicates.length === 0 && !`${dataBlock}${attrBlock}`.includes("TODO");
}

/**
 * The markers the merge gate reads.
 *
 * `blocked` is what the bot writes, always, because a draft always has fields a
 * person has to fill in. `draft` is what a reviewer writes after filling them in
 * — which is confusingly named, so the gate accepts neither as "ready": it
 * requires an explicit `ready`, and anything else fails. A missing or garbled
 * marker must fail closed, or the gate is bypassed by a typo.
 */
export const PR_TITLE_PREFIX = "[submission]";

/** The branch a submission's PR is opened from. */
export function branchFor(slug) {
  return `submission/${slug}`;
}

/**
 * The file mode a pull request needs in order to be refused at the gate.
 *
 * The PR body carries a machine-readable marker instead of a CODEOWNERS-style
 * rule, because the gate has to work for a repo with one maintainer and no
 * branch protection: `required_reviews` cannot be relied on, so the refusal is
 * enforced by a check that reads the PR body. A `TODO` in the source is visible
 * in the diff; a policy setting is not.
 */
export const NOT_READY_MARKER = "lattice:submission-status=blocked";
export const READY_MARKER = "lattice:submission-status=ready";