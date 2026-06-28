// src/lib/money.ts
import { CURRENCY } from "./constants";

/**
 * Money is stored as INTEGER PAISE (1 rupee = 100 paise). Floats are banned for
 * storage and arithmetic; they appear only at the UI edge (parse on input,
 * format on output). This makes all summation exact and order-independent.
 */

/** Convert a rupee value (possibly with up to 2 decimals) into integer paise. */
export function rupeesToPaise(rupees: number): number {
  // Round to the nearest paisa to neutralize float input noise.
  return Math.round(rupees * 100);
}

/** Convert integer paise into a rupee number (for formatting only). */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/**
 * Parse a user-entered amount string ("1500", "1500.5", "1,500.50") into integer paise.
 * Returns null when the input is not a valid positive amount.
 * - Strips grouping separators.
 * - Rejects more than 2 decimal places, NaN, <= 0.
 */
export function parseAmountToPaise(input: string): number | null {
  const cleaned = input.replace(/,/g, "").trim();
  if (cleaned === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  return rupeesToPaise(value);
}

/**
 * Format integer paise as a currency string:
 *   - Indian rupee glyph "₹"
 *   - exactly 2 decimal places
 *   - standard thousands grouping (1,500.00 / 1,000,000.00)
 *
 * Examples:
 *   formatMoney(150000)    === "₹1,500.00"
 *   formatMoney(0)         === "₹0.00"
 *   formatMoney(100000000) === "₹1,000,000.00"
 *
 * Formats the MAGNITUDE only — never emits a minus sign. The Cr/Dr semantics
 * and color are decided by the display layer (see Money/Balance components).
 */
export function formatMoney(paise: number): string {
  const rupees = paiseToRupees(Math.abs(paise));
  const grouped = rupees.toLocaleString(CURRENCY.locale, {
    minimumFractionDigits: CURRENCY.fractionDigits,
    maximumFractionDigits: CURRENCY.fractionDigits,
  });
  return `${CURRENCY.glyph}${grouped}`;
}
