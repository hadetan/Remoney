"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
}

/** Icon-only control. Children should be a lucide-react icon. */
export function IconButton({ label, children, className = "", ...rest }: Props) {
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      className={`flex h-10 w-10 items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100 active:bg-zinc-200 ${className}`}
    >
      {children}
    </button>
  );
}
