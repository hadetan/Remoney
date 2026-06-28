"use client";

import { useState } from "react";
import { BottomSheet } from "./BottomSheet";
import { Button } from "@/components/ui/Button";
import { AmountInput } from "@/components/ui/AmountInput";
import { useAppData } from "@/store/useAppData";
import { selectSettleBreakdown } from "@/store/selectors";
import { validateAmount } from "@/lib/validation";
import { formatMoney, paiseToRupees } from "@/lib/money";
import type { Shop } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  shop: Shop;
}

/**
 * Settle sheet: transparency breakdown (red grossOwed, green creditApplied if
 * any), an hr, then the editable "To pay" prefilled with the net. Any amount > 0
 * is allowed (partial / exact / over). Confirm creates a SETTLEMENT dated today.
 */
export function SettleSheet({ open, onClose, shop }: Props) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Settle">
      {/* Mounts fresh each open, so the prefill initializes from the current breakdown. */}
      <SettleForm shop={shop} onClose={onClose} />
    </BottomSheet>
  );
}

function SettleForm({ shop, onClose }: { shop: Shop; onClose: () => void }) {
  const { addSettlement } = useAppData();
  const breakdown = selectSettleBreakdown(shop);

  const [amount, setAmount] = useState(String(paiseToRupees(breakdown.toPay)));
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    const result = validateAmount(amount);
    if (!result.ok) return setError(result.error);
    addSettlement(shop.id, result.value);
    onClose();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-zinc-500">Owed</span>
        <span className="text-xl font-semibold text-red-600 tabular-nums">
          {formatMoney(breakdown.grossOwed)}
        </span>
      </div>

      {breakdown.creditApplied > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">Credit</span>
          <span className="text-xl font-semibold text-emerald-600 tabular-nums">
            {formatMoney(breakdown.creditApplied)}
          </span>
        </div>
      )}

      <hr className="border-zinc-200" />

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-500">To pay</label>
        <AmountInput value={amount} onChange={setAmount} autoFocus />
        <p className="mt-2 text-xs text-zinc-400">
          You can pay less (partial) or more (credit carries forward).
        </p>
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <Button variant="danger" fullWidth onClick={handleConfirm} className="mt-2">
        Confirm
      </Button>
    </div>
  );
}
