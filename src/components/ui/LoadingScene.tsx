"use client";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-zinc-200/80 ${className}`} aria-hidden />;
}

export function ShopTransactionListLoading({
  message = "Preparing your entries...",
}: {
  message?: string;
}) {
  return (
    <div className="flex flex-col gap-4 px-6 py-6">
      <div className="text-sm font-medium text-zinc-500">{message}</div>
      <div className="flex flex-col gap-4">
        <SkeletonBlock className="h-4 w-24 rounded-lg" />
        <SkeletonBlock className="h-16 w-full" />
        <SkeletonBlock className="h-16 w-full" />
      </div>
      <div className="flex flex-col gap-4">
        <SkeletonBlock className="h-4 w-28 rounded-lg" />
        <SkeletonBlock className="h-16 w-full" />
        <SkeletonBlock className="h-16 w-full" />
      </div>
    </div>
  );
}

export function DashboardLoadingScene() {
  return (
    <main className="min-h-screen pb-28">
      <header className="flex items-center justify-between px-5 pb-2 pt-6">
        <SkeletonBlock className="h-8 w-32 rounded-xl" />
        <SkeletonBlock className="h-5 w-16 rounded-lg" />
      </header>

      <div className="flex flex-col gap-3 px-5 py-3">
        <SkeletonBlock className="h-24 w-full rounded-3xl" />
        <SkeletonBlock className="h-24 w-full rounded-3xl" />
        <SkeletonBlock className="h-24 w-full rounded-3xl" />
      </div>

      <div className="px-6 pt-6 text-sm text-zinc-500">Loading your shops...</div>
    </main>
  );
}

export function ShopLoadingScene() {
  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-zinc-100 bg-white/90 px-3 py-3 backdrop-blur">
        <SkeletonBlock className="h-10 w-10 rounded-full" />
        <SkeletonBlock className="h-6 flex-1 rounded-xl" />
        <SkeletonBlock className="h-10 w-20 rounded-xl" />
        <SkeletonBlock className="h-10 w-10 rounded-full" />
      </header>

      <ShopTransactionListLoading message="Loading this shop..." />
    </main>
  );
}
