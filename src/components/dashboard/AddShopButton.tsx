"use client";

import { useState } from "react";
import { Fab } from "@/components/ui/Fab";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/sheets/BottomSheet";
import { useBottomSheet } from "@/hooks/useBottomSheet";
import { useAppData } from "@/store/useAppData";
import { validateShopName } from "@/lib/validation";

/** Bottom-LEFT circular plus FAB + the add-shop name input flow. */
export function AddShopButton() {
  const { open, openSheet, close } = useBottomSheet();
  const { addShop } = useAppData();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    const result = validateShopName(name);
    if (!result.ok) return setError(result.error);
    addShop(result.value);
    setName("");
    setError(null);
    close();
  }

  return (
    <>
      <Fab label="Add shop" position="left" onClick={openSheet} />
      <BottomSheet
        open={open}
        onClose={() => {
          setName("");
          setError(null);
          close();
        }}
        title="New shop"
      >
        <div className="flex flex-col gap-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-500">Shop name</label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sharma General Store"
              className="h-14 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-lg text-zinc-900 outline-none focus:border-blue-500"
            />
          </div>
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          <Button variant="primary" fullWidth onClick={handleConfirm}>
            Confirm
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}
