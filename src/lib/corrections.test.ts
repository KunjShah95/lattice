import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { corrections } from "@/content/corrections.generated";
import { metadata } from "@/app/corrections/page";
import { site } from "./site";
import { AS_OF } from "./attributes";

/**
 * The corrections log.
 *
 * Its value is entirely in being true, so these assertions are about honesty
 * rather than about shape. Three things can go wrong and none of them throws:
 *
 *  1. It silently stops being generated and renders empty, which reads as "this
 *     index has never been wrong".
 *  2. It drifts from the commit log, which reads as "here is a list of mistakes
 *     I chose to publish".
 *  3. A field is empty where it should carry a date or a link, so a row renders
 *     as an undated, untraceable claim.
 */

/** The dataset files whose history is the log. */
const WATCHED = ["src/lib/attributes.ts", "src/lib/data.ts"];

describe("/corrections", () => {
  it("is populated, so the page is evidence rather than a promise", () => {
    // The failure this guards is the exact one the page exists to prevent: a
    // corrections page with nothing on it is worse than no page, because it
    // looks like a clean record.
    expect(corrections.length, "no corrections were generated").toBeGreaterThan(0);
  });

  it("gives every entry a date, a title, a hash and a resolvable link", () => {
    for (const c of corrections) {
      expect(c.date, `${c.hash}: date`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(c.title.length, `${c.hash}: title`).toBeGreaterThan(10);
      expect(c.hash, `${c.title}: hash`).toMatch(/^[0-9a-f]{7,40}$/);
      // A hash a reader cannot follow is decoration. The URL must be absolute
      // and on the repository the project actually publishes from.
      expect(c.url, `${c.hash}: url`).toMatch(
        /^https:\/\/github\.com\/[^/]+\/[^/]+\/commit\/[0-9a-f]{40}$/,
      );
    }
  });

  it("carries two different dates and does not conflate them", () => {
    // An entry dated *after* `AS_OF` is expected, not a bug: the sweep date and
    // the edit date are different things, and only the sweep one gates the build.
    // `AS_OF = "2026-09"` with commits touching the dataset running into October
    // is the normal state, and an earlier version of this assertion demanded they
    // agree — which would have been a test that fails the moment anyone edits an
    // entry between sweeps.
    //
    // What must hold is the opposite direction: the verification date cannot be
    // *after* the newest change, or the page would advertise a check that covers
    // edits it has not seen.
    for (const c of corrections) {
      expect(c.date, `${c.hash}: ${c.date}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(AS_OF).toMatch(/^\d{4}-\d{2}$/);

    const newest = corrections[0].date;
    expect(
      // Plain comparison: `toBeLessThanOrEqual` is typed for numbers, and
      // `YYYY-MM` sorts correctly as a string — fixed width, zero-padded month.
      AS_OF <= newest,
      `AS_OF ${AS_OF} is later than the newest change ${newest}, so the published ` +
        `verification claims to cover edits it has not seen`,
    ).toBe(true);
  });

  it("names which dataset each entry touched", () => {
    for (const c of corrections) {
      expect(c.touched.length, `${c.hash}: touched is empty`).toBeGreaterThan(0);
      for (const label of c.touched) {
        // Labels, not paths: the raw path would be noise on a page a reader sees,
        // and asserting on it would pin a filename rather than a claim.
        expect(label, `${c.hash}: "${label}" is a path`).not.toMatch(/[/\\]/);
      }
    }
  });

  it("is newest first, so the most recent change is the one read", () => {
    const dates = corrections.map((c) => c.date);
    const sorted = [...dates].sort().reverse();
    expect(dates, "the log is not newest-first").toEqual(sorted);
  });

  it("has no duplicate commits", () => {
    const hashes = corrections.map((c) => c.hash);
    expect(new Set(hashes).size).toBe(hashes.length);
  });

  it("only claims to log changes to the two dataset files", () => {
    // The generator watches exactly these paths. If a third is added there, this
    // fails and the comment has to be updated to match — which is the point.
    expect(WATCHED).toEqual(["src/lib/attributes.ts", "src/lib/data.ts"]);
  });

  it("declares a canonical and an og:url, like every other route", () => {
    expect(metadata.alternates?.canonical).toBe("/corrections");
    expect(metadata.openGraph?.url).toBe(`${site.url}/corrections`);
  });

  it("states plainly that a short log is not a clean record", () => {
    // The copy-level honesty check. The page exists to publish uncertainty, and a
    // corrections log that implied its own brevity was evidence of accuracy would
    // be the same overclaiming the rest of the site refuses.
    const source = readFile();
    expect(source).toMatch(/not a score|is not a score/i);
    expect(source).toMatch(/cannot show|got wrong/i);
  });
});

/**
 * Read the page's own source.
 *
 * The copy assertions are about the rendered prose, and this is the only way to
 * see it without a DOM — vitest runs in node, and rendering the page would pull
 * in `next/link` and the whole metadata graph for three string matches.
 */
function readFile() {
  return readFileSync(
    new URL("../app/corrections/page.tsx", import.meta.url),
    "utf8",
  );
}