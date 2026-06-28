# Remoney — Architecture

> **Status: LOCKED.** This document is the structural blueprint for Remoney. It is derived directly from, and must remain consistent with, the LOCKED SPECIFICATION BRIEF. It describes *how the code is organized and how data flows*; it does not introduce features, fields, routes, or rules beyond the brief. Every file in the canonical folder structure is documented here.

Remoney is a mobile-first, offline, local-only money manager for tracking debt with shops. It runs as a client-only Single Page Application built on Next.js (App Router). There is no server, no database, no authentication, and no environment variables. The single durable store is the browser's `localStorage` under the key `remoney:appdata:v1`. Everything the user sees — balances, settle breakdowns, grouped transaction logs — is *derived* on demand from one stored ledger.

---

## 1. Architecture Overview

### 1.1 Layered model

Remoney is layered strictly so that data flows in one direction for reads and one direction for writes. The UI never touches `localStorage` directly; the domain library never imports React; the store is the only mediator between them.

```
+-----------------------------------------------------------------------------+
|  LAYER 0 — Next.js App Router shell                                         |
|  src/app/layout.tsx, src/app/page.tsx, src/app/shop/[id]/page.tsx           |
|  Client components only. Provides routing, fonts, viewport, globals.        |
+-----------------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------------+
|  LAYER 1 — UI COMPONENTS                                                    |
|  components/dashboard/*  components/shop/*  components/sheets/*             |
|  components/ui/*                                                            |
|  Pure presentation + local input state. Reads via selectors;               |
|  writes via actions. Never imports storage. Formats money only at edge.    |
+-----------------------------------------------------------------------------+
        |  read (subscribe to derived values)        ^  write (dispatch action)
        v                                            |
+-----------------------------------------------------------------------------+
|  LAYER 2 — STORE / ACTIONS                                                  |
|  store/AppDataProvider.tsx  store/useAppData.ts                            |
|  React Context + useReducer holding AppData in memory.                      |
|  Exposes typed actions. Persists to localStorage via effect. Hydration     |
|  guard prevents SSR mismatch.                                               |
+-----------------------------------------------------------------------------+
        |  derive (pure functions of state)          ^  reduce (pure new state)
        v                                            |
+-----------------------------------------------------------------------------+
|  LAYER 3 — DERIVATIONS / SELECTORS                                          |
|  store/selectors.ts                                                        |
|  Adapts raw AppData into view models (shop balance, settle breakdown,       |
|  date-grouped log). Thin wrappers over lib/ledger. Stateless, memo-able.    |
+-----------------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------------+
|  LAYER 4 — LIB DOMAIN (pure, framework-free)                               |
|  lib/ledger.ts  lib/money.ts  lib/format.ts  lib/validation.ts             |
|  lib/importExport.ts  lib/id.ts  lib/types.ts  lib/constants.ts            |
|  All money math, balance/settle math, ordering, grouping, validation,      |
|  import-merge. No React, no DOM, no storage. The unit-tested core.         |
+-----------------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------------+
|  LAYER 5 — STORAGE ADAPTER                                                  |
|  lib/storage.ts                                                            |
|  load() / save() AppData. Safe parse, schemaVersion check, migrate hook,   |
|  fallback to empty AppData on error. The only module that knows the        |
|  localStorage key exists.                                                   |
+-----------------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------------+
|  LAYER 6 — BROWSER localStorage                                            |
|  key "remoney:appdata:v1" -> JSON.stringify(AppData)                        |
+-----------------------------------------------------------------------------+
```

> **Dependency rule.** Imports point *downward* only. `components/*` may import `store/*`, `lib/*`, `hooks/*`. `store/*` may import `lib/*`. `lib/*` imports only other `lib/*`. Nothing in `lib/*` imports React or the store. This keeps the domain core portable and trivially unit-testable.

### 1.2 Read path

The read path turns the stored ledger into pixels. It is pure and re-runs whenever state changes.

```
localStorage ──load()──> AppData (in Provider memory)
                              |
                              v
                    selectors.ts (derive)
                              |
            +-----------------+------------------+
            v                 v                  v
     selectShopBalance  selectSettle       selectGrouped
            |            Breakdown          Transactions
            v                 v                  v
     ledger.balance()  ledger.settle    ledger.groupByDate()
                        Breakdown()      + format.formatDateHeading()
            |                 |                  |
            +-----------------+------------------+
                              v
                  view models (numbers + flags)
                              |
                              v
              UI components render; Money.tsx applies
              money.formatMoney() ONLY at the display edge
```

Key property: **balances and breakdowns are never read from storage** — they do not exist in storage. They are computed every render from the transaction list. Because the dataset per shop is tiny, these `O(transactions)` derivations are effectively free.

### 1.3 Write path

The write path is the only way state changes. A component dispatches a typed action; the reducer produces a new immutable `AppData`; an effect persists it; React re-renders, which re-runs the read path.

```
User gesture in a component (e.g. confirm new entry)
        |
        v
useAppData() action  e.g. addEntry(shopId, { amountPaise, date })
        |
        v
dispatch({ type: "ADD_ENTRY", ... })  ──> reducer (pure)
        |                                      |
        |                          builds new Transaction:
        |                          id = lib/id.uuid()
        |                          type = "DEBIT"
        |                          amount in paise (>0)
        |                          createdAt = ISO now
        |                                      |
        v                                      v
new AppData (immutable copy, transaction appended)
        |
        v
persistence effect ──> lib/storage.save(appData)
        |                       |
        |                       v
        |             localStorage["remoney:appdata:v1"] = JSON.stringify(appData)
        v
React re-render ──> read path re-derives ──> UI reflects new balance/log
```

