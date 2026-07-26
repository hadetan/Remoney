// src/lib/ledger.ts
//
// All ledger logic. Every function is pure and operates over the transaction
// array — nothing is read from or written to storage here. Balances and
// breakdowns are ALWAYS derived; never stored.

import type { Shop, Transaction } from "./types";

/** Order: date ascending, then createdAt ascending. */
export function compareTx(a: Transaction, b: Transaction): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  return 0;
}

/** Returns a new array sorted chronologically (date asc, then createdAt asc). */
export function orderedTransactions(shop: Shop): Transaction[] {
  return [...shop.transactions].sort(compareTx);
}

/**
 * The single source of truth:
 *   balance = sum(SETTLEMENT.amount) - sum(DEBIT.amount)
 * Positive => credit (overpaid). Negative => owes. Always recomputed.
 */
export function balance(shop: Shop): number {
  let b = 0;
  for (const t of shop.transactions) {
    b += t.type === "SETTLEMENT" ? t.amount : -t.amount;
  }
  return b; // integer paise, signed
}

/** The SETTLEMENT transaction with the greatest (date, createdAt), or null. */
export function lastSettlement(shop: Shop): Transaction | null {
  let latest: Transaction | null = null;
  for (const t of shop.transactions) {
    if (t.type !== "SETTLEMENT") continue;
    if (latest === null || compareTx(t, latest) > 0) latest = t;
  }
  return latest;
}

/** Signed balance over all transactions chronologically up to and including `target`. */
export function balanceUpToIncluding(shop: Shop, target: Transaction): number {
  const ordered = orderedTransactions(shop);
  let b = 0;
  for (const t of ordered) {
    b += t.type === "SETTLEMENT" ? t.amount : -t.amount;
    if (t.id === target.id) break;
  }
  return b;
}

export interface SettleBreakdown {
  /** Overpayment the last settlement left, in paise (>= 0). Shown GREEN. */
  creditApplied: number;
  /** |B| + creditApplied, in paise. Shown RED. */
  grossOwed: number;
  /** |B|, in paise. The prefilled net amount to pay. */
  toPay: number;
}

/**
 * The settle-screen breakdown. Always reconciles to balance by construction:
 *   creditApplied = max(0, balance up to & including the last settlement)
 *   grossOwed     = |B| + creditApplied
 *   toPay         = |B|   (== grossOwed - creditApplied)
 * Expected to run on a negative balance (settle is only reachable when B < 0).
 */
export function settleBreakdown(shop: Shop): SettleBreakdown {
  const B = balance(shop);
  const last = lastSettlement(shop);

  const creditApplied =
    last === null ? 0 : Math.max(0, balanceUpToIncluding(shop, last));

  const toPay = Math.abs(B);
  const grossOwed = toPay + creditApplied;

  return { creditApplied, grossOwed, toPay };
}

export interface SettlementRowInfo {
  /** Amount paid in this settlement, paise. */
  paid: number;
  /** Resulting credit if the payment left a positive running balance, else null. */
  resultingCredit: number | null;
  /** Remaining owed if the payment was partial (running balance still negative), else null. */
  remainingOwed: number | null;
}

/**
 * What a SETTLEMENT row should display, based on the running balance immediately
 * after that payment:
 *   running > 0 (overpayment) -> resultingCredit
 *   running <= 0 (partial)    -> remainingOwed
 */
export function settlementRowInfo(shop: Shop, settlement: Transaction): SettlementRowInfo {
  const runningBal = balanceUpToIncluding(shop, settlement);
  if (runningBal > 0) {
    return { paid: settlement.amount, resultingCredit: runningBal, remainingOwed: null };
  }
  return { paid: settlement.amount, resultingCredit: null, remainingOwed: Math.abs(runningBal) };
}

export interface DateGroup {
  /** "YYYY-MM-DD" key. */
  date: string;
  /** Rows for this date, ordered by createdAt ascending. */
  transactions: Transaction[];
}

export interface TransactionListRow {
  tx: Transaction;
  settlementInfo: SettlementRowInfo | null;
}

export interface TransactionListGroup {
  /** "YYYY-MM-DD" key. */
  date: string;
  /** Rows for this date, ordered by createdAt ascending. */
  rows: TransactionListRow[];
}

/**
 * Group a shop's transactions by calendar date.
 * - Groups returned in DESCENDING date order (newest date first).
 * - Within each group, transactions ascending by createdAt.
 */
export function groupByDate(shop: Shop): DateGroup[] {
  const map = new Map<string, Transaction[]>();
  for (const t of shop.transactions) {
    const bucket = map.get(t.date);
    if (bucket) bucket.push(t);
    else map.set(t.date, [t]);
  }

  const groups: DateGroup[] = [];
  for (const [date, txs] of map) {
    txs.sort((a, b) =>
      a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0,
    );
    groups.push({ date, transactions: txs });
  }

  // Newest date first.
  groups.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return groups;
}

/**
 * Build the entire shop log for display in one ordered pass. This avoids
 * recalculating settlement row info for every rendered row.
 */
export function buildTransactionList(shop: Shop): TransactionListGroup[] {
  const ordered = orderedTransactions(shop);
  const groupsByDate = new Map<string, TransactionListRow[]>();
  let runningBalance = 0;

  for (const tx of ordered) {
    runningBalance += tx.type === "SETTLEMENT" ? tx.amount : -tx.amount;

    const settlementInfo =
      tx.type === "SETTLEMENT"
        ? {
            paid: tx.amount,
            resultingCredit: runningBalance > 0 ? runningBalance : null,
            remainingOwed: runningBalance > 0 ? null : Math.abs(runningBalance),
          }
        : null;

    const row: TransactionListRow = { tx, settlementInfo };
    const bucket = groupsByDate.get(tx.date);
    if (bucket) bucket.push(row);
    else groupsByDate.set(tx.date, [row]);
  }

  return [...groupsByDate.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([date, rows]) => ({ date, rows }));
}
