"use client";

import { Fab } from "@/components/ui/Fab";

/** Bottom-right circular plus FAB for creating a new entry. */
export function AddEntryButton({ onClick }: { onClick: () => void }) {
  return <Fab label="New entry" position="right" onClick={onClick} />;
}