There are **no denormalized totals to keep in sync**. A write only ever appends/edits/removes a `Transaction` or mutates a `Shop` name/membership. Every downstream number is recomputed, so retroactive edits (e.g. editing an old settlement) are automatically consistent.

---

## 2. Module + Sub-module Breakdown

This section describes each module's responsibility and the responsibility of **every** file in the canonical structure.

### 2.1 `src/app/` — App Router routes

The route shell. All pages are **client components** (`"use client"`) because all state hydrates from `localStorage` after mount. The app is *not* a static export, so the dynamic route needs no `generateStaticParams`.

| File | Responsibility |
|------|----------------|
| `app/layout.tsx` | Root layout. Mounts `AppDataProvider`, declares fonts, sets the mobile `viewport` meta, imports `globals.css`. Wraps every route so the store and styles are always present. |
| `app/globals.css` | Tailwind directives (`@tailwind base/components/utilities`) plus minimal base styles (background, default text color, safe-area padding for mobile). |
| `app/page.tsx` | The Dashboard route `"/"`. Client component. Renders `DashboardHeader`, `ShopList`, `AddShopButton`. Mounts `SettingsSheet`. Reads the shop list from the store. |
| `app/shop/[id]/page.tsx` | The Shop route `"/shop/:id"`. Client component. Resolves `id` from route params, looks the shop up in the store; if missing, shows not-found / redirects to `/`. Renders `ShopHeader`, `TransactionList`, `AddEntryButton`. Mounts `EntrySheet` and `SettleSheet`. |

### 2.2 `src/components/dashboard/` — Dashboard UI

Responsibility: present the list of shops and the add-shop affordance for the `"/"` route.

| File | Responsibility |
|------|----------------|
| `DashboardHeader.tsx` | Top bar. Renders the app name **"Remoney"** on the left and a small **text-style** "Settings" link on the right (a text link, *not* a button) that opens the Settings sheet. |
| `ShopList.tsx` | Maps the shops array to `ShopCard`s. Renders the dashboard **empty state** when there are no shops. |
| `ShopCard.tsx` | One wallet-style card. Shows the shop name and its balance badge via `Money.tsx`: green `Cr ₹{B}` or red `Dr ₹{|B|}`. Tapping the card navigates to `/shop/{id}`. Reads `selectShopBalance(shopId)`. |
| `AddShopButton.tsx` | Bottom-**left** circular plus FAB. Tapping opens the add-shop input (name field). On create, calls `addShop(name)` which creates a `Shop` with a fresh UUID and empty `transactions`. Enforces non-empty trimmed name. |

### 2.3 `src/components/shop/` — Shop UI

Responsibility: present one shop's transaction log and the settle/new-entry affordances for the `"/shop/:id"` route.

| File | Responsibility |
|------|----------------|
| `ShopHeader.tsx` | Header for a shop. Shop name as the title on the left; a **red "Settle" button** on the right, **disabled when `B >= 0`**; an overflow (kebab) menu with **"Rename"** and **"Delete shop"** (delete opens a destructive `ConfirmDialog`; rename edits the name via `renameShop`). Reads `selectShopBalance(shopId)` to drive the disabled state. |
| `TransactionList.tsx` | Reads `selectGroupedTransactions(shopId)` and renders the ordered list of `DateGroup`s (newest date first). Renders the **empty-shop placeholder** ("no entries been made yet" style) when the shop has zero transactions. |
| `DateGroup.tsx` | One date group. Renders a small **green date heading** formatted as `"15 apr, 2026"` (day no leading zero, lowercase 3-letter month, comma, year) and, beneath it, that date's rows in chronological (`createdAt` ascending) order. |
| `TransactionRow.tsx` | Renders one DEBIT or SETTLEMENT row. A DEBIT shows only the amount. A SETTLEMENT shows `Paid ₹{amount} - Cr ₹{credit}` when that payment left `B > 0`, or `Paid ₹{amount} - still owe ₹{remaining}` when it was partial (`B < 0` right after it). Tapping the row opens `EntrySheet` in **edit mode** for that transaction. |
| `AddEntryButton.tsx` | Bottom circular plus FAB. Tapping opens `EntrySheet` in **new** mode to create a DEBIT. |

### 2.4 `src/components/sheets/` — Bottom sheets

Responsibility: modal flows that overlay the current route without navigating away. All use the shared `BottomSheet` shell and `hooks/useBottomSheet`.

| File | Responsibility |
|------|----------------|
| `BottomSheet.tsx` | Reusable half / near-full-screen modal shell. Provides the backdrop, the panel, and a clearly tappable **close "X" at the top-right**. Body-scroll-lock via `useBottomSheet`. Does not navigate. |
| `EntrySheet.tsx` | Handles **new** and **edit** of a DEBIT entry. Amount input + date input (default today; editable; `max = today`, future dates rejected). Blue **"Confirm"** button. In edit mode, fields are prefilled and a red **"Delete"** action removes the entry. Calls `addEntry` / `editEntry` / `deleteEntry`. Also used for editing a SETTLEMENT (paid amount + date, max today; delete) since settlement rows are tappable. |
| `SettleSheet.tsx` | The settle flow. Shows **`grossOwed` in RED** at top; **`creditApplied` in GREEN** below it *only if `creditApplied > 0`*; an `<hr>`; then the editable **"To pay"** input prefilled with `toPay` (net). Red **"Confirm"** button validates entered amount `> 0`. Reachable only when `B < 0`. On confirm, calls `addSettlement` dated **today**. Reads `selectSettleBreakdown(shopId)`. |
| `SettingsSheet.tsx` | Exactly three actions: **Reset**, **Import**, **Export**. Export calls `buildExport` and downloads JSON. Import lets the user pick a JSON file, validates it, and calls `importData` (additive union). Reset shows a destructive `ConfirmDialog`, then calls `reset` to wipe all data. |

