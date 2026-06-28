# Remoney — Technical Specification

This document is the implementation-ready technical specification for **Remoney**, a mobile-first, offline, local-only money manager for tracking debt with shops. It derives entirely from the locked specification brief and is the engineering reference for the data model, money arithmetic, ledger algorithms, state management, storage, import/export, and deployment.

All amounts are stored as **integer paise**. All balances and breakdowns are **derived on read**, never stored. There is no server, no authentication, no environment configuration, and no cloud. Everything lives in the browser's `localStorage`.

---

## 1. Tech Stack and Rationale

| Concern | Choice | Rationale |
| --- | --- | --- |
| Framework | **Next.js (App Router)** | Mature React framework with file-system routing. The App Router gives us `app/page.tsx`, nested layouts, and the dynamic route `app/shop/[id]/page.tsx` with zero routing boilerplate. Deploys to Vercel with no configuration. |
| Language | **TypeScript (strict)** | `strict` mode catches null/undefined access, narrows the `TransactionType` discriminated union exhaustively, and lets the ledger math be expressed in precise, non-nullable types. Money-as-integer invariants are encoded in the type layer. |
| Styling | **Tailwind CSS v4** | Utility-first, mobile-first by default. Lets us build the wallet-style cards, large tap targets, and the green/red balance treatments without leaving the markup. No runtime cost. **v4 is CSS-first**: there is **no `tailwind.config.ts`** — the framework is enabled via `@import "tailwindcss";` in `src/app/globals.css`, theme tokens are declared with the `@theme` directive in CSS, and the PostCSS pipeline uses the `@tailwindcss/postcss` plugin (`postcss.config.mjs`). |
| Icons | **lucide-react** | Premium-quality, tree-shakeable open-source icon set. The app **never** hand-draws SVG icons — every glyph (plus FAB, kebab menu, close X, settings) comes from lucide-react for visual consistency. |
| State | **React Context + `useReducer`** | The entire app state is one `AppData` object mutated by a small set of well-defined actions. A reducer makes every mutation a pure, testable transition; Context distributes it without prop drilling. No external state library is warranted for a single-document app. |
| Testing | **Vitest** | Fast, ESM-native, Jest-compatible API. Used to exhaustively test the pure money/ledger functions (`balance`, `settleBreakdown`, `formatMoney`, `mergeImport`) which carry all the business risk. |
| Lint / Format | **ESLint + Prettier** | ESLint enforces correctness and Next.js rules; Prettier enforces deterministic formatting. Both run in CI/pre-commit. |
| IDs | **`crypto.randomUUID()`** | Native, dependency-free UUID v4 generation available in modern browsers, wrapped behind `lib/id.ts`. |

### 1.1 Deployment Model

