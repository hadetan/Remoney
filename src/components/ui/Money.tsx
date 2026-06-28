"use client";

import { formatMoney } from "@/lib/money";

/** Plain amount (magnitude only, no Cr/Dr), e.g. "₹2,000.00". */
export function Money({ paise, className = "" }: { paise: number; className?: string }) {
  return <span className={className}>{formatMoney(paise)}</span>;
}

/**
 * Read-side money boundary for a signed balance:
 *   B >= 0 -> green "Cr ₹{B}"   (zero is credit)
 *   B <  0 -> red   "Dr ₹{|B|}"
 */
export function Balance({ paise, className = "" }: { paise: number; className?: string }) {
  const credit = paise >= 0;
  return (
    <span
      className={`font-semibold tabular-nums ${
        credit ? "text-emerald-600" : "text-red-600"
      } ${className}`}
    >
      {credit ? "Cr" : "Dr"} {formatMoney(paise)}
    </span>
  );
}
