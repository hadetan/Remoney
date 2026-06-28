"use client";

import { Plus } from "lucide-react";

interface Props {
  onClick: () => void;
  label: string;
  /** Horizontal anchor of the floating button. */
  position?: "left" | "right";
}

/** Circular floating action button (uses the lucide Plus glyph). */
export function Fab({ onClick, label, position = "right" }: Props) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`fixed bottom-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-700 active:scale-95 ${
        position === "left" ? "left-6" : "right-6"
      }`}
    >
      <Plus size={26} strokeWidth={2.5} />
    </button>
  );
}
