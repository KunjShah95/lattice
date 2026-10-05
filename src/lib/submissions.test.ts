import { describe, expect, it } from "vitest";
import {
  draftEntry,
  factsFromRepo,
  hostOf,
  isMergeable,
  isPlausibleUrl,
  LAYERS,
  parseSubmission,
  repoSlug,
  resolveLayer,
} from "./submissions.mjs";

/**
 * The intake format.
 *
 * Two things are worth guarding here, and they pull in opposite directions.
 *
 * The parser has to be forgiving, because a human edited the body and the bot
 * still has to find the answers. It also has to be strict, because a field it
 * silently misses reads to the maintainer exactly like a field nobody filled
 * in. The failure mode is therefore asymmetric on purpose: a formatting
 * variation is tolerated, a missing value is reported rather than defaulted.
 *
 * The second thing is the fact/judgement split. If the bot starts filling in
 * `cost` or picking the layer, these tests are what should fail — because that
 * change turns the pipeline into the vote-count directory the site argues
 * against.
 */

/**
 * Parse and assert a submission is complete.
 *
 * Narrowing here rather than at each call site, because a test that drafts from
 * a half-filled form is testing the wrong thing — the failure would show up as a
 * confusing assertion about `TODO` strings rather than as "the fixture is
 * incomplete".
 */
function parsed(over: Record<string, string> = {}) {
  const result = parseSubmission(filled(over));
  if (!result?.ok) {
    throw new Error(`fixture did not parse: ${result?.missing.join(", ")}`);
  }
  return result;
}

const filled = (over: Record<string, string> = {}) => {
  const fields: Record<string, string> = {
    "Tool name": "Example",
    Homepage: "https://example.com",
    Repository: "none",
    "Which layer do you think it belongs in?": "07 Guardrails & Safety",
    "One sentence: why it belongs on this index at all": "It classifies prompt injection.",
    "Use it when": "Untrusted input reaches the model.",
    "Skip it when": "You need request-level rate limiting instead.",
    "Anything the reviewer should know": "",
    ...over,
  };
  return Object.entries(fields)
    .map(([h, v]) => `### ${h}\n\n\`\`\`\n${v}\n\`\`\`\n`)
    .join("\n");
};

