import { describe, it, expect } from "vitest";
import {
  validateAmount,
  validateDateNotFuture,
  validateShopName,
  isValidAppData,
} from "./validation";

describe("validateAmount", () => {
  it("accepts > 0 and returns paise", () => {
    const r = validateAmount("1500.50");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(150050);
  });

  it("rejects 0, negatives, and junk", () => {
    expect(validateAmount("0").ok).toBe(false);
    expect(validateAmount("-1").ok).toBe(false);
    expect(validateAmount("abc").ok).toBe(false);
  });
});

describe("validateDateNotFuture", () => {
  it("accepts today and past", () => {
    expect(validateDateNotFuture("2026-06-28", "2026-06-28").ok).toBe(true);
    expect(validateDateNotFuture("2026-01-01", "2026-06-28").ok).toBe(true);
  });

  it("rejects future dates", () => {
    expect(validateDateNotFuture("2026-06-29", "2026-06-28").ok).toBe(false);
  });
});

describe("validateShopName", () => {
  it("trims and requires non-empty", () => {
    const r = validateShopName("  Sharma  ");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("Sharma");
    expect(validateShopName("   ").ok).toBe(false);
  });
});

describe("isValidAppData", () => {
  it("accepts a well-formed document", () => {
    expect(
      isValidAppData({
        schemaVersion: 1,
        shops: [
          {
            id: "s1",
            name: "A",
            createdAt: "2026-04-01T00:00:00.000Z",
            transactions: [
              { id: "t1", type: "DEBIT", amount: 100, date: "2026-04-15", createdAt: "x" },
            ],
          },
        ],
      }),
    ).toBe(true);
  });

  it("rejects malformed documents", () => {
    expect(isValidAppData(null)).toBe(false);
    expect(isValidAppData({ shops: [] })).toBe(false);
    expect(isValidAppData({ schemaVersion: 1, shops: "no" })).toBe(false);
    expect(
      isValidAppData({
        schemaVersion: 1,
        shops: [{ id: "s1", name: "A", createdAt: "x", transactions: [{ id: "t1", type: "BAD", amount: 1, date: "d", createdAt: "x" }] }],
      }),
    ).toBe(false);
  });
});
