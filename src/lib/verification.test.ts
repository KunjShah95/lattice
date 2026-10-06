import { describe, expect, it } from "vitest";
import { allTools, AS_OF_PATTERN, STALE_AFTER_MONTHS, staleCutoff, toolCount } from "./data";
import { AS_OF, attributes } from "./attributes";
import { buildVerificationReport } from "./verification";

/**
 * The verification report is the public receipt for the build's staleness
 * guard. If it ever disagrees with the guard, it is worse than not publishing
 * one, so these tests pin the two to the same cutoff.
 */

const BUILD = new Date(Date.UTC(2026, 9, 3)); // 2026-10-03

describe("staleCutoff", () => {
  it("is the first of the month, six months back", () => {
    expect(STALE_AFTER_MONTHS).toBe(6);
    expect(staleCutoff(BUILD).toISOString().slice(0, 10)).toBe("2026-04-01");
  });

  it("crosses a year boundary", () => {
    expect(staleCutoff(new Date(Date.UTC(2027, 1, 15))).toISOString().slice(0, 7)).toBe("2026-08");
  });
});

describe("buildVerificationReport", () => {
  const report = buildVerificationReport(BUILD);

  it("passes for the shipped dataset — otherwise the build would have thrown", () => {
    expect(report.status).toBe("pass");
    expect(report.stale).toEqual([]);
  });

  it("covers every tool exactly once", () => {
    expect(report.toolCount).toBe(toolCount);
    expect(report.entries).toHaveLength(allTools.length);
    const keys = report.entries.map((e) => e.path);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("states the rule it enforces", () => {
    expect(report.rule.staleAfterMonths).toBe(STALE_AFTER_MONTHS);
    expect(report.rule.cutoff).toBe("2026-04");
    expect(report.rule.enforcement).toMatch(/fails/i);
  });

  it("dates itself", () => {
    expect(report.generatedAt).toBe("2026-10-03");
  });

  it("links every entry to its canonical page", () => {
    for (const e of report.entries) {
      expect(e.path, e.name).toMatch(/^\/[a-z0-9-]+\/[a-z0-9-]+$/);
    }
  });

  it("gives each entry the month its facts expire", () => {
    const vllm = report.entries.find((e) => e.name === "vLLM");
    expect(vllm?.asOf).toMatch(/^\d{4}-\d{2}$/);
    // A 2026-09 check expires when the cutoff passes it: builds from 2027-04.
    if (vllm?.asOf === "2026-09") expect(vllm.expires).toBe("2027-04");
  });

  it("reports the earliest expiry as the next forced re-check", () => {
    const earliest = [...report.entries].sort((a, b) => a.expires.localeCompare(b.expires))[0];
    expect(report.nextRecheckBy).toBe(earliest.expires);
  });

  it("fails, and names the entries, once the cutoff overtakes them", () => {
    const late = buildVerificationReport(new Date(Date.UTC(2031, 0, 1)));
    expect(late.status).toBe("fail");
    expect(late.stale.length).toBe(allTools.length);
  });
});

describe("per-tool asOf", () => {
  /**
   * The receipt publishes an `asOf` and an expiry *per entry*, which only says
   * anything if entries can actually carry different dates. With a single global
   * `AS_OF` all 112 rows share one value and the per-entry column is decorative.
   *
   * So this suite pins the mechanism, not the data: it asserts that the two
   * cases are distinguishable in the report, and that every override is a real
   * month and no older than the sweep it overrides. Whether any tool currently
   * sets one is a content decision, not a correctness one.
   */
  const report = buildVerificationReport(BUILD);

  it("distinguishes an inherited date from a per-tool one", () => {
    for (const e of report.entries) {
      expect(typeof e.perTool, e.name).toBe("boolean");
    }
    // The count has to agree with the flags, or the summary line lies.
    expect(report.perToolChecked).toBe(report.entries.filter((e) => e.perTool).length);
    expect(report.perToolChecked).toBeLessThanOrEqual(report.entries.length);
  });

  it("agrees with the attributes file about which entries have an override", () => {
    for (const e of report.entries) {
      expect(e.perTool, e.name).toBe(Boolean(attributes[e.name]?.asOf));
    }
  });

  it("states the sweep an entry without its own date inherits", () => {
    expect(report.datasetAsOf).toBe(AS_OF);
    expect(AS_OF_PATTERN.test(report.datasetAsOf)).toBe(true);
  });

  it("carries a real month on every entry, override or inherited", () => {
    for (const t of allTools) {
      expect(t.asOf, t.name).toMatch(AS_OF_PATTERN);
    }
  });

  it("never dates an override earlier than the sweep it overrides", () => {
    // An override exists to record a *later*, more specific check. One set to an
    // earlier month would shorten the entry's window while looking like a
    // deliberate correction, which is the opposite of what the field is for.
    for (const [name, attr] of Object.entries(attributes)) {
      if (!attr.asOf) continue;
      // `YYYY-MM` sorts correctly as a string — fixed width, zero-padded month —
      // so this is a plain comparison rather than a Date round trip.
      expect(attr.asOf < AS_OF, `${name}: ${attr.asOf} predates ${AS_OF}`).toBe(false);
    }
  });

  it("gives an override a later expiry than the sweep", () => {
    const overrides = Object.entries(attributes).filter(([, a]) => a.asOf);
    for (const [name, attr] of overrides) {
      if (!attr.asOf) continue;
      const entry = report.entries.find((e) => e.name === name);
      const inherited = report.entries.find(
        (e) => e.asOf === AS_OF && e.name !== name,
      );
      expect(entry?.asOf).toBe(attr.asOf);
      if (inherited) expect(entry!.expires >= inherited.expires).toBe(true);
    }
  });
});