### 2.5 `src/components/ui/` — Shared primitives

Responsibility: reusable, presentation-only building blocks. No domain logic beyond formatting at the edge.

| File | Responsibility |
|------|----------------|
| `Button.tsx` | Generic button (variants for primary/blue confirm, red destructive/settle, etc.). Large tap targets. |
| `IconButton.tsx` | Icon-only tappable control (e.g. the kebab/overflow, the close X), using `lucide-react` icons. |
| `Fab.tsx` | Circular floating action button used by `AddShopButton` (bottom-left) and `AddEntryButton` (bottom). |
| `AmountInput.tsx` | Numeric money input. Accepts rupee input from the user; the owning sheet converts to paise via `lib/money` before dispatching. Enforces `> 0`. |
| `DateInput.tsx` | Date picker bound to `YYYY-MM-DD`. Enforces `max = today` (no future dates). |
| `Money.tsx` | Renders a Cr/Dr **colored** amount. Given a signed balance (paise) or a labeled amount, applies the display rule (`B >= 0` -> green `Cr`, `B < 0` -> red `Dr`) and formats via `lib/money.formatMoney`. **This is the money formatting boundary on the read side.** |
| `ConfirmDialog.tsx` | Reusable destructive-confirm dialog (used by Reset and Delete shop). Forces an explicit confirmation for irreversible actions. |
| Sheet primitives | Low-level pieces shared by `BottomSheet` (backdrop, panel, drag/handle affordances) so all sheets look and behave identically. |

### 2.6 `src/lib/` — Domain core (pure, framework-free)

Responsibility: all business logic and pure helpers. No React, no DOM, no storage access except `storage.ts`. This is the unit-tested heart of the app.

| File | Responsibility |
|------|----------------|
| `types.ts` | Domain types: `AppData`, `Shop`, `Transaction`, `TransactionType` (`"DEBIT" \| "SETTLEMENT"`). The canonical field names. |
| `constants.ts` | `STORAGE_KEY = "remoney:appdata:v1"`, `SCHEMA_VERSION = 1`, currency config (rupee glyph, 2 decimals, default standard thousands grouping). |
| `id.ts` | `uuid()` — thin wrapper around `crypto.randomUUID()`. Single source of ID generation. |
| `money.ts` | Money conversions and formatting: paise↔rupees, `formatMoney` (rupee glyph, 2 decimals, thousands grouping), and parse from user input. Integer-paise arithmetic only — never floats. |
| `format.ts` | Display formatting helpers: `formatDateHeading` producing `"15 apr, 2026"`, plus grouping helpers used by the log. |
| `ledger.ts` | The ledger math: `balance()`, `settleBreakdown()`, ordering rules `(date asc, createdAt asc)`, `lastSettlement()`, and `groupByDate()`. The proof/replay cases are validated against this module. |
| `validation.ts` | Validators: amount (`> 0`, numeric), date (`<= today`), shop name (non-empty trimmed), settle entered amount (`> 0`), and import schema/`schemaVersion` validation. |
| `storage.ts` | The storage adapter: `load()` / `save()` `AppData`, safe parse, `schemaVersion` check, `migrate` hook for future formats, fallback to empty `AppData` on any error. Only module that references the `localStorage` key. |
| `importExport.ts` | `buildExport()` producing `{ schemaVersion, exportedAt, shops }`, and `mergeImport()` implementing the **additive union by id** (never overwrite, never delete). |

### 2.7 `src/store/` — State + actions + derivations

Responsibility: hold `AppData` in memory, expose typed actions, persist to storage, and adapt state into view models.

| File | Responsibility |
|------|----------------|
| `AppDataProvider.tsx` | The store. React Context + `useReducer` holding `AppData`. Persists to `localStorage` via an effect on change. Implements the **hydration/mounted guard**: renders nothing data-dependent until after mount, loading via `lib/storage.load()` to avoid SSR/CSR mismatch. The reducer is pure and produces immutable new state. |
| `useAppData.ts` | Hook exposing `{ state, ...actions }`. Actions: `addShop`, `renameShop`, `deleteShop`, `addEntry`, `editEntry`, `deleteEntry`, `addSettlement`, `editSettlement`, `deleteSettlement`, `importData`, `reset`. Each action builds the right payload (UUIDs, paise, ISO `createdAt`) and dispatches. |
| `selectors.ts` | Pure derivations adapting `AppData` into view models: shop balance, settle breakdown, grouped transactions. Thin wrappers over `lib/ledger` and `lib/format`. No mutation; memo-friendly. |

### 2.8 `src/hooks/` — UI hooks

| File | Responsibility |
|------|----------------|
| `useBottomSheet.ts` | Open/close state plus body-scroll-lock for sheets. Shared by every sheet so the modal interaction (lock background scroll while open, restore on close) is consistent. |

---

## 3. Canonical Folder / File Tree

The structure below is reproduced exactly from the brief.

