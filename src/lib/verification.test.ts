import { describe, expect, it } from "vitest";
import { allTools, STALE_AFTER_MONTHS, staleCutoff, toolCount } from "./data";
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