describe("parseSubmission", () => {
  it("reads a fully filled body", () => {
    const result = parseSubmission(filled());
    expect(result?.ok).toBe(true);
    expect(result?.values.name).toBe("Example");
    expect(result?.values.proposedLayer).toBe("07 Guardrails & Safety");
    expect(result?.values.useWhen).toBe("Untrusted input reaches the model.");
  });

  it("treats notes as optional, and null rather than empty string", () => {
    const result = parseSubmission(filled());
    expect(result?.ok).toBe(true);
    expect(result?.values.notes).toBeNull();
  });

  it("keeps a filled notes field", () => {
    const result = parseSubmission(
      filled({ "Anything the reviewer should know": "Pricing changes monthly." }),
    );
    expect(result?.values.notes).toBe("Pricing changes monthly.");
  });

  it("normalises a 'none' repository to null", () => {
    // "none" and an empty field are the same answer, and treating them
    // differently would send the bot looking for a repository named "none".
    expect(parseSubmission(filled())?.values.repository).toBeNull();
    expect(
      parseSubmission(filled({ Repository: "  NONE  " }))?.values.repository,
    ).toBeNull();
  });

  it("keeps a real repository URL", () => {
    const result = parseSubmission(
      filled({ Repository: "https://github.com/example/example" }),
    );
    expect(result?.values.repository).toBe("https://github.com/example/example");
  });

  it("reports every missing field at once, not one per round trip", () => {
    // Reporting one at a time costs seven comment round trips per submission.
    const body = filled({ "Use it when": "", "Skip it when": "" });
    const result = parseSubmission(body);
    expect(result?.ok).toBe(false);
    expect(result?.missing).toHaveLength(2);
    expect(result?.missing.join(" ")).toContain("Use it when");
    expect(result?.missing.join(" ")).toContain("Skip it when");
  });

  it("reports a missing field even when it is surrounded by filled ones", () => {
    // The failure this catches: a parser that stops at the first blank value and
    // returns the rest as empty, so the bot drafts an entry from half a form.
    const result = parseSubmission(filled({ "Skip it when": "" }));
    expect(result?.ok).toBe(false);
    expect(result?.missing).toEqual(["Skip it when"]);
  });

  it("rejects an empty body", () => {
    expect(parseSubmission("")).toBeNull();
    expect(parseSubmission("   \n ")).toBeNull();
    expect(parseSubmission(undefined as unknown as string)).toBeNull();
  });

  it("tolerates a reworded heading, because people edit them", () => {
    // A submitter who retitles a field should still be heard. Matching on
    // meaning rather than on the literal heading string is what makes that safe.
    // Rewording, not paraphrasing: these share the content word "use" with the
  // canonical heading, which is what the matcher keys on.
  for (const reworded of [
      "### When to use it",
      "### Use this when",
      "### Use it, in practice",
    ]) {
      const body = filled().replace("### Use it when", reworded);
      const result = parseSubmission(body);
      expect(result?.ok, reworded).toBe(true);
      expect(result?.values.useWhen, reworded).toBe(
        "Untrusted input reaches the model.",
      );
    }
  });

  it("reports a field whose heading shares no word with the template", () => {
  // The limit of the fuzzy pass, stated so it is a decision rather than a
  // surprise. "Situation to reach for this" has nothing in common with "Use it
  // when" once filler is removed, so the field reads empty and the submitter is
  // asked again. That is the correct failure: a wrong value costs a reviewer a
  // careful look, a bounced field costs one comment.
  const body = filled().replace("### Use it when", "### Situation to reach for this");
  const result = parseSubmission(body);
  expect(result?.ok).toBe(false);
  expect(result?.missing).toContain("Use it when");
});

it("does not read a field out of the wrong section", () => {
    // Every field's value is the same string here. If the parser mis-anchored,
    // every field would come back filled and the submission would look complete.
    const same = "identical";
    const body = filled({
      "Tool name": same,
      Homepage: "https://example.com",
      "One sentence: why it belongs on this index at all": same,
      "Use it when": same,
      "Skip it when": same,
    });
    const result = parseSubmission(body);
    expect(result?.values.useWhen).toBe(same);
    expect(result?.values.skipWhen).toBe(same);
  });

  it("rejects a homepage that is not a URL", () => {
    // The most common submission error, and invisible in a review diff.
    const result = parseSubmission(filled({ Homepage: "example.com" }));
    expect(result?.ok).toBe(false);
    expect(result?.missing.join(" ")).toContain("Homepage");
  });

  it("does not accept a non-http scheme", () => {
    expect(isPlausibleUrl("javascript:alert(1)")).toBe(false);
    expect(isPlausibleUrl("file:///etc/passwd")).toBe(false);
  });
});

describe("isPlausibleUrl", () => {
  it("accepts http and https with a host", () => {
    expect(isPlausibleUrl("https://example.com")).toBe(true);
    expect(isPlausibleUrl("http://example.com")).toBe(true);
    // Loose on purpose: these all resolve, and rejecting them bounces a
    // submission for something the submitter cannot see.
    expect(isPlausibleUrl("https://www.example.com/")).toBe(true);
    expect(isPlausibleUrl("https://github.com/owner/repo")).toBe(true);
  });

  it("rejects anything else", () => {
    for (const bad of ["", "example.com", "not a url", "https://", "//example.com"]) {
      expect(isPlausibleUrl(bad), bad).toBe(false);
    }
  });
});

describe("hostOf", () => {
  it("strips www and lowercases, for the duplicate check", () => {
    expect(hostOf("https://WWW.Example.com/path")).toBe("example.com");
    expect(hostOf("https://github.com/owner/repo")).toBe("github.com");
    expect(hostOf("nonsense")).toBeNull();
  });
});