```
remoney/
  docs/
    requirement.md
    tech.md
    architecture.md
  public/                      (favicon, app icons)
  src/
    app/
      layout.tsx               root layout: providers, fonts, viewport meta (mobile), globals
      globals.css              tailwind directives + base styles
      page.tsx                 Dashboard route "/"
      shop/
        [id]/
          page.tsx             Shop route "/shop/:id"
    components/
      dashboard/
        DashboardHeader.tsx    "Remoney" title + "Settings" text link
        ShopList.tsx           maps shops to cards, empty state
        ShopCard.tsx           wallet-style card + Cr/Dr balance badge
        AddShopButton.tsx      bottom-left circular plus FAB + add-shop input flow
      shop/
        ShopHeader.tsx         title + red Settle button (disabled when B>=0) + overflow (rename/delete)
        TransactionList.tsx    groups transactions by date, renders DateGroup list, empty state
        DateGroup.tsx          green date heading "15 apr, 2026" + its rows
        TransactionRow.tsx     renders a DEBIT or SETTLEMENT row; tap opens edit
        AddEntryButton.tsx     bottom circular plus FAB for new entry
      sheets/
        BottomSheet.tsx        reusable half/near-full modal shell with top-right close X
        EntrySheet.tsx         new + edit entry (amount, date, delete in edit mode, confirm blue)
        SettleSheet.tsx        breakdown (red grossOwed, green creditApplied, hr, editable toPay), confirm red
        SettingsSheet.tsx      Reset / Import / Export actions
      ui/
        Button.tsx, IconButton.tsx, Fab.tsx, AmountInput.tsx, DateInput.tsx,
        Money.tsx (renders Cr/Dr colored amount), ConfirmDialog.tsx, Sheet primitives
    lib/
      types.ts                 AppData, Shop, Transaction, TransactionType
      constants.ts             STORAGE_KEY, SCHEMA_VERSION, currency config
      id.ts                    uuid() wrapper around crypto.randomUUID
      money.ts                 paise<->rupees, formatMoney (rupee glyph, 2dp, grouping), parse
      format.ts                formatDateHeading ("15 apr, 2026"), grouping helpers
      ledger.ts                balance(), settleBreakdown(), ordering, lastSettlement(), groupByDate()
      validation.ts            amount/date/name/settle validators
      storage.ts               load/save AppData, schemaVersion, migrate, safe parse
      importExport.ts          buildExport(), mergeImport() (additive union by id)
    store/
      AppDataProvider.tsx      Context + useReducer + localStorage persistence + hydration guard
      useAppData.ts            hook exposing state + actions (addShop, renameShop, deleteShop,
                               addEntry, editEntry, deleteEntry, addSettlement, editSettlement,
                               deleteSettlement, importData, reset)
      selectors.ts             derive shop balance, settle breakdown, grouped transactions
    hooks/
      useBottomSheet.ts        open/close + body-scroll-lock for sheets
  next.config.ts               standard config (no static export)
  postcss.config.mjs           @tailwindcss/postcss plugin (Tailwind v4)
  eslint.config.mjs            ESLint flat config (extends eslint-config-next)
  tsconfig.json                strict
  next-env.d.ts                Next.js ambient TS types (generated)
  .gitignore
  AGENTS.md / CLAUDE.md        agent guidance (emitted by create-next-app)
  package.json
  README.md
(No tailwind.config.ts — Tailwind v4 is configured CSS-first in src/app/globals.css.)
(Prettier runs with defaults; add an optional .prettierrc to customize.)
(Project bootstrapped via `create-next-app@latest` with --ts --tailwind --eslint --app --src-dir;
 lucide-react / prettier / vitest added on top. src/components, src/lib, src/store, src/hooks are
 created by us — they are NOT part of the scaffold.)
(Money/ledger unit tests colocated as *.test.ts next to lib files, or under a tests/ dir.)
```

### 3.1 Per-file responsibility table (complete)

