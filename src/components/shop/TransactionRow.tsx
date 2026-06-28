"use client";

import { Money } from "@/components/ui/Money";
import { selectSettlementRowInfo } from "@/store/selectors";
import { formatMoney } from "@/lib/money";
import type { Shop, Transaction } from "@/lib/types";

interface Props {
  shop: Shop;
  tx: Transaction;
  onEdit: (tx: Transaction) => void;
}

/**
 * One ledger row. DEBIT shows the amount only. SETTLEMENT shows the paid amount
 * plus resulting credit (overpayment) or remaining owed (partial). Tap to edit.
 */
export function TransactionRow({ shop, tx, onEdit }: Props) {
  const isSettlement = tx.type === "SETTLEMENT";

  return (
    <button
      onClick={() => onEdit(tx)}
      className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition-colors hover:bg-zinc-50"
    >
      {isSettlement ? <SettlementContent shop={shop} tx={tx} /> : <DebitContent tx={tx} />}
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

function SettlementContent({ shop, tx }: { shop: Shop; tx: Transaction }) {
  const info = selectSettlementRowInfo(shop, tx);
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
