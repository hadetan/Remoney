"use client";

interface Props {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  /** Latest selectable date, YYYY-MM-DD. Future dates are not allowed. */
  max: string;
  disabled?: boolean;
}

/** Date input bound to "YYYY-MM-DD" with a max (today) to block future dates. */
export function DateInput({ value, onChange, max, disabled }: Props) {
  return (
    <input
      type="date"
      value={value}
      max={max}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="h-14 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-lg text-zinc-900 outline-none focus:border-blue-500 disabled:bg-zinc-50 disabled:text-zinc-400"
    />
  );
}