| Path | Layer | Responsibility |
|------|-------|----------------|
| `docs/requirement.md` | Docs | Product/requirements spec (plain-language, includes proof/replay table). |
| `docs/tech.md` | Docs | Technical spec (includes proof/replay table). |
| `docs/architecture.md` | Docs | This structural blueprint. |
| `public/` | Static | Favicon and app icons. |
| `src/app/layout.tsx` | App shell | Root layout: providers, fonts, mobile viewport meta, globals import. |
| `src/app/globals.css` | App shell | Tailwind v4 entry (`@import "tailwindcss";`) + `@theme` design tokens + base styles. |
| `src/app/page.tsx` | Route | Dashboard route `"/"`. |
| `src/app/shop/[id]/page.tsx` | Route | Shop route `"/shop/:id"`; resolves id, not-found fallback. |
| `src/components/dashboard/DashboardHeader.tsx` | UI | "Remoney" title + "Settings" text link. |
| `src/components/dashboard/ShopList.tsx` | UI | Maps shops to cards; dashboard empty state. |
| `src/components/dashboard/ShopCard.tsx` | UI | Wallet-style card + Cr/Dr balance badge; navigates to shop. |
| `src/components/dashboard/AddShopButton.tsx` | UI | Bottom-left FAB + add-shop input flow. |
| `src/components/shop/ShopHeader.tsx` | UI | Title + red Settle (disabled when `B>=0`) + overflow (rename/delete). |
| `src/components/shop/TransactionList.tsx` | UI | Renders DateGroup list (newest first); empty-shop placeholder. |
| `src/components/shop/DateGroup.tsx` | UI | Green date heading `"15 apr, 2026"` + that date's rows. |
| `src/components/shop/TransactionRow.tsx` | UI | DEBIT / SETTLEMENT row; tap opens edit. |
| `src/components/shop/AddEntryButton.tsx` | UI | Bottom FAB for new entry. |
| `src/components/sheets/BottomSheet.tsx` | UI | Modal shell + top-right close X + scroll lock. |
| `src/components/sheets/EntrySheet.tsx` | UI | New + edit entry (amount, date, delete in edit, blue confirm). |
| `src/components/sheets/SettleSheet.tsx` | UI | Settle breakdown + editable toPay + red confirm. |
| `src/components/sheets/SettingsSheet.tsx` | UI | Reset / Import / Export actions. |
| `src/components/ui/Button.tsx` | UI primitive | Generic button (variants). |
| `src/components/ui/IconButton.tsx` | UI primitive | Icon-only control (lucide-react). |
| `src/components/ui/Fab.tsx` | UI primitive | Circular floating action button. |
| `src/components/ui/AmountInput.tsx` | UI primitive | Money input (rupees in; converted to paise by caller). |
| `src/components/ui/DateInput.tsx` | UI primitive | Date input bound to `YYYY-MM-DD`, max today. |
| `src/components/ui/Money.tsx` | UI primitive | Renders Cr/Dr colored amount (read-side money boundary). |
| `src/components/ui/ConfirmDialog.tsx` | UI primitive | Destructive confirm dialog. |
| `src/components/ui/` Sheet primitives | UI primitive | Shared backdrop/panel pieces for sheets. |
| `src/lib/types.ts` | Domain | `AppData`, `Shop`, `Transaction`, `TransactionType`. |
| `src/lib/constants.ts` | Domain | `STORAGE_KEY`, `SCHEMA_VERSION`, currency config. |
| `src/lib/id.ts` | Domain | `uuid()` over `crypto.randomUUID()`. |
| `src/lib/money.ts` | Domain | paise↔rupees, `formatMoney`, parse. |
| `src/lib/format.ts` | Domain | `formatDateHeading`, grouping helpers. |
| `src/lib/ledger.ts` | Domain | `balance()`, `settleBreakdown()`, ordering, `lastSettlement()`, `groupByDate()`. |
| `src/lib/validation.ts` | Domain | amount/date/name/settle + import validators. |
| `src/lib/storage.ts` | Storage adapter | `load`/`save`, schemaVersion, migrate, safe parse. |
| `src/lib/importExport.ts` | Domain | `buildExport()`, `mergeImport()` (additive union by id). |
| `src/store/AppDataProvider.tsx` | Store | Context + useReducer + persistence + hydration guard. |
| `src/store/useAppData.ts` | Store | Hook exposing state + all actions. |
| `src/store/selectors.ts` | Derivations | balance / settle breakdown / grouped transactions. |
| `src/hooks/useBottomSheet.ts` | Hook | Open/close + body-scroll-lock. |
| `next.config.ts` | Config | Standard config (no static export). |
| `postcss.config.mjs` | Config | PostCSS pipeline via the `@tailwindcss/postcss` plugin (Tailwind v4). No `tailwind.config.ts` — theme is CSS-first in `globals.css`. |
| `eslint.config.mjs` | Config | ESLint flat config extending `eslint-config-next`. |
| `tsconfig.json` | Config | TypeScript strict mode. |
| `next-env.d.ts` | Config | Next.js ambient TS types (generated; do not edit). |
| `.prettierrc` (optional) | Config | Prettier config; absent by default (Prettier uses its defaults). |
| `package.json` | Config | Dependencies + scripts. |
| `AGENTS.md` / `CLAUDE.md` | Docs | Agent guidance emitted by `create-next-app`. |
| `README.md` | Docs | Project readme. |
| `*.test.ts` (next to lib files or under `tests/`) | Tests | Money/ledger unit tests (balance, settle exact/partial/over, formatting, import merge). |

---

## 4. Component Hierarchy / Render Tree

### 4.1 Dashboard route `/`

```
app/layout.tsx
└── AppDataProvider                         (store; hydration guard)
    └── app/page.tsx  ("use client")        Dashboard
        ├── DashboardHeader
        │     ├── "Remoney" (title)
        │     └── "Settings" text link ──────────► opens SettingsSheet
        ├── ShopList
        │     ├── (empty state)  when shops.length === 0
        │     └── ShopCard  × N
        │           └── Money.tsx
        │                 reads selectShopBalance(shop.id)
        │                 renders green "Cr ₹{B}" / red "Dr ₹{|B|}"
        │           (tap) ──────────────────────► router.push("/shop/{id}")
        ├── AddShopButton (Fab, bottom-LEFT)
        │     └── add-shop name input ──► addShop(name)
        └── SettingsSheet   (mounted here; visible only when opened)
              └── BottomSheet
                    ├── Export  ──► buildExport() + download
                    ├── Import  ──► file pick + validate ──► importData(parsed)
                    └── Reset   ──► ConfirmDialog ──► reset()
```

**Selectors read on Dashboard:** each `ShopCard` reads `selectShopBalance(shopId)` (via `Money.tsx`). `ShopList` reads `state.shops` for the list/empty state.

### 4.2 Shop route `/shop/[id]`

```
app/layout.tsx
└── AppDataProvider
    └── app/shop/[id]/page.tsx  ("use client")   Shop
        │   resolves id from params; if shop missing -> not-found / redirect "/"
        ├── ShopHeader
        │     ├── shop name (title)
        │     ├── red "Settle" button
        │     │      reads selectShopBalance(shopId)
        │     │      disabled when B >= 0
        │     │      (tap) ─────────────────────► opens SettleSheet
        │     └── overflow / kebab (IconButton)
        │            ├── "Rename"      ──► renameShop(id, name)
        │            └── "Delete shop" ──► ConfirmDialog ──► deleteShop(id) ──► back to "/"
        ├── TransactionList
        │     reads selectGroupedTransactions(shopId)
        │     ├── (empty-shop placeholder)  when transactions.length === 0
        │     └── DateGroup  × M   (newest date first)
        │           ├── green date heading "15 apr, 2026"  (format.formatDateHeading)
        │           └── TransactionRow  × K   (createdAt ascending within the date)
        │                 ├── DEBIT      -> amount only (Money.tsx)
        │                 └── SETTLEMENT -> "Paid ₹X - Cr ₹Y"  OR  "Paid ₹X - still owe ₹Z"
        │                 (tap) ──────────────────► opens EntrySheet (edit mode)
        ├── AddEntryButton (Fab, bottom)
        │     (tap) ─────────────────────────────► opens EntrySheet (new mode)
        ├── EntrySheet   (mounted here; visible only when opened)
        │     └── BottomSheet
        │           ├── AmountInput
        │           ├── DateInput (max today)
        │           ├── [edit mode] red "Delete" ──► deleteEntry / deleteSettlement
        │           └── blue "Confirm" ──► addEntry / editEntry / editSettlement
        └── SettleSheet  (mounted here; visible only when opened)
              └── BottomSheet
                    reads selectSettleBreakdown(shopId)
                    ├── grossOwed (RED)
                    ├── creditApplied (GREEN)   shown only if creditApplied > 0
                    ├── <hr>
                    ├── "To pay" AmountInput  prefilled with toPay
                    └── red "Confirm" (validate > 0) ──► addSettlement(today)
```

