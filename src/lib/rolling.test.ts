import { describe, expect, it } from "vitest";
import { formatRolling, rollingColumns } from "./rolling";

describe("formatRolling", () => {
  it("groups thousands", () => {
    expect(formatRolling(0)).toBe("0");
    expect(formatRolling(999)).toBe("999");
    expect(formatRolling(1000)).toBe("1,000");
    expect(formatRolling(1234567)).toBe("1,234,567");
  });

  it("rounds, and reads bad input as zero rather than NaN or a minus sign", () => {
    expect(formatRolling(12.6)).toBe("13");
    expect(formatRolling(NaN)).toBe("0");
    expect(formatRolling(Infinity)).toBe("0");
    expect(formatRolling(-40)).toBe("0");
  });
});

describe("rollingColumns", () => {
  it("makes a digit column per digit and a still column per separator", () => {
    const cols = rollingColumns(1234);
    expect(cols.map((c) => (c.kind === "digit" ? String(c.digit) : c.char))).toEqual([
      "1",
      ",",
      "2",
      "3",
      "4",
    ]);
  });

  it("keys columns from the ones place, so adding a digit adds a column on the left only", () => {
    const before = rollingColumns(999).map((c) => c.key);
    const after = rollingColumns(9999).map((c) => c.key);
    // 999 -> 9,999 gains a leading digit and a separator; the existing three keep their keys.
    for (const k of before) expect(after).toContain(k);
    expect(after.length).toBe(before.length + 2);
  });

  it("gives every column a unique key", () => {
    for (const n of [0, 7, 100, 1000, 12345, 1234567890]) {
      const keys = rollingColumns(n).map((c) => c.key);
      expect(new Set(keys).size, String(n)).toBe(keys.length);
    }
  });

  it("keeps the units column stable as the number grows", () => {
    const units = (n: number) => rollingColumns(n).find((c) => c.key === "c0");
    expect(units(5)).toMatchObject({ kind: "digit", digit: 5 });
    expect(units(12345)).toMatchObject({ kind: "digit", digit: 5 });
  });
});
