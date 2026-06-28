"use client";

import { TransactionRow } from "./TransactionRow";
import { formatDateHeading } from "@/lib/format";
import type { DateGroup as DateGroupData } from "@/lib/ledger";
import type { Shop, Transaction } from "@/lib/types";

interface Props {
  shop: Shop;
  group: DateGroupData;
  onEdit: (tx: Transaction) => void;
}

/** Green date heading "15 apr, 2026" + that date's rows (createdAt ascending). */
export function DateGroup({ shop, group, onEdit }: Props) {
  return (
    <section className="px-3 py-2">
      <h3 className="px-3 pb-1 text-sm font-semibold text-emerald-600">
        {formatDateHeading(group.date)}
      </h3>
      <div className="flex flex-col">
        {group.transactions.map((tx) => (
          <TransactionRow key={tx.id} shop={shop} tx={tx} onEdit={onEdit} />
        ))}
      </div>
    </section>
  );
}