**Selectors read on Shop:** `ShopHeader` and `SettleSheet`'s gating read `selectShopBalance(shopId)`; `TransactionList` reads `selectGroupedTransactions(shopId)`; `SettleSheet` reads `selectSettleBreakdown(shopId)`. Each `TransactionRow` derives its own "Cr / still owe" sub-line from the running balance up to and including that row (computed in the ledger/selector layer, not stored).

> **Where sheets mount.** Sheets are mounted at the route page level (Dashboard mounts `SettingsSheet`; Shop mounts `EntrySheet` and `SettleSheet`) and toggled via `useBottomSheet`. They overlay the current screen and **never navigate away** — the underlying route remains in place behind the backdrop.

---

## 5. Data Flow Through the Mutation Pipeline

Every mutation follows the same pipeline: **component → action → reducer → storage → re-derive → re-render.** No denormalized total is ever written.

### 5.1 New Entry (DEBIT)

```
AddEntryButton/EntsrySheet (confirm)
  -> useAppData.addEntry(shopId, { amountPaise, date })
  -> dispatch({ type:"ADD_ENTRY", shopId, tx:{ id:uuid(), type:"DEBIT",
                amount:amountPaise, date, createdAt: nowISO() } })
  -> reducer: shop.transactions = [...transactions, tx]   (immutable copy)
  -> persistence effect: storage.save(appData)            (localStorage written)
  -> selectors re-derive balance + grouped log
  -> React re-renders ShopHeader (Settle enable/disable), TransactionList
```

### 5.2 Edit (DEBIT or SETTLEMENT)

```
TransactionRow (tap) -> EntrySheet opens in edit mode, prefilled
  -> useAppData.editEntry / editSettlement(shopId, txId, { amountPaise, date })
  -> dispatch({ type:"EDIT_TX", shopId, txId, patch:{ amount, date } })
  -> reducer: replaces matching tx in place (immutable map); id + createdAt preserved
  -> storage.save(appData)
  -> re-derive: balance, every later SETTLEMENT row's "Cr / still owe" sub-line,
                grouping (date may have changed)
  -> re-render. Retroactive change is automatically consistent (all derived).
```

### 5.3 Delete (DEBIT or SETTLEMENT)

```
EntrySheet (edit mode) -> red "Delete"
  -> useAppData.deleteEntry / deleteSettlement(shopId, txId)
  -> dispatch({ type:"DELETE_TX", shopId, txId })
  -> reducer: shop.transactions = transactions.filter(t => t.id !== txId)
  -> storage.save(appData)
  -> re-derive balance + grouped log (later balances shift; acceptable & automatic)
  -> re-render
```

### 5.4 Settle (SETTLEMENT) — sequence diagram

The Settle sheet is reachable only when `B < 0`. The breakdown is computed by `selectSettleBreakdown` over `lib/ledger.settleBreakdown`, and it always reconciles to balance by construction.

```
 User        SettleSheet        useAppData        reducer         storage        selectors        UI
  |               |                 |                |               |               |             |
  | tap Settle    |                 |                |               |               |             |
  |-------------->| open (B<0)      |                |               |               |             |
  |               |--- read selectSettleBreakdown(shopId) ------------------------->|             |
  |               |   returns { grossOwed(RED), creditApplied(GREEN), toPay(NET) }  |             |
  |               |<-----------------------------------------------------------------|            |
  |               | render: RED grossOwed; GREEN creditApplied (iff >0); hr;         |             |
  |               |         "To pay" input PREFILLED with toPay (editable, > 0)      |             |
  |  edit amount  |                 |                |               |               |             |
  |-------------->| (partial < toPay | exact = toPay | over > toPay all ALLOWED)     |             |
  |  tap Confirm  |                 |                |               |               |             |
  |-------------->| validate amount > 0              |               |               |             |
  |               |--- addSettlement(shopId, amountPaise) --------->|               |             |
  |               |                 | dispatch ADD_SETTLEMENT       |               |             |
  |               |                 |   tx = { id:uuid(),           |               |             |
  |               |                 |          type:"SETTLEMENT",   |               |             |
  |               |                 |          amount:amountPaise,  |               |             |
  |               |                 |          date: TODAY (fixed), |               |             |
  |               |                 |          createdAt: nowISO()} |               |             |
  |               |                 |-------------->| append tx     |               |             |
  |               |                 |               | new AppData   |               |             |
  |               |                 |               |-------------->| save()        |             |
  |               |                 |               |               | localStorage  |             |
  |               |                 |               |               |-------------->|             |
  |               | sheet CLOSES    |                |               | re-derive balance, log     |
  |               |---------------->|                |               |--------------------------->|
  |               |                 |                |               |        re-render            |
  |<-----------------------------------------------------------------------------------------------|
  |   New balance shown: B becomes 0 (exact), stays negative (partial), or positive (over).        |
```

