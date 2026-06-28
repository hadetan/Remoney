# Remoney

Remoney is a mobile-first, offline money manager for keeping track of what you owe to shops and vendors — and what credit you may already have with them.

It is built for everyday situations where you buy things on credit and pay later: a homeowner buying materials, a small trader buying stock, or anyone who regularly buys from a familiar shop and wants a simple running balance instead of mental math.

## What Remoney does

Remoney gives each shop its own running ledger so you can track the relationship in one place.

- Create a separate account for each shop or vendor
- Record purchases on credit as debits
- Record payments as settlements
- See at a glance whether you owe money or are ahead
- Support partial payments and overpayments
- Carry credit forward automatically to future purchases
- Keep everything local on your device with no accounts or server

## How the app works

Each shop has a simple ledger made of two kinds of transactions:

- Entries: purchases made on credit
- Settlements: payments made against the balance

The app recomputes the balance from the underlying transaction list every time, so your current balance always reflects the actual history. There are no stored totals to keep in sync.

That means the app handles the tricky parts for you:

- If you pay less than you owe, the remaining amount stays as debt
- If you pay more than you owe, the extra amount becomes credit for the next purchase
- If you edit or delete an older transaction, later balances are recalculated automatically

## Key product behaviors

- Mobile-first and touch-friendly
- Works offline after the app has loaded
- Local-only storage in the browser, with no cloud sync or sign-up flow
- Import and export JSON backups for moving or preserving data
- Reset support for clearing local data
- Clean wallet-style interface with clear green/red balance states

## Quick start

Prerequisites:

- Node.js 20+
- npm

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Then open http://localhost:3000 in your browser.

## Build and run locally

Build the production bundle:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## Testing and quality checks

Run the available checks:

```bash
npm run test
npm run lint
npm run typecheck
```

End-to-end tests are also available:

```bash
npm run e2e
```

## Project documentation

The repository includes detailed product and technical docs:

- `docs/requirement.md` — the product requirements and user-visible behavior
- `docs/architecture.md` — the app architecture and data flow
- `docs/tech.md` — the technical implementation and stack choices

## Repository structure

- `src/app` — routes and app shell
- `src/components` — dashboard, shop, sheet, and shared UI components
- `src/lib` — money math, ledger logic, validation, import/export, and storage
- `src/store` — app state and persistence
