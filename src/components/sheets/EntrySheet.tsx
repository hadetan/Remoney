"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { BottomSheet } from "./BottomSheet";
import { Button } from "@/components/ui/Button";
import { AmountInput } from "@/components/ui/AmountInput";
import { DateInput } from "@/components/ui/DateInput";
import { useAppData } from "@/store/useAppData";
import { validateAmount, validateDateNotFuture } from "@/lib/validation";
import { paiseToRupees } from "@/lib/money";
import { todayIso } from "@/lib/format";
import type { Transaction } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  shopId: string;
  /** Present => edit mode (works for both DEBIT and SETTLEMENT). Absent => new DEBIT. */
  transaction?: Transaction | null;
}

export function EntrySheet({ open, onClose, shopId, transaction = null }: Props) {
  const isEdit = transaction !== null;
  const isSettlement = transaction?.type === "SETTLEMENT";
  const title = !isEdit ? "New entry" : isSettlement ? "Edit settlement" : "Edit entry";

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      {/* key remounts the form per target so its state initializes fresh (no reset effect). */}
      <EntryForm
        key={transaction?.id ?? "new"}
        shopId={shopId}
        transaction={transaction}
        onClose={onClose}
      />
    </BottomSheet>
  );
}

function EntryForm({
  shopId,
  transaction,
  onClose,
}: {
  shopId: string;
  transaction: Transaction | null;
  onClose: () => void;
}) {
  const { addEntry, editEntry, deleteEntry, editSettlement, deleteSettlement } = useAppData();
  const today = todayIso();
  const isEdit = transaction !== null;
  const isSettlement = transaction?.type === "SETTLEMENT";

  const [amount, setAmount] = useState(
    transaction ? String(paiseToRupees(transaction.amount)) : "",
  );
  const [date, setDate] = useState(transaction ? transaction.date : today);
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    const amountResult = validateAmount(amount);
    if (!amountResult.ok) return setError(amountResult.error);
    const dateResult = validateDateNotFuture(date, today);
    if (!dateResult.ok) return setError(dateResult.error);

    if (!isEdit) {
      addEntry(shopId, amountResult.value, dateResult.value);
    } else if (isSettlement) {
      editSettlement(shopId, transaction!.id, amountResult.value, dateResult.value);
    } else {
      editEntry(shopId, transaction!.id, amountResult.value, dateResult.value);
    }
    onClose();
  }

  function handleDelete() {
    if (!transaction) return;
    if (isSettlement) deleteSettlement(shopId, transaction.id);
    else deleteEntry(shopId, transaction.id);
    onClose();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-500">Amount</label>
        <AmountInput value={amount} onChange={setAmount} autoFocus />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-500">Date</label>
        <DateInput value={date} onChange={setDate} max={today} />
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <div className="mt-2 flex flex-col gap-3">
        <Button variant="primary" fullWidth onClick={handleConfirm}>
          Confirm
        </Button>
        {isEdit && (
          <button
            onClick={handleDelete}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl text-base font-semibold text-red-600 transition-colors hover:bg-red-50"
          >
            <Trash2 size={18} /> Delete
          </button>
        )}
      </div>
    </div>
  );
}
