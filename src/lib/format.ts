// src/lib/format.ts

const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

/** "2026-04-15" -> "15 apr, 2026" (day no leading zero, lowercase 3-letter month). */
export function formatDateHeading(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}, ${y}`;
}

/** Today's local calendar date as "YYYY-MM-DD". Used for date inputs (max) and settlements. */
export function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Current instant as an ISO 8601 timestamp. Used for createdAt tiebreak ordering. */
export function nowIso(): string {
  return new Date().toISOString();
}
