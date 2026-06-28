import { describe, it, expect } from "vitest";
import { rupeesToPaise, paiseToRupees, parseAmountToPaise, formatMoney } from "./money";

describe("rupeesToPaise / paiseToRupees", () => {
  it("round-trips whole and fractional rupees", () => {
    expect(rupeesToPaise(1500)).toBe(150000);
    expect(rupeesToPaise(1500.5)).toBe(150050);
    expect(paiseToRupees(150050)).toBe(1500.5);
  });

  it("neutralizes float noise via Math.round", () => {
    // 0.1 + 0.2 === 0.30000000000000004 in IEEE-754
    expect(rupeesToPaise(0.1 + 0.2)).toBe(30);
  });
});

describe("parseAmountToPaise", () => {
  it("accepts valid amounts (with grouping)", () => {
    expect(parseAmountToPaise("1500")).toBe(150000);
    expect(parseAmountToPaise("1500.5")).toBe(150050);
    expect(parseAmountToPaise("1,500.50")).toBe(150050);
  });

  it("rejects invalid / non-positive / over-precision input", () => {
    expect(parseAmountToPaise("")).toBeNull();
    expect(parseAmountToPaise("-5")).toBeNull();
    expect(parseAmountToPaise("0")).toBeNull();
    expect(parseAmountToPaise("1.234")).toBeNull();
    expect(parseAmountToPaise("abc")).toBeNull();
  });
});

describe("formatMoney", () => {
  it("formats with rupee glyph, 2 decimals, standard grouping", () => {
    expect(formatMoney(0)).toBe("₹0.00");
    expect(formatMoney(150000)).toBe("₹1,500.00");
    expect(formatMoney(100000000)).toBe("₹1,000,000.00");
  });

  it("formats the magnitude (no minus sign) for negatives", () => {
    expect(formatMoney(-150000)).toBe("₹1,500.00");
  });
});
