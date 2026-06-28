"use client";

import { Store } from "lucide-react";
import { ShopCard } from "./ShopCard";
import type { Shop } from "@/lib/types";

/** Maps shops to cards; shows the dashboard empty state when there are none. */
export function ShopList({ shops }: { shops: Shop[] }) {
  if (shops.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-24 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
          <Store size={28} />
        </span>
        <p className="text-base font-medium text-zinc-700">No shops yet</p>
        <p className="text-sm text-zinc-500">Tap the + button to add your first shop.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-5 py-3">
      {shops.map((shop) => (
        <ShopCard key={shop.id} shop={shop} />
      ))}
    </div>
  );
}
