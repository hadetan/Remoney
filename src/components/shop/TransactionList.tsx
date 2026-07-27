"use client";

import { useEffect, useMemo, useState } from "react";
import { Receipt } from "lucide-react";
import { DateGroup } from "./DateGroup";
import { ShopTransactionListLoading } from "@/components/ui/LoadingScene";
import { peekTransactionList, selectTransactionList } from "@/store/selectors";
import type { TransactionListGroup } from "@/lib/ledger";
import type { Shop, Transaction } from "@/lib/types";

interface Props {
  shop: Shop;
  onEdit: (tx: Transaction) => void;
}

const INITIAL_VISIBLE_ROWS = 60;
const VISIBLE_ROWS_PER_FRAME = 120;

function countRows(groups: TransactionListGroup[]): number {
  return groups.reduce((total, group) => total + group.rows.length, 0);
}

function sliceGroups(groups: TransactionListGroup[], maxRows: number): TransactionListGroup[] {
  if (maxRows <= 0) return [];

  const visible: TransactionListGroup[] = [];
  let remaining = maxRows;

  for (const group of groups) {
    if (remaining <= 0) break;
    if (group.rows.length <= remaining) {
      visible.push(group);
      remaining -= group.rows.length;
      continue;
    }
    visible.push({ ...group, rows: group.rows.slice(0, remaining) });
    break;
  }

  return visible;
}

/** Renders the date-grouped log (newest date first); empty-shop placeholder. */
export function TransactionList({ shop, onEdit }: Props) {
  const [groups, setGroups] = useState<TransactionListGroup[] | null>(() =>
    peekTransactionList(shop),
  );
  const [visibleRows, setVisibleRows] = useState(INITIAL_VISIBLE_ROWS);

  useEffect(() => {
    const cached = peekTransactionList(shop);
    if (cached !== null) {
      setGroups(cached);
      return;
    }

    setGroups(null);
    let cancelled = false;
    let raf: number | null = null;
    let timer: number | null = null;

    raf = window.requestAnimationFrame(() => {
      timer = window.setTimeout(() => {
        if (cancelled) return;
        setGroups(selectTransactionList(shop));
      }, 0);
    });

    return () => {
      cancelled = true;
      if (raf !== null) window.cancelAnimationFrame(raf);
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [shop]);

  const totalRows = useMemo(() => (groups === null ? 0 : countRows(groups)), [groups]);
  const visibleGroups = useMemo(
    () => (groups === null ? [] : sliceGroups(groups, visibleRows)),
    [groups, visibleRows],
  );

  useEffect(() => {
    if (groups === null) return;

    setVisibleRows(Math.min(totalRows, INITIAL_VISIBLE_ROWS));
    if (totalRows <= INITIAL_VISIBLE_ROWS) return;

    let cancelled = false;
    let raf: number | null = null;

    const pump = () => {
      raf = window.requestAnimationFrame(() => {
        if (cancelled) return;
        setVisibleRows((current) => {
          const next = Math.min(totalRows, current + VISIBLE_ROWS_PER_FRAME);
          if (next < totalRows) pump();
          return next;
        });
      });
    };

    pump();

    return () => {
      cancelled = true;
      if (raf !== null) window.cancelAnimationFrame(raf);
    };
  }, [groups, totalRows]);

  if (groups === null) {
    return <ShopTransactionListLoading />;
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-24 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
          <Receipt size={28} />
        </span>
        <p className="text-base font-medium text-zinc-700">No entries yet</p>
        <p className="text-sm text-zinc-500">Tap the + button to add your first entry.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-28">
      {visibleGroups.map((group) => (
        <DateGroup key={group.date} group={group} onEdit={onEdit} />
      ))}
      {visibleRows < totalRows ? (
        <div className="px-6 py-4 text-sm font-medium text-zinc-500">
          Loading more entries...
        </div>
      ) : null}
    </div>
  );
}
