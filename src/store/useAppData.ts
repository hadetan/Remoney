"use client";

import { useContext, useMemo } from "react";
import { AppDataContext } from "./AppDataProvider";
import type { ExportDocument } from "@/lib/importExport";
import { uuid } from "@/lib/id";
import { nowIso, todayIso } from "@/lib/format";

/**
 * Access the live AppData plus all mutation actions. Action creators build
 * impure values (uuid, timestamps) here, keeping the reducer pure.
 */
export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  const { state, dispatch } = ctx;

  const actions = useMemo(
    () => ({
      addShop: (name: string) =>
        dispatch({
          kind: "ADD_SHOP",
          shop: { id: uuid(), name: name.trim(), createdAt: nowIso(), transactions: [] },
        }),
      renameShop: (shopId: string, name: string) =>
        dispatch({ kind: "RENAME_SHOP", shopId, name: name.trim() }),
      deleteShop: (shopId: string) => dispatch({ kind: "DELETE_SHOP", shopId }),

      addEntry: (shopId: string, amount: number, date: string) =>
        dispatch({
          kind: "ADD_TX",
          shopId,
          tx: { id: uuid(), type: "DEBIT", amount, date, createdAt: nowIso() },
        }),
      editEntry: (shopId: string, txId: string, amount: number, date: string) =>
        dispatch({ kind: "EDIT_TX", shopId, txId, amount, date }),
      deleteEntry: (shopId: string, txId: string) =>
        dispatch({ kind: "DELETE_TX", shopId, txId }),

      addSettlement: (shopId: string, amount: number) =>
        dispatch({
          kind: "ADD_TX",
          shopId,
          tx: { id: uuid(), type: "SETTLEMENT", amount, date: todayIso(), createdAt: nowIso() },
        }),
      editSettlement: (shopId: string, txId: string, amount: number, date: string) =>
        dispatch({ kind: "EDIT_TX", shopId, txId, amount, date }),
      deleteSettlement: (shopId: string, txId: string) =>
        dispatch({ kind: "DELETE_TX", shopId, txId }),

      importData: (doc: ExportDocument) => dispatch({ kind: "IMPORT", doc }),
      reset: () => dispatch({ kind: "RESET" }),
    }),
    [dispatch],
  );

  return { data: state.data, mounted: state.mounted, ...actions };
}
