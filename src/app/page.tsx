"use client";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ShopList } from "@/components/dashboard/ShopList";
import { AddShopButton } from "@/components/dashboard/AddShopButton";
import { SettingsSheet } from "@/components/sheets/SettingsSheet";
import { useBottomSheet } from "@/hooks/useBottomSheet";
import { useAppData } from "@/store/useAppData";

export default function DashboardPage() {
  const { data, mounted } = useAppData();
  const settings = useBottomSheet();

  return (
    <main className="relative min-h-screen pb-28">
      <DashboardHeader onOpenSettings={settings.openSheet} />
      {/* Render the list only after hydration to avoid an SSR/localStorage mismatch. */}
      {mounted ? <ShopList shops={data.shops} /> : <div className="px-5 py-3" aria-hidden />}
      <AddShopButton />
      <SettingsSheet open={settings.open} onClose={settings.close} />
    </main>
  );
}
