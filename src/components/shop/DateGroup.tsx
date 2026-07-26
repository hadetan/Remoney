"use client";

import { TransactionRow } from "./TransactionRow";
import { formatDateHeading } from "@/lib/format";
import type { TransactionListGroup } from "@/lib/ledger";
import type { Transaction } from "@/lib/types";

interface Props {
  group: TransactionListGroup;
  onEdit: (tx: Transaction) => void;
}

/** Green date heading "15 apr, 2026" + that date's rows (createdAt ascending). */
export function DateGroup({ group, onEdit }: Props) {
  return (
    <section className="px-3 py-2">
      <h3 className="px-3 pb-1 text-sm font-semibold text-emerald-600">
        {formatDateHeading(group.date)}
      </h3>
      <div className="flex flex-col">
        {group.rows.map((row) => (
          <TransactionRow key={row.tx.id} row={row} onEdit={onEdit} />
        ))}
      </div>
    </section>
  );
}