**Settle math recap (from the brief), with `B = balance(shop)` at open:**

- `creditApplied (GREEN) = max(0, balance up to AND INCLUDING the most recent SETTLEMENT)` — the overpayment the last settlement left; `0` if no prior settlement or the last one was partial.
- `grossOwed (RED) = |B| + creditApplied`.
- `toPay (NET) = |B|` (equals `grossOwed - creditApplied` by construction).

The "To pay" input is prefilled with `toPay` and editable to any amount `> 0`: paying less is a **partial** payment (leftover stays as debt, `B` stays negative); paying exactly clears it (`B = 0`); paying more is an **overpayment** (`B` becomes positive credit).

**Proof / replay (amounts in rupees for readability; stored as paise):**

| Sequence | B_now | green (creditApplied) | red = \|B\| + green (grossOwed) | net = toPay |
|----------|-------|-----------------------|--------------------------------|-------------|
| owe 3000, pay 3500, owe 2000 | -1500 | 500 | 2000 | 1500 |
| owe 3000, pay 1000 (partial), owe 500 | -2500 | 0 | 2500 | 2500 |
| owe 3000, pay 3500, owe 1000 | -500 | 500 | 1000 | 500 |

> **Sign note.** `B_now` here is the **signed** balance (negative means the user owes). The settle screen's "To pay" / net is the **amount owed**, i.e. the magnitude `|B|` (1,500 / 2,500 / 500). So where the plain-language `requirement.md` lists "You owe now: 1,500 / 2,500 / 500" it is showing `|B|` — the same figures as this table's `net = toPay` column, just unsigned. There is no contradiction: this doc and `tech.md` keep `B_now` signed, while the displayed figure is the magnitude owed.

---

## 6. State / Derivation Contract

### 6.1 What is stored vs what is derived

| Concern | Stored? | Where it lives | How it is produced |
|--------|---------|----------------|--------------------|
| `AppData` (`schemaVersion`, `shops`) | **Stored** | `localStorage["remoney:appdata:v1"]` | Written by `storage.save`. |
| `Shop` (`id`, `name`, `createdAt`, `transactions`) | **Stored** | Inside `AppData` | Mutated by `addShop`/`renameShop`/`deleteShop`. |
| `Transaction` (`id`, `type`, `amount` in paise, `date`, `createdAt`) | **Stored** | Inside `Shop.transactions` | Mutated by entry/settlement actions. |
| **Balance `B`** | **Derived** | `selectors.selectShopBalance` → `ledger.balance` | `sum(SETTLEMENT.amount) - sum(DEBIT.amount)`. |
| **Cr / Dr label + color** | **Derived** | `Money.tsx` via display rule | `B >= 0` → green `Cr ₹{B}`; `B < 0` → red `Dr ₹{|B|}`. |
| **Settle breakdown** (`grossOwed`, `creditApplied`, `toPay`) | **Derived** | `selectors.selectSettleBreakdown` → `ledger.settleBreakdown` | Computed from the ledger at open time. |
| **Per-row "Cr / still owe" sub-line** | **Derived** | `ledger` running balance up to & including the row | Re-evaluated every render. |
| **Date-grouped, ordered log** | **Derived** | `selectors.selectGroupedTransactions` → `ledger.groupByDate` | Grouped by date (newest first), rows chronological within group. |
| **Most recent settlement** | **Derived** | `ledger.lastSettlement` | SETTLEMENT with greatest `(date, createdAt)`. |

### 6.2 Why nothing is denormalized

The ledger is the **single source of truth**, and balance is **always recomputed, never stored**. Storing a denormalized balance, running credit, or grouped log would create two problems:

1. **Sync hazard.** Any edit or delete of an older transaction would have to fan out and rewrite every dependent cached number; a missed update produces a silent inconsistency.
2. **Retroactive edits are first-class.** Editing or deleting a settlement intentionally changes *later* balances. Because everything is derived from the immutable ledger, those downstream values simply recompute correctly with zero bookkeeping.

Derivations are `O(transactions)` per shop, and the dataset is tiny, so recomputation is effectively free. Integer-paise storage means the arithmetic is exact — no float drift across any number of edits.

---

## 7. Routing / Navigation Model

| Route | Screen | Resolution |
|-------|--------|------------|
| `/` | Dashboard | Renders the shop list from `state.shops`. |
| `/shop/[id]` | Shop screen | Dynamic route. The client reads `id` from route params and looks the shop up in the store by id. |

- The app uses the Next.js **App Router** and is **not** a static export, so the dynamic `/shop/[id]` route needs **no `generateStaticParams`**.
- Pages are **client components** that hydrate from `localStorage` after mount.
- **Shop id resolution (client-side):** `app/shop/[id]/page.tsx` reads `params.id`, then finds `state.shops.find(s => s.id === id)`. If no shop matches (e.g. it was deleted, or a stale/typed URL), the page shows a **not-found state / redirect to the dashboard `/`**. Deleting a shop navigates the user back to `/`.
- **Navigation events:** tapping a `ShopCard` pushes `/shop/{id}`; deleting a shop returns to `/`. Sheets do **not** change the route — they overlay the current page.

---

## 8. Cross-cutting Concerns

### 8.1 Bottom-sheet pattern

All modal flows (`EntrySheet`, `SettleSheet`, `SettingsSheet`) compose the shared `BottomSheet` shell and the `useBottomSheet` hook.

