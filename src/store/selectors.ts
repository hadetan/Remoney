// src/store/selectors.ts
import type { AppData, Shop } from "@/lib/types";
import {
  balance,
  buildTransactionList,
  settleBreakdown,
  groupByDate,
  settlementRowInfo,
  type SettleBreakdown,
  type DateGroup,
  type TransactionListGroup,
  type SettlementRowInfo,
} from "@/lib/ledger";
import type { Transaction } from "@/lib/types";

const balanceCache = new WeakMap<Shop, number>();
const transactionListCache = new WeakMap<Shop, TransactionListGroup[]>();

export const selectShop = (data: AppData, id: string): Shop | undefined =>
  data.shops.find((s) => s.id === id);

export const selectBalance = (shop: Shop): number => {
  const cached = balanceCache.get(shop);
  if (cached !== undefined) return cached;
  const next = balance(shop);
  balanceCache.set(shop, next);
  return next;
};

export const selectSettleBreakdown = (shop: Shop): SettleBreakdown => settleBreakdown(shop);

export const selectGroupedTransactions = (shop: Shop): DateGroup[] => groupByDate(shop);

export const selectSettlementRowInfo = (shop: Shop, tx: Transaction): SettlementRowInfo =>
  settlementRowInfo(shop, tx);

export const peekTransactionList = (shop: Shop): TransactionListGroup[] | null =>
  transactionListCache.get(shop) ?? null;

export const selectTransactionList = (shop: Shop): TransactionListGroup[] => {
  const cached = transactionListCache.get(shop);
  if (cached !== undefined) return cached;
  const next = buildTransactionList(shop);
  transactionListCache.set(shop, next);
  return next;
};

export function primeShopDerivedData(shop: Shop): void {
  selectBalance(shop);
  selectTransactionList(shop);
}
