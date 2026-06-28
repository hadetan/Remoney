// src/lib/validation.ts
import type { AppData, Shop, Transaction, TransactionType } from "./types";
import { parseAmountToPaise } from "./money";

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

/** Amount must parse to integer paise > 0. */
export function validateAmount(input: string): Result<number> {
  const paise = parseAmountToPaise(input);
  if (paise === null) return { ok: false, error: "Enter a valid amount greater than 0." };
  return { ok: true, value: paise };
}

/** Date must not be in the future (lexicographic compare works for YYYY-MM-DD). */
export function validateDateNotFuture(isoDate: string, todayIso: string): Result<string> {
  if (isoDate > todayIso) return { ok: false, error: "Date cannot be in the future." };
  return { ok: true, value: isoDate };
}

/** Shop name required, non-empty after trim. */
export function validateShopName(name: string): Result<string> {
  const trimmed = name.trim();
  if (trimmed === "") return { ok: false, error: "Shop name is required." };
  return { ok: true, value: trimmed };
}

const TX_TYPES: TransactionType[] = ["DEBIT", "SETTLEMENT"];

function isValidTransaction(value: unknown): value is Transaction {
  if (typeof value !== "object" || value === null) return false;
  const t = value as Record<string, unknown>;
  if (typeof t.id !== "string") return false;
  if (typeof t.type !== "string" || !TX_TYPES.includes(t.type as TransactionType)) return false;
  if (typeof t.amount !== "number" || !Number.isFinite(t.amount) || t.amount <= 0) return false;
  if (typeof t.date !== "string") return false;
  if (typeof t.createdAt !== "string") return false;
  return true;
}

export function isValidShop(value: unknown): value is Shop {
  if (typeof value !== "object" || value === null) return false;
  const s = value as Record<string, unknown>;
  if (typeof s.id !== "string") return false;
  if (typeof s.name !== "string") return false;
  if (typeof s.createdAt !== "string") return false;
  if (!Array.isArray(s.transactions)) return false;
  return s.transactions.every(isValidTransaction);
}

/** Structural schema check used by import. */
export function isValidAppData(value: unknown): value is AppData {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.schemaVersion !== "number") return false;
  if (!Array.isArray(v.shops)) return false;
  return v.shops.every(isValidShop);
}