describe("repoSlug", () => {
  it("extracts owner/repo from a GitHub URL", () => {
    expect(repoSlug("https://github.com/owner/repo")).toBe("owner/repo");
    expect(repoSlug("https://github.com/owner/repo/")).toBe("owner/repo");
    expect(repoSlug("https://github.com/owner/repo.git")).toBe("owner/repo");
  });

  it("returns null for anything that is not a GitHub repo", () => {
    expect(repoSlug("https://gitlab.com/owner/repo")).toBeNull();
    expect(repoSlug("https://example.com")).toBeNull();
    expect(repoSlug("https://github.com/owner")).toBeNull();
  });
});

describe("resolveLayer", () => {
  it("resolves by index, slug, title and normalised title", () => {
    // Submitters type all four. Rejecting the ones that do not match would
    // bounce an answer that is unambiguous to a person.
    expect(resolveLayer("07")?.slug).toBe("guardrails-safety");
    expect(resolveLayer("guardrails-safety")?.slug).toBe("guardrails-safety");
    expect(resolveLayer("Guardrails & Safety")?.slug).toBe("guardrails-safety");
    expect(resolveLayer("04 fine-tuning")?.slug).toBe("fine-tuning");
  });

  it("returns null rather than guessing", () => {
    // A wrong layer is worse than an unresolved one: it produces a plausible
    // assignment in a PR that a reviewer is skimming.
    expect(resolveLayer("10 Databases")).toBeNull();
    expect(resolveLayer("")).toBeNull();
  });

  it("covers exactly the nine layers the dataset ships", () => {
    expect(LAYERS).toHaveLength(9);
    expect(new Set(LAYERS.map((l) => l.slug)).size).toBe(9);
  });
});

describe("factsFromRepo", () => {
  const api = {
    license: { spdx_id: "Apache-2.0" },
    language: "Python",
    has_releases: true,
    stargazers_count: 4200,
    owner: { type: "Organization" },
  };

  it("reads licence and language from the API, not from the README", () => {
    const facts = factsFromRepo(api, { pushedAt: "2026-09-01" });
    expect(facts.license).toBe("Apache-2.0");
    expect(facts.language).toBe("Python");
  });

  it("returns null for an unconfirmed licence rather than a guess", () => {
    // Null is a real answer here: the dataset already renders it honestly, and
    // the build refuses a tool with no licence *unless* it is reading material.
    // A fabricated SPDX id is a confident lie about someone's architecture.
    const facts = factsFromRepo({ ...api, license: null });
    expect(facts.license).toBeNull();
  });

  it("records archived status so a reviewer is warned", () => {
    expect(factsFromRepo(api, { archived: true }).archived).toBe(true);
    expect(factsFromRepo(api, { archived: false }).archived).toBe(false);
  });

  it("returns all-null facts for a closed-source project", () => {
    const facts = factsFromRepo(null);
    expect(facts.license).toBeNull();
    expect(facts.language).toBeNull();
    expect(facts.deployment).toBeNull();
  });

  it("records stars without letting them decide anything", () => {
    // Present so a reviewer can sanity-check scale. The README has no stars
    // column on purpose, and a queue sorted by popularity is the same mistake.
    expect(factsFromRepo(api).stars).toBe(4200);
  });
});