- **Standard Next.js app on Vercel**, deployed with **zero config** and **no environment variables**. Pushing the repository to a Vercel project is sufficient.
- **NOT a static export.** Because we ship a standard Next.js build, the dynamic route `/shop/[id]` does **not** require `generateStaticParams`. The `[id]` segment is resolved at runtime on the client.
- **All data is client-side.** Pages are client components (`"use client"`) that hydrate from `localStorage` **after mount**.
- **Why `localStorage` needs a hydration guard.** Server-side rendering (and the initial client render that must match it) has no access to `localStorage`. If a component read `localStorage` during render, the server would produce empty markup while the client would produce data-filled markup, and React would throw a hydration mismatch. The fix is a **mounted guard**: render a neutral/empty shell on the first paint, then load and apply the persisted `AppData` inside a `useEffect` once `mounted === true`. See [§10.4](#104-hydration--mounted-guard).

### 1.2 Bootstrap & Pinned Versions

The project is **scaffolded with the official Next.js CLI**, not assembled by hand:

```bash
npx create-next-app@latest remoney --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
# then add the project-specific packages the scaffold does not include:
npm install lucide-react
npm install -D prettier vitest
```

The scaffold provides App Router + `src/` dir, TypeScript (strict), Tailwind v4, ESLint (flat config), and the base `src/app/{layout.tsx,page.tsx,globals.css}` + config files. We add `lucide-react` (icons), `prettier` (formatting), and `vitest` (unit tests for the money/ledger math) on top.

Pinned versions (latest at scaffold time):

| Package | Version | Package | Version |
| --- | --- | --- | --- |
| `next` | `16.2.9` | `tailwindcss` | `^4` |
| `react` / `react-dom` | `19.2.4` | `@tailwindcss/postcss` | `^4` |
| `typescript` | `^5` | `eslint` | `^9` |
| `lucide-react` | `^1.22.0` | `eslint-config-next` | `16.2.9` |
| `prettier` | `^3.9.1` | `@types/node` | `^20` |
| `vitest` | `^4.1.9` | `@types/react` / `-dom` | `^19` |

**Next.js 16 notes that shape the setup:** Turbopack is the default bundler (dev and build); the legacy `next lint` command has been **removed**, so linting runs ESLint directly (`eslint .`) against the generated flat config `eslint.config.mjs`. The CLI also emits `AGENTS.md` and `CLAUDE.md` (agent guidance) and `next-env.d.ts` at the repo root.

---

## 2. Data Model

All domain types live in `src/lib/types.ts`. Field names below are **final** and must match exactly.

```typescript
// src/lib/types.ts

/** Discriminant for a ledger transaction. */
export type TransactionType = "DEBIT" | "SETTLEMENT";

/**
 * A single ledger event within a shop.
 * DEBIT      = a purchase on credit (increases what the user owes).
 * SETTLEMENT = a payment the user makes (decreases what the user owes).
 */
export interface Transaction {
  /** UUID v4, crypto.randomUUID(). */
  id: string;
  /** "DEBIT" | "SETTLEMENT". */
  type: TransactionType;
  /** Integer MINOR UNITS (paise). Strictly greater than 0. Never a float. */
  amount: number;
  /** The transaction's calendar date, "YYYY-MM-DD". */
  date: string;
  /** ISO 8601 creation timestamp. Used ONLY as a tiebreak for ordering within the same date. */
  createdAt: string;
}

/** A vendor/project the user owes money to. Holds an ordered list of transactions. */
export interface Shop {
  /** UUID v4, crypto.randomUUID(). */
  id: string;
  /** Display name (non-empty, trimmed). */
  name: string;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** Ordered list of ledger events. */
  transactions: Transaction[];
}

/** The entire persisted application document. */
export interface AppData {
  /** Storage format version. Currently 1. */
  schemaVersion: number;
  /** All shops. */
  shops: Shop[];
}
```

### 2.1 Field Notes

| Type | Field | Notes |
| --- | --- | --- |
| `AppData` | `schemaVersion` | Currently `1`. Drives the migration hook in the storage layer ([§7](#7-storage-layer)). |
| `AppData` | `shops` | The complete list of shops. Empty array is the valid "no shops" / reset state. |
| `Shop` | `id` | UUID v4 from `crypto.randomUUID()`. Primary key for import merge. |
| `Shop` | `name` | Required, non-empty after trim. May be renamed; **never** overwritten by import. |
| `Shop` | `createdAt` | ISO 8601 timestamp set when the shop is created. |
| `Shop` | `transactions` | The shop's ledger. Balance is **derived** from it; never denormalized. |
| `Transaction` | `id` | UUID v4. Primary key for import merge within a shop. |
| `Transaction` | `type` | Discriminated union `"DEBIT" | "SETTLEMENT"`. |
| `Transaction` | `amount` | **Integer paise, strictly `> 0`.** Both DEBIT and SETTLEMENT amounts are positive magnitudes; the sign in `balance()` comes from the `type`, not from `amount`. |
| `Transaction` | `date` | `"YYYY-MM-DD"`. The user-meaningful calendar date. Drives grouping and ordering. Must be `<= today` for DEBIT and for any edit. |
| `Transaction` | `createdAt` | ISO 8601. Pure tiebreak for ordering within the same `date`. Not displayed. |

**Invariant:** no totals, balances, or breakdowns are ever stored. The single source of truth is the array of `Transaction`s per shop.

---

## 3. Money Representation

Money lives in `src/lib/money.ts`.

### 3.1 The Integer-Paise Rule

- **1 rupee = 100 paise.** All `Transaction.amount` values are **integer paise**.
- **Floats are banned for storage and arithmetic.** Binary floating point cannot represent decimal fractions like `0.10` exactly, so chains of additions/subtractions accumulate rounding error (the classic `0.1 + 0.2 !== 0.3`). Since the entire app is summation of currency amounts, representing every amount as an integer count of the smallest unit makes all arithmetic exact, associative, and order-independent.
- Floats appear **only at the UI edge**: when a user types `1500.50` we parse it once to `150050` paise; when we display `150050` we format it once to `₹1,500.50`. No float is ever persisted.

### 3.2 Conversion Helpers

```typescript
// src/lib/money.ts

/** Convert a rupee value (possibly with up to 2 decimals) into integer paise. */
export function rupeesToPaise(rupees: number): number {
  // Round to the nearest paisa to neutralize float input noise.
  return Math.round(rupees * 100);
}

/** Convert integer paise into a rupee number (for formatting only). */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/**
 * Parse a user-entered amount string ("1500", "1500.5", "1,500.50") into integer paise.
 * Returns null when the input is not a valid positive amount.
 * - Strips grouping separators.
 * - Rejects more than 2 decimal places, NaN, <= 0.
 */
export function parseAmountToPaise(input: string): number | null {
  const cleaned = input.replace(/,/g, "").trim();
  if (cleaned === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  return rupeesToPaise(value);
}
```

### 3.3 `formatMoney` Specification

```typescript
// src/lib/money.ts

/**
 * Format integer paise as a currency string:
 *   - Indian rupee glyph "₹"
 *   - exactly 2 decimal places
 *   - standard thousands grouping (1,500.00 / 1,000,000.00)
 *
 * Examples:
 *   formatMoney(150000)  === "₹1,500.00"
 *   formatMoney(0)       === "₹0.00"
 *   formatMoney(100000000) === "₹1,000,000.00"
 */
export function formatMoney(paise: number): string {
  const rupees = paiseToRupees(Math.abs(paise));
  const grouped = rupees.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `₹${grouped}`;
}
```

**Rules:**
- **Glyph:** always the Indian rupee symbol `₹`.
- **Decimals:** always exactly 2 (`minimum = maximum = 2`).
- **Grouping:** **standard thousands grouping** by default (`1,500.00`, `1,000,000.00`), implemented via `en-US` locale. **Indian lakh grouping** (`1,00,000.00`) is an explicitly **optional future toggle and NOT the default**.
- **Sign handling:** `formatMoney` formats the **magnitude**. The sign/credit-debit semantics (`Cr`/`Dr`, color) are decided by the display layer ([§5](#5-display--derivation-rules)) — `formatMoney` never emits a minus sign.

### 3.4 Rounding Rules

- The only rounding occurs in `rupeesToPaise` via `Math.round`, applied **once** when converting a user-entered rupee value to paise.
- All downstream arithmetic (`balance`, `settleBreakdown`) is integer addition/subtraction with **zero rounding** — results are exact paise.
- Display formatting performs no rounding beyond fixing 2 decimal places, and because stored values are always whole paise, `paiseToRupees` always yields a value with at most 2 decimals.

---

## 4. Core Algorithms

All ledger logic lives in `src/lib/ledger.ts`. Every function is pure and operates over the transaction array — nothing is read from or written to storage here.

### 4.1 Ordering Rule

Transactions within a shop are ordered by **`date` ascending, then `createdAt` ascending**.

```text
order(a, b):
  if a.date != b.date:        return a.date < b.date ? -1 : +1   # lexicographic on YYYY-MM-DD == chronological
  if a.createdAt != b.createdAt: return a.createdAt < b.createdAt ? -1 : +1
  return 0
```

```typescript
// src/lib/ledger.ts
export function compareTx(a: Transaction, b: Transaction): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  return 0;
}

/** Returns a new array sorted chronologically (date asc, then createdAt asc). */
export function orderedTransactions(shop: Shop): Transaction[] {
  return [...shop.transactions].sort(compareTx);
}
```

> Because `YYYY-MM-DD` and ISO 8601 timestamps sort correctly under plain string comparison, no `Date` parsing is needed for ordering.

### 4.2 `balance()` — The Single Source of Truth

```text
balance(shop) = sum(t.amount where t.type == SETTLEMENT)
              - sum(t.amount where t.type == DEBIT)
```

A positive balance means the user has **overpaid** (holds credit); a negative balance means the user **owes** money.

```typescript
// src/lib/ledger.ts
export function balance(shop: Shop): number {
  let b = 0;
  for (const t of shop.transactions) {
    b += t.type === "SETTLEMENT" ? t.amount : -t.amount;
  }
  return b; // integer paise, signed
}
```

Balance is **always recomputed, never stored.** Ordering does not affect `balance()` (addition is commutative), but it is essential for `lastSettlement()` and `settleBreakdown()`.

### 4.3 `lastSettlement()` — Most Recent Settlement

The "most recent settlement" is the `SETTLEMENT` transaction with the **greatest `(date, createdAt)`**.

```typescript
// src/lib/ledger.ts
export function lastSettlement(shop: Shop): Transaction | null {
  let latest: Transaction | null = null;
  for (const t of shop.transactions) {
    if (t.type !== "SETTLEMENT") continue;
    if (latest === null || compareTx(t, latest) > 0) latest = t;
  }
  return latest;
}
```

### 4.4 `settleBreakdown()` — The Settle-Screen Math

The settle sheet shows a transparency breakdown that **always reconciles to balance by construction**. Let `B = balance(shop)` at the moment the sheet opens (the sheet is only reachable when `B < 0`).

**Definitions:**

```text
creditApplied (GREEN) = max(0, balanceUpToAndIncluding(lastSettlement))
                        # the overpayment the last settlement left.
                        # 0 if there is no prior settlement, or if the last
                        # settlement was partial (left the running balance negative).

grossOwed (RED)       = |B| + creditApplied

toPay (NET)           = |B|          # equals grossOwed - creditApplied by construction
```

`balanceUpToAndIncluding(s)` is the signed balance computed over all transactions ordered up to **and including** the settlement `s` (using the chronological ordering from §4.1).

```typescript
// src/lib/ledger.ts

export interface SettleBreakdown {
  /** Overpayment the last settlement left, in paise (>= 0). Shown GREEN. */
  creditApplied: number;
  /** |B| + creditApplied, in paise. Shown RED. */
  grossOwed: number;
  /** |B|, in paise. The prefilled net amount to pay. */
  toPay: number;
}

/** Signed balance over all transactions chronologically up to and including `target`. */
function balanceUpToIncluding(shop: Shop, target: Transaction): number {
  const ordered = orderedTransactions(shop);
  let b = 0;
  for (const t of ordered) {
    b += t.type === "SETTLEMENT" ? t.amount : -t.amount;
    if (t.id === target.id) break;
  }
  return b;
}

export function settleBreakdown(shop: Shop): SettleBreakdown {
  const B = balance(shop); // expected < 0 when the settle sheet is open
  const last = lastSettlement(shop);

  const creditApplied =
    last === null ? 0 : Math.max(0, balanceUpToIncluding(shop, last));

  const toPay = Math.abs(B);
  const grossOwed = toPay + creditApplied;

  return { creditApplied, grossOwed, toPay };
}
```

#### Why `grossOwed - creditApplied === toPay === |B|` by construction

This is an identity, not a coincidence:

- `grossOwed` is **defined** as `|B| + creditApplied`.
- Therefore `grossOwed - creditApplied = (|B| + creditApplied) - creditApplied = |B|`.
- And `toPay` is **defined** as `|B|`.
- Hence `grossOwed - creditApplied === toPay === |B|` for every possible ledger, regardless of whether prior payments were partial, exact, or overpayments.

`creditApplied` is purely a **presentation** quantity that explains where the difference between the gross figure and the net figure comes from (the leftover credit a previous overpayment left behind). It never changes what the user actually needs to pay, which is always exactly `|B|`.

#### Proof / Replay Table

Amounts shown in rupees for readability; stored as paise. `green = creditApplied`, `red = grossOwed = |B| + green`, `net = toPay = |B|`.

| Sequence | B_now | green | red = \|B\| + green | net = toPay |
| --- | ---: | ---: | ---: | ---: |
| owe 3000, pay 3500, owe 2000 | −1500 | 500 | 2000 | 1500 |
| owe 3000, pay 1000 (partial), owe 500 | −2500 | 0 | 2500 | 2500 |
| owe 3000, pay 3500, owe 1000 | −500 | 500 | 1000 | 500 |

**Walkthrough of each row:**

1. **owe 3000, pay 3500, owe 2000.** After the payment of 3500 against a 3000 debt, the running balance up to and including that settlement is `+500` → `creditApplied = max(0, 500) = 500`. Then a 2000 debit drops the current balance to `500 − 2000 = −1500`, so `B = −1500`, `|B| = 1500 = net`. `red = 1500 + 500 = 2000`. Check: `2000 − 500 = 1500 = |B|`. ✓
2. **owe 3000, pay 1000 (partial), owe 500.** The 1000 payment against a 3000 debt leaves the running balance at `−2000` (still negative → a partial payment), so `creditApplied = max(0, −2000) = 0`. A further 500 debit gives `B = −2500`, `|B| = 2500 = net`. `red = 2500 + 0 = 2500`. Check: `2500 − 0 = 2500 = |B|`. ✓
3. **owe 3000, pay 3500, owe 1000.** The 3500 payment leaves running balance `+500` → `creditApplied = 500`. The 1000 debit gives `B = +500 − 1000 = −500`, `|B| = 500 = net`. `red = 500 + 500 = 1000`. Check: `1000 − 500 = 500 = |B|`. ✓

#### Editable "To pay" and confirm semantics

The "To pay" input is **prefilled with `toPay`** and **editable to any amount strictly greater than 0**:

- **less than `toPay`** → **partial** payment (allowed). Leftover stays as debt; `B` remains negative.
- **exactly `toPay`** → clears the debt; `B` becomes `0`.
- **more than `toPay`** → **overpayment** (allowed). `B` becomes positive = new credit.

On confirm, a new `SETTLEMENT` transaction is created **dated today** (date not editable at creation), `amount` = the entered value in paise. The sheet closes and the UI re-derives all values.

### 4.5 `groupByDate()` — Log Grouping for Display

The transaction log is displayed **newest-date-first** (date groups descending); **within a date group, rows are chronological** (`createdAt` ascending).

```typescript
// src/lib/ledger.ts

export interface DateGroup {
  /** "YYYY-MM-DD" key. */
  date: string;
  /** Rows for this date, ordered by createdAt ascending. */
  transactions: Transaction[];
}

/**
 * Group a shop's transactions by calendar date.
 * - Groups returned in DESCENDING date order (newest date first).
 * - Within each group, transactions ascending by createdAt.
 */
export function groupByDate(shop: Shop): DateGroup[] {
  const map = new Map<string, Transaction[]>();
  for (const t of shop.transactions) {
    const bucket = map.get(t.date);
    if (bucket) bucket.push(t);
    else map.set(t.date, [t]);
  }

  const groups: DateGroup[] = [];
  for (const [date, txs] of map) {
    txs.sort((a, b) =>
      a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0,
    );
    groups.push({ date, transactions: txs });
  }

  // Newest date first.
  groups.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return groups;
}
```

The date heading rendering (`"15 apr, 2026"`) is handled by `formatDateHeading` in `src/lib/format.ts` — see [§5.4](#54-settlement-row-text).

---

## 5. Display & Derivation Rules

These rules are implemented in the display layer and `src/components/ui/Money.tsx`; the numbers come from `src/lib/ledger.ts`.

### 5.1 Credit / Debit Decision

Given `B = balance(shop)`:

| Condition | Meaning | Label | Color |
| --- | --- | --- | --- |
| `B >= 0` | **CREDIT** | `Cr ₹{B}` | **GREEN** |
| `B < 0` | **DEBIT** | `Dr ₹{|B|}` | **RED** |

```text
display(B):
  if B >= 0:  return GREEN, "Cr " + formatMoney(B)        # B == 0 is CREDIT
  else:       return RED,   "Dr " + formatMoney(|B|)
```

### 5.2 Zero-is-Credit

`B == 0` counts as **CREDIT** and renders as **`Cr ₹0.00`** in **green**. A brand-new shop with no transactions has `B = 0` and therefore shows **`Cr ₹0.00` (green)**.

### 5.3 Settle Disabled When `B >= 0`

The red **Settle** button on the shop header is **disabled whenever `B >= 0`** (nothing is owed). The Settle sheet is **only reachable when `B < 0`**. This guarantees `settleBreakdown()` always runs on a negative balance, so `toPay = |B| > 0`.

### 5.4 Settlement-Row Text

A `SETTLEMENT` row shows the amount paid and, depending on the running balance immediately after that payment:

- If the payment left the running balance **`> 0`** (an overpayment), show the **resulting credit**:
  `"Paid ₹3,500.00 - Cr ₹500.00"`
- If the payment was **partial** (running balance still `< 0` immediately after it), show the **remaining owed**:
  `"Paid ₹1,000.00 - still owe ₹2,000.00"`

A `DEBIT` row shows **only the amount** (e.g. `"₹2,000.00"`). No notes, no categories, nothing else.

```text
settlementRowText(shop, settlement):
  paid       = settlement.amount
  runningBal = balanceUpToIncluding(shop, settlement)
  if runningBal > 0:
    return "Paid " + formatMoney(paid) + " - Cr " + formatMoney(runningBal)
  else:
    return "Paid " + formatMoney(paid) + " - still owe " + formatMoney(|runningBal|)
```

The green date heading uses `formatDateHeading`:

```typescript
// src/lib/format.ts

const MONTHS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];

/** "2026-04-15" -> "15 apr, 2026" (day no leading zero, lowercase 3-letter month). */
export function formatDateHeading(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}, ${y}`;
}
```

---

## 6. Validation Rules

All validators live in `src/lib/validation.ts` and return a typed result (`{ ok: true; value } | { ok: false; error }`).

| Field / Action | Rule |
| --- | --- |
| Entry (DEBIT) amount | Required, numeric, **`> 0`** (parsed to integer paise via `parseAmountToPaise`). |
| Settlement amount | Required, numeric, **`> 0`**. |
| Settle "To pay" amount | **`> 0`** (any positive value: partial, exact, or over). |
| Entry date | **`<= today`** — **no future dates** (input `max` = today). |
| Settlement date (create) | Fixed to **today** (not editable at creation). |
| Settlement date (edit) | Editable, **`max = today`**. |
| Shop name | Required, **non-empty after trim**. |
| Import file | Must **parse as JSON** and **match the expected schema / `schemaVersion`**, else **rejected with an error message**. |

```typescript
// src/lib/validation.ts

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export function validateAmount(input: string): Result<number> {
  const paise = parseAmountToPaise(input);
  if (paise === null) return { ok: false, error: "Enter a valid amount greater than 0." };
  return { ok: true, value: paise };
}

export function validateDateNotFuture(isoDate: string, todayIso: string): Result<string> {
  if (isoDate > todayIso) return { ok: false, error: "Date cannot be in the future." };
  return { ok: true, value: isoDate };
}

export function validateShopName(name: string): Result<string> {
  const trimmed = name.trim();
  if (trimmed === "") return { ok: false, error: "Shop name is required." };
  return { ok: true, value: trimmed };
}

/** Structural schema check used by import. */
export function isValidAppData(value: unknown): value is AppData {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.schemaVersion !== "number") return false;
  if (!Array.isArray(v.shops)) return false;
  return v.shops.every(isValidShop);
}
```

Date comparisons use the fact that `"YYYY-MM-DD"` strings compare correctly under lexicographic ordering, so `isoDate > todayIso` is a valid "is in the future" test.

---

## 7. Storage Layer

Implemented in `src/lib/storage.ts`. Constants in `src/lib/constants.ts`.

- **localStorage key:** `"remoney:appdata:v1"`
- **Value:** `JSON.stringify(AppData)`
- **Load on mount → parse → validate → fall back to empty `AppData` on any error.**
- **`schemaVersion` + migration hook** allow future format changes without data loss.

```typescript
// src/lib/constants.ts
export const STORAGE_KEY = "remoney:appdata:v1";
export const SCHEMA_VERSION = 1;
export const EMPTY_APP_DATA: AppData = { schemaVersion: SCHEMA_VERSION, shops: [] };
```

```typescript
// src/lib/storage.ts
import { STORAGE_KEY, SCHEMA_VERSION, EMPTY_APP_DATA } from "./constants";
import { isValidAppData } from "./validation";
import type { AppData } from "./types";

/** Future format upgrades funnel through here. v1 is the identity migration. */
export function migrate(data: AppData): AppData {
  let d = data;
  // if (d.schemaVersion < 2) { d = migrateV1toV2(d); }
  return { ...d, schemaVersion: SCHEMA_VERSION };
}

/** Load + safe-parse + validate. Returns EMPTY_APP_DATA on any failure. */
export function loadAppData(): AppData {
  if (typeof window === "undefined") return EMPTY_APP_DATA; // SSR guard
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return EMPTY_APP_DATA;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidAppData(parsed)) return EMPTY_APP_DATA;
    return migrate(parsed);
  } catch {
    return EMPTY_APP_DATA; // corrupt JSON, quota errors, etc.
  }
}

/** Serialize + persist. Swallows quota/serialization errors. */
export function saveAppData(data: AppData): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

/** Reset: clear the key. */
export function clearAppData(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
```

---

## 8. Import / Export

Implemented in `src/lib/importExport.ts`.

### 8.1 Export

Export produces a JSON document equal to the full `AppData` plus an `exportedAt` ISO timestamp:

```text
{ schemaVersion, exportedAt, shops: [...] }
```

```typescript
// src/lib/importExport.ts
export interface ExportDocument {
  schemaVersion: number;
  exportedAt: string; // ISO 8601
  shops: Shop[];
}

export function buildExport(data: AppData): ExportDocument {
  return {
    schemaVersion: data.schemaVersion,
    exportedAt: new Date().toISOString(),
    shops: data.shops,
  };
}
```

The Settings sheet serializes this with `JSON.stringify` and triggers a `.json` file download.

**Concrete example export file:**

```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-06-28T10:15:30.000Z",
  "shops": [
    {
      "id": "8f1a2b3c-0d4e-4f56-9a7b-1c2d3e4f5a6b",
      "name": "Sharma General Store",
      "createdAt": "2026-04-15T09:00:00.000Z",
      "transactions": [
        {
          "id": "11111111-2222-4333-8444-555566667777",
          "type": "DEBIT",
          "amount": 300000,
          "date": "2026-04-15",
          "createdAt": "2026-04-15T09:01:00.000Z"
        },
        {
          "id": "aaaaaaaa-bbbb-4ccc-8ddd-eeeeffff0000",
          "type": "SETTLEMENT",
          "amount": 350000,
          "date": "2026-04-20",
          "createdAt": "2026-04-20T18:30:00.000Z"
        },
        {
          "id": "99998888-7777-4666-8555-444433332222",
          "type": "DEBIT",
          "amount": 200000,
          "date": "2026-04-25",
          "createdAt": "2026-04-25T11:00:00.000Z"
        }
      ]
    }
  ]
}
```

(Amounts are paise: `300000` = ₹3,000.00, `350000` = ₹3,500.00, `200000` = ₹2,000.00. This is exactly the first row of the proof table; current balance = `350000 − 300000 − 200000 = −150000` = `Dr ₹1,500.00`.)

### 8.2 Import — Additive Union by ID

Import is **purely additive**: it **never overwrites and never deletes**.

**Numbered algorithm:**

1. **Parse + validate** the picked file as JSON; reject on bad schema/`schemaVersion` with an error message.
2. **For each imported shop:**
   - If its `id` does **not** exist locally → **add the whole shop** (with all its transactions).
   - If its `id` **exists** locally → **keep the local shop** (local `name` retained, not overwritten) and **merge transactions**: for each imported transaction, **add it only if its `id` is not already present locally**; **skip** ids that already exist (keep the local copy, never overwrite).
3. **Result** = the union of both datasets; all existing entries are preserved as-is.

**Implication (intentional):** edits made on one device do **not** propagate to another via import, because import is purely additive. This is accepted by design.

```typescript
// src/lib/importExport.ts

/** Additive union by id. Returns the merged AppData; never mutates inputs. */
export function mergeImport(local: AppData, imported: ExportDocument): AppData {
  const shopsById = new Map<string, Shop>(local.shops.map((s) => [s.id, s]));

  for (const inShop of imported.shops) {
    const existing = shopsById.get(inShop.id);

    if (!existing) {
      // New shop -> add wholesale (deep copy to avoid aliasing the import doc).
      shopsById.set(inShop.id, {
        ...inShop,
        transactions: [...inShop.transactions],
      });
      continue;
    }

    // Existing shop -> keep local (name included); merge new transactions only.
    const seen = new Set(existing.transactions.map((t) => t.id));
    const merged = [...existing.transactions];
    for (const inTx of inShop.transactions) {
      if (!seen.has(inTx.id)) {
        merged.push(inTx);
        seen.add(inTx.id);
      }
      // else: id already present -> SKIP (never overwrite local).
    }
    shopsById.set(inShop.id, { ...existing, transactions: merged });
  }

  return { schemaVersion: SCHEMA_VERSION, shops: [...shopsById.values()] };
}
```

> The merge preserves whatever the local shop already had (including its `name` and any locally-edited transactions); imported items only ever **add** previously-unseen ids.

### 8.3 Reset

Reset shows a **destructive confirm dialog** first (irreversible), then **clears the localStorage key** and sets state to the **empty `AppData`**.

---

## 9. State Management

State lives in `src/store/`. The single `AppData` object is held in a reducer, exposed via Context, persisted with an effect, and read through selectors.

### 9.1 Store Shape

```typescript
// src/store/AppDataProvider.tsx (types)
interface AppDataState {
  data: AppData;     // the live document
  mounted: boolean;  // hydration guard; false until localStorage has been read
}
```

### 9.2 Actions

Exposed by `useAppData()` (`src/store/useAppData.ts`). Each maps to a pure reducer transition over `AppData`:

| Action | Effect |
| --- | --- |
| `addShop(name)` | Append a `Shop` with fresh UUID, trimmed name, `createdAt = now`, empty `transactions`. |
| `renameShop(shopId, name)` | Replace `name` (trimmed, validated). |
| `deleteShop(shopId)` | Remove the shop (after confirm dialog). |
| `addEntry(shopId, amountPaise, date)` | Append a `DEBIT` (fresh UUID, `createdAt = now`). |
| `editEntry(shopId, txId, amountPaise, date)` | Update a DEBIT's amount + date. |
| `deleteEntry(shopId, txId)` | Remove a DEBIT. |
| `addSettlement(shopId, amountPaise)` | Append a `SETTLEMENT` (fresh UUID, **`date = today`**, `createdAt = now`). |
| `editSettlement(shopId, txId, amountPaise, date)` | Update a SETTLEMENT's paid amount + date (`max = today`). |
| `deleteSettlement(shopId, txId)` | Remove a SETTLEMENT. |
| `importData(doc)` | Apply `mergeImport`. |
| `reset()` | Replace with `EMPTY_APP_DATA` and clear storage. |

```typescript
// src/store/AppDataProvider.tsx (reducer sketch)
type Action =
  | { kind: "HYDRATE"; data: AppData }
  | { kind: "ADD_SHOP"; name: string }
  | { kind: "RENAME_SHOP"; shopId: string; name: string }
  | { kind: "DELETE_SHOP"; shopId: string }
  | { kind: "ADD_ENTRY"; shopId: string; amount: number; date: string }
  | { kind: "EDIT_ENTRY"; shopId: string; txId: string; amount: number; date: string }
  | { kind: "DELETE_ENTRY"; shopId: string; txId: string }
  | { kind: "ADD_SETTLEMENT"; shopId: string; amount: number }
  | { kind: "EDIT_SETTLEMENT"; shopId: string; txId: string; amount: number; date: string }
  | { kind: "DELETE_SETTLEMENT"; shopId: string; txId: string }
  | { kind: "IMPORT"; doc: ExportDocument }
  | { kind: "RESET" };
```

Every mutation produces a new `AppData` (no in-place mutation), which keeps the reducer pure and lets the persistence effect detect changes by reference.

### 9.3 Persistence Effect

After hydration, any change to `data` is written back to `localStorage`:

```typescript
// inside AppDataProvider
useEffect(() => {
  if (!state.mounted) return;        // do not persist before hydration
  saveAppData(state.data);
}, [state.data, state.mounted]);
```

The guard prevents the very first render (empty `AppData`, pre-hydration) from clobbering existing stored data.

### 9.4 Hydration / Mounted Guard

```typescript
// inside AppDataProvider
const [state, dispatch] = useReducer(reducer, { data: EMPTY_APP_DATA, mounted: false });

useEffect(() => {
  // Runs only on the client, after first paint.
  dispatch({ kind: "HYDRATE", data: loadAppData() });
}, []);
```

The reducer's `HYDRATE` sets `data` and flips `mounted = true`. Consumers render a neutral shell while `mounted === false`, then the real UI once hydrated. This is what avoids the SSR hydration mismatch described in [§1.1](#11-deployment-model).

### 9.5 Selectors

`src/store/selectors.ts` wraps the pure `ledger.ts` functions for component use:

```typescript
// src/store/selectors.ts
export const selectShop = (data: AppData, id: string): Shop | undefined =>
  data.shops.find((s) => s.id === id);

export const selectBalance = (shop: Shop) => balance(shop);
export const selectSettleBreakdown = (shop: Shop) => settleBreakdown(shop);
export const selectGroupedTransactions = (shop: Shop) => groupByDate(shop);
```

Because derivations are pure functions over a small array, they are cheap to recompute on every render; memoization is optional, not required.

---

## 10. Routing, Error / Empty States, Performance, Testing, Tooling, Deployment

### 10.1 Routing

| Route | Component | Behavior |
| --- | --- | --- |
| `/` | `app/page.tsx` (Dashboard) | Shop cards + bottom-left add-shop FAB; "Settings" text link in the top bar. |
| `/shop/[id]` | `app/shop/[id]/page.tsx` (Shop) | Client reads the shop from the store **by id**; if missing, show **not-found / redirect to dashboard**. No `generateStaticParams` (not a static export). |

### 10.2 Error & Empty States

- **Dashboard with no shops:** empty state prompting the user to add a shop.
- **Shop with zero transactions:** small placeholder ("no entries been made yet" style). This is the empty-**shop** state, not a per-calendar-day placeholder.
- **Missing shop id on `/shop/[id]`:** treat as not-found and redirect to the dashboard.
- **Corrupt / invalid stored JSON:** `loadAppData()` falls back to empty `AppData` (no crash).
- **Invalid import file:** rejected with an explicit error message; local data untouched.
- **New shop:** displays `Cr ₹0.00` (green) since `B = 0`.

### 10.3 Performance

- All data is **local**; there is no network on any interaction after the initial load (the app works **offline**).
- Derivations (`balance`, `settleBreakdown`, `groupByDate`) are **O(transactions)** per shop — trivially small for personal use.
- `formatMoney`/`formatDateHeading` are O(1) per row.
- Mobile-first, large tap targets, lucide-react icons; no heavy runtime libraries.

### 10.4 Testing Strategy

Vitest. Pure functions in `src/lib/` carry the business risk and get exhaustive coverage. Tests are colocated as `*.test.ts` next to the lib files (or under `tests/`).

**`money.test.ts`**
- `rupeesToPaise` / `paiseToRupees` round-trip; `Math.round` neutralizes float noise (e.g. `rupeesToPaise(0.1 + 0.2)` === `30`).
- `parseAmountToPaise`: accepts `"1500"`, `"1500.5"`, `"1,500.50"`; rejects `""`, `"-5"`, `"0"`, `"1.234"`, `"abc"`.
- `formatMoney`: `0 → "₹0.00"`, `150000 → "₹1,500.00"`, `100000000 → "₹1,000,000.00"`, negative magnitude handled.

**`ledger.test.ts`**
- `balance`: empty shop → `0`; mixed DEBIT/SETTLEMENT; order-independence.
- `lastSettlement`: none → `null`; correct pick by `(date, createdAt)` including same-date tiebreak.
- `settleBreakdown`: **all three proof-table rows** asserted exactly (`creditApplied`, `grossOwed`, `toPay`), plus the invariant `grossOwed - creditApplied === toPay === |B|`; covers **partial**, **exact**, and **over** payment histories; no-prior-settlement → `creditApplied === 0`.
- Settlement-row text: overpayment → `"Paid … - Cr …"`; partial → `"Paid … - still owe …"`.
- `groupByDate`: groups newest-date-first; within a group ascending by `createdAt`.

**`importExport.test.ts`**
- `mergeImport`: new shop added wholesale; existing shop keeps **local name**; transactions union by id; **existing ids skipped, never overwritten**; deep-copy (no aliasing of the import doc).

**`validation.test.ts`**
- amount `> 0`, date `<= today`, shop name non-empty (trim), `isValidAppData` schema acceptance/rejection.

### 10.5 Tooling & Scripts

`package.json` scripts:

| Script | Command | Purpose |
| --- | --- | --- |
| `dev` | `next dev` | Local development server. |
| `build` | `next build` | Production build (standard, not static export). |
| `start` | `next start` | Run the production build locally. |
| `lint` | `eslint .` | ESLint (flat config). `next lint` was removed in Next 16. |
| `typecheck` | `tsc --noEmit` | Type-check without emitting. |
| `format` | `prettier --write .` | Prettier. |
| `test` | `vitest run` | Run the unit suite once (CI). |
| `test:watch` | `vitest` | Watch mode during development. |

Config files (as emitted by `create-next-app` + our additions): `next.config.ts` (standard, **no `output: "export"`**), `postcss.config.mjs` (`@tailwindcss/postcss` plugin), `tsconfig.json` (`"strict": true`), `eslint.config.mjs` (flat config extending `eslint-config-next`), `next-env.d.ts`, and a Prettier config. **There is no `tailwind.config.ts`** — Tailwind v4 is configured CSS-first inside `src/app/globals.css` (`@import "tailwindcss";` + `@theme`).

### 10.6 Vercel Deployment

1. Push the repository to GitHub/GitLab/Bitbucket.
2. In Vercel, **Import Project** and select the repo. Vercel auto-detects Next.js.
3. **No environment variables** are required and **none should be added**.
4. Keep the **default build command** (`next build`) and **output**; do **not** enable static export.
5. Deploy. The dynamic route `/shop/[id]` is served by the standard Next.js runtime — no `generateStaticParams` needed.
6. Subsequent pushes to the production branch trigger automatic redeploys.

All application data remains in the user's browser `localStorage` on their device; nothing is transmitted to Vercel or any backend.

---

## 11. Out of Scope (Non-Goals)

No authentication, no cloud sync/backend, no multi-currency, no notes/categories/attachments on transactions, no analytics/charts, no notifications. A dataset belongs to a single device; data is moved between devices only via **export/import** (which is additive by design).
