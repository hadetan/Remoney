"use client";

import {
  createContext,
  useEffect,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from "react";
import type { AppData, Shop, Transaction } from "@/lib/types";
import { EMPTY_APP_DATA, SCHEMA_VERSION } from "@/lib/constants";
import { loadAppDataAsync, saveAppData } from "@/lib/storage";
import { mergeImport, type ExportDocument } from "@/lib/importExport";

export interface AppDataState {
  /** The live document. */
  data: AppData;
  /** Hydration guard; false until localStorage has been read on the client. */
  mounted: boolean;
}

export type Action =
  | { kind: "HYDRATE"; data: AppData }
  | { kind: "ADD_SHOP"; shop: Shop }
  | { kind: "RENAME_SHOP"; shopId: string; name: string }
  | { kind: "DELETE_SHOP"; shopId: string }
  | { kind: "ADD_TX"; shopId: string; tx: Transaction }
  | { kind: "EDIT_TX"; shopId: string; txId: string; amount: number; date: string }
  | { kind: "DELETE_TX"; shopId: string; txId: string }
  | { kind: "IMPORT"; doc: ExportDocument }
  | { kind: "RESET" };

function mapShops(data: AppData, shopId: string, fn: (s: Shop) => Shop): AppData {
  return { ...data, shops: data.shops.map((s) => (s.id === shopId ? fn(s) : s)) };
}

export function reducer(state: AppDataState, action: Action): AppDataState {
  switch (action.kind) {
    case "HYDRATE":
      return { data: action.data, mounted: true };
    case "ADD_SHOP":
      return { ...state, data: { ...state.data, shops: [...state.data.shops, action.shop] } };
    case "RENAME_SHOP":
      return {
        ...state,
        data: mapShops(state.data, action.shopId, (s) => ({ ...s, name: action.name })),
      };
    case "DELETE_SHOP":
      return {
        ...state,
        data: { ...state.data, shops: state.data.shops.filter((s) => s.id !== action.shopId) },
      };
    case "ADD_TX":
      return {
        ...state,
        data: mapShops(state.data, action.shopId, (s) => ({
          ...s,
          transactions: [...s.transactions, action.tx],
        })),
      };
    case "EDIT_TX":
      return {
        ...state,
        data: mapShops(state.data, action.shopId, (s) => ({
          ...s,
          transactions: s.transactions.map((t) =>
            t.id === action.txId ? { ...t, amount: action.amount, date: action.date } : t,
          ),
        })),
      };
    case "DELETE_TX":
      return {
        ...state,
        data: mapShops(state.data, action.shopId, (s) => ({
          ...s,
          transactions: s.transactions.filter((t) => t.id !== action.txId),
        })),
      };
    case "IMPORT":
      return { ...state, data: mergeImport(state.data, action.doc) };
    case "RESET":
      return { ...state, data: { schemaVersion: SCHEMA_VERSION, shops: [] } };
    default:
      return state;
  }
}

export const AppDataContext = createContext<{
  state: AppDataState;
  dispatch: Dispatch<Action>;
} | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { data: EMPTY_APP_DATA, mounted: false });
  const hydratedOnceRef = useRef(false);
  const persistHydratedSnapshotRef = useRef(false);

  // Hydrate from localStorage on the client, after first paint.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const loaded = await loadAppDataAsync();
      if (cancelled) return;
      persistHydratedSnapshotRef.current = loaded.needsSave;
      dispatch({ kind: "HYDRATE", data: loaded.data });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Persist after hydration. The guard prevents the pre-hydration empty state
  // from clobbering existing stored data.
  useEffect(() => {
    if (!state.mounted) return;
    if (!hydratedOnceRef.current) {
      hydratedOnceRef.current = true;
      if (!persistHydratedSnapshotRef.current) return;
      persistHydratedSnapshotRef.current = false;
    }
    saveAppData(state.data);
  }, [state.data, state.mounted]);

  return <AppDataContext.Provider value={{ state, dispatch }}>{children}</AppDataContext.Provider>;
}
