"use client";

interface Props {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  placeholder?: string;
}

/**
 * Money input. Accepts rupees as a string ("1500.50"); the caller converts to
 * paise via parseAmountToPaise. Uses a decimal-friendly numeric keypad.
 */
export function AmountInput({ value, onChange, autoFocus, placeholder = "0.00" }: Props) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 focus-within:border-blue-500">
      <span className="text-2xl font-semibold text-zinc-400">₹</span>
      <input
        type="text"
        inputMode="decimal"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-16 w-full bg-transparent text-3xl font-semibold tracking-tight text-zinc-900 outline-none placeholder:text-zinc-300"
      />
    </div>
  );
}