- `BottomSheet` provides a half / near-full-screen panel, a backdrop, and a clearly tappable **close "X" at the top-right**.
- `useBottomSheet` owns open/close state and **body-scroll-lock** (locks background scroll while open, restores on close).
- Sheets are mounted at the route level and **never navigate away** — the route stays behind the backdrop. Confirming a sheet closes it and triggers a re-derive.

### 8.2 Confirm-dialog pattern

`ConfirmDialog` gates every **irreversible** action behind an explicit confirmation:

- **Reset** (Settings) — wipes all local data.
- **Delete shop** (shop overflow menu) — removes the shop and its transactions.

Non-destructive edits (entry/settlement edit, rename) do **not** use the confirm dialog.

### 8.3 Money formatting boundary

- All amounts are stored and computed as **integer paise** (1 rupee = 100 paise). Arithmetic never uses floats.
- Conversion to/from display happens **only at the UI edge**:
  - **Read side:** `Money.tsx` calls `lib/money.formatMoney` to render the rupee glyph + 2 decimals with standard thousands grouping (e.g. `₹1,500.00`, `₹1,000,000.00`). Indian lakh grouping is an optional future toggle, **not** the default.
  - **Write side:** `AmountInput` accepts rupees; the owning sheet converts to paise via `lib/money` before dispatching.
- `Money.tsx` also applies the Cr/Dr **color** rule: `B >= 0` → green `Cr`, `B < 0` → red `Dr` (a brand-new shop shows `Cr ₹0.00` in green).

### 8.4 Hydration guard

Because all state lives in `localStorage` and pages are client components, naive rendering would mismatch between SSR and the post-mount client tree. `AppDataProvider` implements a **hydration/mounted guard**:

1. On the server / first client render, it does not render data-dependent UI (it presents a neutral mounting state).
2. After mount, an effect runs `lib/storage.load()` (safe parse, `schemaVersion` check, `migrate` hook, fallback to empty `AppData` on error) and seeds the reducer.
3. Subsequent state changes persist via the save effect.

This guarantees no SSR/CSR hydration mismatch and that the offline store is the authority once mounted.

### 8.5 Error and empty states

| State | Where | Behavior |
|-------|-------|----------|
| **Dashboard empty** | `ShopList.tsx` | When `shops.length === 0`, show the empty state inviting the user to add a shop. |
| **Empty shop** | `TransactionList.tsx` | When a shop has zero transactions, show the placeholder ("no entries been made yet" style). This is the empty-shop state, not a per-day placeholder. |
| **Shop not found** | `app/shop/[id]/page.tsx` | If the id resolves to no shop, show not-found / redirect to `/`. |
| **Storage parse error** | `lib/storage.ts` | Safe parse; on bad/missing data, fall back to empty `AppData`. |
| **Import rejected** | `SettingsSheet.tsx` + `lib/validation.ts` | If the picked file does not parse as JSON or does not match the expected schema/`schemaVersion`, reject with an error message and make no changes. |
| **Settle unavailable** | `ShopHeader.tsx` | The Settle button is **disabled when `B >= 0`** (nothing owed); the Settle sheet is only reachable when `B < 0`. |
| **Validation failure** | sheets + `lib/validation.ts` | Amount must be `> 0`; entry/settlement-edit date `<= today`; shop name non-empty (trimmed). Invalid input blocks the confirm action. |

---

## 9. Import / Export / Reset Architecture

These flows are owned by `SettingsSheet.tsx` (UI) and `lib/importExport.ts` + `lib/storage.ts` (logic).

- **Export** — `buildExport()` serializes the entire `AppData` plus an `exportedAt` ISO timestamp into `{ schemaVersion, exportedAt, shops: [...] }`; the user downloads it as a `.json` file.
- **Import** — `mergeImport()` performs an **additive union by id** (never overwrites, never deletes):
  1. Parse + validate JSON (reject on bad schema).
  2. For each imported shop: if its `id` is new locally, add the whole shop with all its transactions; if its `id` exists locally, keep the local shop (keep local name) and merge transactions, adding only those whose `id` is not already present and skipping ids that already exist.
  3. The result is the union of both datasets; existing entries are preserved as-is. Edits made on one device do **not** propagate via import — import is purely additive, which is intentional.
- **Reset** — shows a destructive `ConfirmDialog`, then clears the `localStorage` key and resets to an empty `AppData`.

---

## 10. Tech Stack Constraints Reflected in the Architecture

- **Next.js (App Router) + TypeScript (strict)**, deployed on Vercel with **zero config and no environment variables**. Not a static export, so `/shop/[id]` needs no `generateStaticParams`. All data is client-side; pages hydrate from `localStorage` after mount, behind the hydration guard.
- **Tailwind CSS** — mobile-first, wallet-style cards, large tap targets, clean/professional aesthetic.
- **lucide-react** — the only icon source; the app never hand-draws icons.
- **State** — React Context + `useReducer` store (`AppDataProvider`), persisted to `localStorage` via an effect, with the hydration/mounted guard. Selectors derive balance, settle breakdown, and grouped transactions.
- **IDs** — `crypto.randomUUID()` via `lib/id.uuid()`.
- **Tooling** — ESLint + Prettier, TypeScript strict mode.
- **Testing** — a unit-test runner (Vitest recommended) with thorough coverage of the money/ledger math: `balance`, `settleBreakdown` across exact/partial/over cases, money formatting, and import merge. Tests are colocated as `*.test.ts` next to lib files or under a `tests/` directory.

### Out of scope (non-goals)

No authentication, no cloud sync/backend, no multi-currency, no notes/categories/attachments on transactions, no analytics/charts, no notifications. Single device per dataset (move data via export/import).
