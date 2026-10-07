import { describe, expect, it } from "vitest";
import { allTools, STALE_AFTER_MONTHS, staleCutoff } from "./data";
import { buildVerificationReport } from "./verification";
import { describeFreshness, expiryMonth, freshnessOf, meterCells } from "./freshness";

/**
 * `freshness.ts` re-states the build guard as a meter, so the one thing worth
 * pinning is that it never disagrees with the guard: an entry the build would
 * refuse must never read as healthy, and the expiry shown must be the month the
 * build really starts refusing.
 */

const at = (y: number, m: number, d = 3) => new Date(Date.UTC(y, m - 1, d));

describe("expiryMonth", () => {
  it("is the check month plus the window plus one", () => {
    expect(expiryMonth("2026-09", 6)).toBe("2027-04");
    expect(expiryMonth("2026-04", 6)).toBe("2026-11");
  });

  it("crosses a year boundary in both directions of the calendar", () => {
    expect(expiryMonth("2026-12", 6)).toBe("2027-07");
    expect(expiryMonth("2026-05", 7)).toBe("2027-01");
  });

  it("agrees with the published receipt for every shipped entry", () => {
    const report = buildVerificationReport(at(2026, 10));
    for (const e of report.entries) {
      expect(expiryMonth(e.asOf, STALE_AFTER_MONTHS), e.name).toBe(e.expires);
    }
  });

  it("rejects anything that is not YYYY-MM", () => {
    expect(() => expiryMonth("2026-13", 6)).toThrow();
    expect(() => expiryMonth("2026-9", 6)).toThrow();
    expect(() => expiryMonth("sept", 6)).toThrow();
  });
});

describe("freshnessOf", () => {
  it("counts whole months between the check and the build", () => {
    expect(freshnessOf("2026-09", at(2026, 9), 6).ageMonths).toBe(0);
    expect(freshnessOf("2026-09", at(2026, 10), 6).ageMonths).toBe(1);
    expect(freshnessOf("2026-09", at(2027, 3), 6).ageMonths).toBe(6);
  });

  it("walks fresh, aging, due, expired as the clock moves", () => {
    const states = [9, 10, 11, 12].map((m) => freshnessOf("2026-09", at(2026, m), 6).state);
    // age 0, 1, 2, 3 of 6
    expect(states).toEqual(["fresh", "fresh", "fresh", "aging"]);
    expect(freshnessOf("2026-09", at(2027, 1), 6).state).toBe("aging"); // 4 of 6
    expect(freshnessOf("2026-09", at(2027, 2), 6).state).toBe("due"); // 5 of 6: one month spare
    expect(freshnessOf("2026-09", at(2027, 3), 6).state).toBe("due"); // 6 of 6: last good month
    expect(freshnessOf("2026-09", at(2027, 4), 6).state).toBe("expired");
  });

  it("reports zero months left in the last month the build accepts", () => {
    const f = freshnessOf("2026-09", at(2027, 3), 6);
    expect(f.remainingMonths).toBe(0);
    expect(f.used).toBe(1);
  });

  it("clamps the used share to the window", () => {
    expect(freshnessOf("2026-09", at(2031, 1), 6).used).toBe(1);
    // A check dated after the build (clock skew, a future-dated override) must
    // not draw a negative bar.
    expect(freshnessOf("2026-12", at(2026, 9), 6).used).toBe(0);
  });

  /**
   * The load-bearing property. For every shipped entry on a sweep of build dates,
   * the meter says `expired` exactly when `staleCutoff` would make `data.ts`
   * throw. A mismatch in either direction is a lie on a page whose argument is
   * that it does not tell them.
   */
  it("calls an entry expired exactly when the build guard would throw", () => {
    const disagreements: string[] = [];
    for (let y = 2026; y <= 2028; y += 1) {
      for (let m = 1; m <= 12; m += 1) {
        const now = at(y, m);
        const cutoff = staleCutoff(now);
        for (const t of allTools) {
          const guardRefuses = new Date(`${t.asOf}-01`) < cutoff;
          const meterExpired =
            freshnessOf(t.asOf, now, STALE_AFTER_MONTHS).state === "expired";
          if (guardRefuses !== meterExpired) {
            disagreements.push(`${t.name} ${t.asOf} @ ${y}-${m}`);
          }
        }
      }
    }
    expect(disagreements).toEqual([]);
  });

  it("matches the guard's expiry: the first refusing month is `expires`", () => {
    for (const t of allTools.slice(0, 20)) {
      const f = freshnessOf(t.asOf, at(2026, 10), STALE_AFTER_MONTHS);
      const [y, m] = f.expires.split("-").map(Number);
      expect(freshnessOf(t.asOf, at(y, m), STALE_AFTER_MONTHS).state, t.name).toBe("expired");
      const prev = at(m === 1 ? y - 1 : y, m === 1 ? 12 : m - 1);
      expect(freshnessOf(t.asOf, prev, STALE_AFTER_MONTHS).state, t.name).not.toBe("expired");
    }
  });
});

describe("meterCells", () => {
  it("has one cell per month the guard accepts: the window plus the current month", () => {
    expect(meterCells(freshnessOf("2026-09", at(2026, 9), 6)).total).toBe(7);
  });

  it("is full when just checked, one cell in the last accepted month, none once expired", () => {
    expect(meterCells(freshnessOf("2026-09", at(2026, 9), 6)).filled).toBe(7);
    expect(meterCells(freshnessOf("2026-09", at(2027, 3), 6)).filled).toBe(1);
    expect(meterCells(freshnessOf("2026-09", at(2027, 4), 6)).filled).toBe(0);
  });

  it("never reads empty while the guard still accepts the entry", () => {
    for (let age = 0; age <= 6; age += 1) {
      const now = new Date(Date.UTC(2026, 8 + age, 3));
      const f = freshnessOf("2026-09", now, 6);
      expect(f.state, `age ${age}`).not.toBe("expired");
      expect(meterCells(f).filled, `age ${age}`).toBeGreaterThan(0);
    }
  });

  it("clamps a future-dated check to a full meter", () => {
    expect(meterCells(freshnessOf("2026-12", at(2026, 9), 6)).filled).toBe(7);
  });
});

describe("describeFreshness", () => {
  it("names the expiry month so the sentence is checkable", () => {
    const f = freshnessOf("2026-09", at(2026, 10), 6);
    expect(describeFreshness(f)).toContain("2027-04");
    expect(describeFreshness(f)).toMatch(/1 month ago/);
  });

  it("is blunt about the last accepted month and about expiry", () => {
    expect(describeFreshness(freshnessOf("2026-09", at(2027, 3), 6))).toMatch(/Last month/);
    expect(describeFreshness(freshnessOf("2026-09", at(2027, 4), 6))).toMatch(/refuse/);
  });
});
