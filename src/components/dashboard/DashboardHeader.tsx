"use client";

interface Props {
  onOpenSettings: () => void;
}

/** Top bar: "Remoney" wordmark on the left, "Settings" text link on the right. */
export function DashboardHeader({ onOpenSettings }: Props) {
  return (
    <header className="flex items-center justify-between px-5 pb-2 pt-6">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Remoney</h1>
      <button
        onClick={onOpenSettings}
        className="text-sm font-medium text-blue-600 underline-offset-2 hover:underline"
      >
        Settings
      </button>
    </header>
  );
}
