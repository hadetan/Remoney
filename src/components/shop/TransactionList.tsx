"use client";

import { Receipt } from "lucide-react";
import { DateGroup } from "./DateGroup";
import { selectGroupedTransactions } from "@/store/selectors";
import type { Shop, Transaction } from "@/lib/types";

interface Props {
  shop: Shop;
  onEdit: (tx: Transaction) => void;
}

/** Renders the date-grouped log (newest date first); empty-shop placeholder. */
export function TransactionList({ shop, onEdit }: Props) {
  const groups = selectGroupedTransactions(shop);

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
      {groups.map((group) => (
        <DateGroup key={group.date} shop={shop} group={group} onEdit={onEdit} />
      ))}
    </div>
  );
}