describe("draftEntry", () => {
  const submission = parsed();
  const facts = factsFromRepo({
    license: { spdx_id: "Apache-2.0" },
    language: "Python",
    has_releases: true,
    stargazers_count: 100,
    owner: { type: "Organization" },
  });

  const draft = () =>
    draftEntry(submission, facts, { slug: "example", existingNames: [] });

  it("records the submitter's use and skip lines as proposals, not answers", () => {
    // Quoted, and labelled unverified, so the reviewer can tell evidence from
    // the index's own claim.
    expect(draft().judge).toContain("Untrusted input reaches the model.");
    expect(draft().judge).toContain("proposed, unverified");
  });

  it("leaves cost, roles and kind for a human", () => {
    // This is the assertion that protects the thesis. If someone makes the bot
    // fill these, this test fails and the change has to argue for itself.
    const { attrBlock } = draft();
    expect(attrBlock).toContain('cost: "TODO"');
    expect(attrBlock).toContain('roles: ["TODO"]');
    expect(attrBlock).toContain('kind: "TODO"');
    expect(draft().judge).toContain("Whether this is infrastructure at all");
  });

  it("does mark the blurb as drafted rather than finished", () => {
    expect(draft().dataBlock).toContain("DRAFTED");
  });

  it("fills the facts it can actually confirm", () => {
    const { attrBlock } = draft();
    expect(attrBlock).toContain('license: "Apache-2.0"');
    expect(attrBlock).toContain('language: "Python"');
  });

  it("carries the submitted layer through when it resolves", () => {
    expect(draft().section).toBe("guardrails-safety");
  });

  it("is never ready while a TODO remains", () => {
    // The regression this pins: `ready` was computed from the layer and the
    // duplicate check alone, so a PR full of TODO fields came out ready and the
    // merge gate passed it. A bot draft is never mergeable; only a reviewer's
    // edit can make it so.
    expect(draft().ready).toBe(false);
    expect(draft().attrBlock).toContain("TODO");
  });

  it("becomes mergeable once a reviewer fills every TODO in", () => {
    // The positive case, so the gate is not merely always-fail: editing the
    // branch is enough, with no other ceremony. This is the reviewer's edit,
    // not a second run of the bot.
    //
    // Every TODO is replaced by pattern rather than by exact string, because a
    // hardcoded replacement that stops matching fails *open*: the block keeps its
    // TODO, the assertion fails for the wrong reason, and the tempting fix is to
    // loosen the assertion instead of the replacement.
    const filled = draft();
    const completed = {
      section: filled.section,
      duplicates: filled.duplicates,
      dataBlock: filled.dataBlock.replace(/TODO:[^"]*/, "Classifier for prompt injection."),
      attrBlock: filled.attrBlock
        .replace(/kind: "[^"]*"/, 'kind: "service"')
        .replace(/deployment: "[^"]*"/, 'deployment: "managed"')
        .replace(/cost: "[^"]*"/, 'cost: "subscription"')
        .replace(/roles: \[[^\]]*\]/, 'roles: ["production"]')
        .replace(/useWhen: "[^"]*"/, 'useWhen: "Untrusted input reaches the model."')
        .replace(/skipWhen: "[^"]*"/, 'skipWhen: "You need rate limiting instead."'),
    };
    // Assert the premise, so a no-op replacement fails here with a legible
    // message rather than three assertions later.
    expect(completed.dataBlock).not.toContain("TODO");
    expect(completed.attrBlock).not.toContain("TODO");
    expect(isMergeable(completed)).toBe(true);

    // One TODO left is enough to hold it, which is the whole point.
    expect(isMergeable({ ...completed, attrBlock: `${completed.attrBlock}\n// TODO` })).toBe(false);
  });

  it("is not ready when the layer does not resolve", () => {
    const unresolved = parsed({
      "Which layer do you think it belongs in?": "10 Databases",
    });
    const d = draftEntry(unresolved, facts, { slug: "x", existingNames: [] });
    expect(d.section).toBeNull();
    expect(d.ready).toBe(false);
    // And it says so, rather than shipping a guess.
    expect(d.judge).toContain("did not resolve");
  });

  it("is not ready when the tool already exists", () => {
    const d = draftEntry(submission, facts, {
      slug: "example",
      existingNames: ["Example", "Something Else"],
    });
    expect(d.duplicates).toEqual(["Example"]);
    expect(d.ready).toBe(false);
  });

  it("emits blocks that are valid TypeScript object syntax", () => {
    // A PR whose snippet cannot paste in is a PR that gets rewritten by hand,
    // which defeats the point. Asserted by shape rather than by parsing,
    // because this module is plain .mjs and cannot import the TS toolchain.
    const { dataBlock, attrBlock } = draft();
    expect(dataBlock).toContain('t("Example", "example.com",');
    expect(attrBlock).toContain('"Example": {');
    expect(attrBlock.trimEnd().endsWith("},")).toBe(true);
  });
});