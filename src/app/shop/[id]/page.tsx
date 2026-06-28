"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ShopHeader } from "@/components/shop/ShopHeader";
import { TransactionList } from "@/components/shop/TransactionList";
import { AddEntryButton } from "@/components/shop/AddEntryButton";
import { EntrySheet } from "@/components/sheets/EntrySheet";
import { SettleSheet } from "@/components/sheets/SettleSheet";
import { useBottomSheet } from "@/hooks/useBottomSheet";
import { useAppData } from "@/store/useAppData";
import { selectShop, selectBalance } from "@/store/selectors";
import type { Transaction } from "@/lib/types";

export default function ShopPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data, mounted } = useAppData();

  const entry = useBottomSheet();
  const settle = useBottomSheet();
  const [editing, setEditing] = useState<Transaction | null>(null);

  // Wait for hydration before deciding the shop exists.
  if (!mounted) {
    return <main className="min-h-screen" aria-hidden />;
  }

  const shop = selectShop(data, params.id);
  if (!shop) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-base font-medium text-zinc-700">Shop not found.</p>
        <button
          onClick={() => router.push("/")}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          Back to dashboard
        </button>
      </main>
    );
  }

  const balance = selectBalance(shop);

  function openNew() {
    setEditing(null);
    entry.openSheet();
  }

  function openEdit(tx: Transaction) {
    setEditing(tx);
    entry.openSheet();
  }

  return (
    <main className="relative min-h-screen">
      <ShopHeader shop={shop} balance={balance} onSettle={settle.openSheet} />
      <TransactionList shop={shop} onEdit={openEdit} />
      <AddEntryButton onClick={openNew} />

      <EntrySheet
        open={entry.open}
        onClose={entry.close}
        shopId={shop.id}
        transaction={editing}
      />
      <SettleSheet open={settle.open} onClose={settle.close} shop={shop} />
    </main>
  );
}
