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

export const selectShop = (data: AppData, id: string): Shop | undefined =>
  data.shops.find((s) => s.id === id);

export const selectBalance = (shop: Shop): number => balance(shop);

export const selectSettleBreakdown = (shop: Shop): SettleBreakdown => settleBreakdown(shop);

export const selectGroupedTransactions = (shop: Shop): DateGroup[] => groupByDate(shop);

export const selectSettlementRowInfo = (shop: Shop, tx: Transaction): SettlementRowInfo =>
  settlementRowInfo(shop, tx);

export const selectTransactionList = (shop: Shop): TransactionListGroup[] =>
  buildTransactionList(shop);
