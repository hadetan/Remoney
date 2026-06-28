"use client";

import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "danger" | "ghost" | "neutral";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300",
  neutral: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 disabled:opacity-50",
  ghost: "bg-transparent text-zinc-700 hover:bg-zinc-100 disabled:opacity-50",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

export function Button({ variant = "primary", fullWidth, className = "", ...rest }: Props) {
  return (
    <button
      {...rest}
      className={`h-12 rounded-2xl px-5 text-base font-semibold transition-colors disabled:cursor-not-allowed ${
        fullWidth ? "w-full" : ""
      } ${VARIANTS[variant]} ${className}`}
    />
  );
}
