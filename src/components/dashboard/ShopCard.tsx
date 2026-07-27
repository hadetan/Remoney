"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Balance } from "@/components/ui/Money";
import { selectBalance } from "@/store/selectors";
import type { Shop } from "@/lib/types";

/** Wallet-style card showing the shop name and its Cr/Dr balance badge. */
export function ShopCard({ shop }: { shop: Shop }) {
  const b = selectBalance(shop);

  return (
    <Link
      href={`/shop/${shop.id}`}
      className="flex w-full items-center justify-between rounded-3xl border border-zinc-100 bg-white p-5 text-left shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex flex-col gap-1">
        <span className="text-lg font-semibold text-zinc-900">{shop.name}</span>
        <Balance paise={b} className="text-base" />
      </div>
      <ChevronRight size={22} className="text-zinc-300" />
    </Link>
  );
}
