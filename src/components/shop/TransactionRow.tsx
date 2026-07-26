"use client";

import { Money } from "@/components/ui/Money";
import { formatMoney } from "@/lib/money";
import type { TransactionListRow } from "@/lib/ledger";
import type { Transaction } from "@/lib/types";

interface Props {
  row: TransactionListRow;
  onEdit: (tx: Transaction) => void;
}

/**
 * One ledger row. DEBIT shows the amount only. SETTLEMENT shows the paid amount
 * plus resulting credit (overpayment) or remaining owed (partial). Tap to edit.
 */
export function TransactionRow({ row, onEdit }: Props) {
  const { tx } = row;
  const isSettlement = tx.type === "SETTLEMENT";

  return (
    <button
      onClick={() => onEdit(tx)}
      className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition-colors hover:bg-zinc-50"
    >
      {isSettlement ? <SettlementContent row={row} /> : <DebitContent tx={tx} />}
    </button>
  );
}

function DebitContent({ tx }: { tx: Transaction }) {
  return (
    <>
      <span className="text-sm font-medium text-zinc-500">Purchase</span>
      <Money paise={tx.amount} className="text-base font-semibold text-zinc-900 tabular-nums" />
    </>
  );
}

function SettlementContent({ row }: { row: TransactionListRow }) {
  const info = row.settlementInfo;
  if (info === null) return null;
  return (
    <>
      <span className="text-sm font-medium text-emerald-600">Payment</span>
      <span className="text-right tabular-nums">
        <span className="block text-base font-semibold text-zinc-900">
          Paid {formatMoney(info.paid)}
        </span>
        {info.resultingCredit !== null ? (
          <span className="block text-xs font-medium text-emerald-600">
            Cr {formatMoney(info.resultingCredit)}
          </span>
        ) : (
          <span className="block text-xs font-medium text-red-600">
            still owe {formatMoney(info.remainingOwed ?? 0)}
          </span>
        )}
      </span>
    </>
  );
}
