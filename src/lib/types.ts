// src/lib/types.ts

/** Discriminant for a ledger transaction. */
export type TransactionType = "DEBIT" | "SETTLEMENT";

/**
 * A single ledger event within a shop.
 * DEBIT      = a purchase on credit (increases what the user owes).
 * SETTLEMENT = a payment the user makes (decreases what the user owes).
 */
export interface Transaction {
  /** UUID v4, crypto.randomUUID(). */
  id: string;
  /** "DEBIT" | "SETTLEMENT". */
  type: TransactionType;
  /** Integer MINOR UNITS (paise). Strictly greater than 0. Never a float. */
  amount: number;
  /** The transaction's calendar date, "YYYY-MM-DD". */
  date: string;
  /** ISO 8601 creation timestamp. Used ONLY as a tiebreak for ordering within the same date. */
  createdAt: string;
}

/** A vendor/project the user owes money to. Holds an ordered list of transactions. */
export interface Shop {
  /** UUID v4, crypto.randomUUID(). */
  id: string;
  /** Display name (non-empty, trimmed). */
  name: string;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** Ordered list of ledger events. */
  transactions: Transaction[];
}

/** The entire persisted application document. */
export interface AppData {
  /** Storage format version. Currently 1. */
  schemaVersion: number;
  /** All shops. */
  shops: Shop[];
}
