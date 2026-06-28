"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { BottomSheet } from "@/components/sheets/BottomSheet";
import { useAppData } from "@/store/useAppData";
import { validateShopName } from "@/lib/validation";
import type { Shop } from "@/lib/types";

interface Props {
  shop: Shop;
  balance: number;
  onSettle: () => void;
}

/** Title + red Settle (disabled when B>=0) + overflow menu (rename / delete). */
export function ShopHeader({ shop, balance, onSettle }: Props) {
  const router = useRouter();
  const { renameShop, deleteShop } = useAppData();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState(shop.name);
  const [error, setError] = useState<string | null>(null);

  const owesNothing = balance >= 0;

  function handleRename() {
    const result = validateShopName(name);
    if (!result.ok) return setError(result.error);
    renameShop(shop.id, result.value);
    setError(null);
    setRenameOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-zinc-100 bg-white/90 px-3 py-3 backdrop-blur">
        <IconButton label="Back" onClick={() => router.push("/")}>
          <ArrowLeft size={22} />
        </IconButton>
        <h1 className="flex-1 truncate text-lg font-bold text-zinc-900">{shop.name}</h1>
        <Button
          variant="danger"
          onClick={onSettle}
          disabled={owesNothing}
          className="h-10 px-4 text-sm"
        >
          Settle
        </Button>
        <IconButton label="More" onClick={() => setMenuOpen((v) => !v)}>
          <MoreVertical size={22} />
        </IconButton>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-3 top-14 z-20 w-44 overflow-hidden rounded-2xl border border-zinc-100 bg-white py-1 shadow-lg">
              <button
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                onClick={() => {
                  setName(shop.name);
                  setMenuOpen(false);
                  setRenameOpen(true);
                }}
              >
                <Pencil size={16} /> Rename
              </button>
              <button
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50"
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmDelete(true);
                }}
              >
                <Trash2 size={16} /> Delete shop
              </button>
            </div>
          </>
        )}
      </header>

      <BottomSheet open={renameOpen} onClose={() => setRenameOpen(false)} title="Rename shop">
        <div className="flex flex-col gap-5">
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-14 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-lg text-zinc-900 outline-none focus:border-blue-500"
          />
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          <Button variant="primary" fullWidth onClick={handleRename}>
            Confirm
          </Button>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this shop?"
        message="This permanently removes the shop and all of its entries. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          deleteShop(shop.id);
          router.push("/");
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
