"use client";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ShopList } from "@/components/dashboard/ShopList";
import { AddShopButton } from "@/components/dashboard/AddShopButton";
import { SettingsSheet } from "@/components/sheets/SettingsSheet";
import { DashboardLoadingScene } from "@/components/ui/LoadingScene";
import { useBottomSheet } from "@/hooks/useBottomSheet";
import { useAppData } from "@/store/useAppData";

export default function DashboardPage() {
  const { data, mounted } = useAppData();
  const settings = useBottomSheet();

  if (!mounted) {
    return <DashboardLoadingScene />;
  }

  return (
    <main className="relative min-h-screen pb-28">
      <DashboardHeader onOpenSettings={settings.openSheet} />
      <ShopList shops={data.shops} />
      <AddShopButton />
      <SettingsSheet open={settings.open} onClose={settings.close} />
    </main>
  );
}
