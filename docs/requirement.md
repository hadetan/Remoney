# Remoney — Product Requirements

## Product Summary

Remoney is a mobile-first, offline money manager for tracking the running balance you have with the shops and vendors you buy from on credit. It is built for the everyday buyer — for example, a homeowner running a project, a small trader, or anyone who picks up goods from a familiar shop now and pays for them later. The problem it solves is the messy mental accounting of "how much do I still owe this shop, and how much credit do I have left from the last time I overpaid?" Remoney keeps a simple per-shop ledger: every purchase you make on credit is recorded, every payment you make is recorded, and the app always shows you the single honest number — exactly how much you owe a shop, or exactly how much credit you are holding with them. All of your information stays on your own device; there are no accounts, no sign-ups, and nothing is sent to a server.

---

## Glossary (Plain Language)

These are the everyday terms used throughout Remoney. There is no technical jargon here — just what each word means in the app.

| Term | What it means |
| --- | --- |
| **Shop** | A vendor, store, or project you buy from on credit. Each shop holds its own running list of what you bought and what you paid. Your shops are kept separate from one another, so the balance with one shop never affects another. |
| **Entry** | A single purchase you made on credit from a shop. Each entry increases what you owe that shop. An entry is also called a *debit*. |
| **Settlement** | A payment you made to a shop to reduce what you owe. Each settlement decreases what you owe. |
| **Balance** | The single honest number for a shop: everything you have paid the shop, minus everything you have bought from it. A balance can show that you owe money, or that you are ahead (you have credit). |
| **Credit (Cr)** | A balance in your favour. It means you have paid more than you have bought, so the shop effectively "owes you" or you have money parked with them. Credit is always shown in **green**. A balance of zero also counts as credit and is shown as **Cr ₹0.00**. |
| **Debit (Dr)** | A balance against you. It means you still owe the shop money. Debit is always shown in **red**. |

---

## How the Money Works (Plain English)

### The two things you record

For every shop, you only ever record two kinds of things:

1. **Entries** — the purchases you make on credit. These push the balance *down* (you owe more).
2. **Settlements** — the payments you make. These push the balance *up* (you owe less).

The app constantly adds up all your payments, subtracts all your purchases, and shows the result as the shop's balance. You never have to do this math yourself, and the app never stores a stale "total" that could drift out of date — it always recalculates from the actual list of purchases and payments.

### Owe vs. ahead

- If you have bought more than you have paid for, the balance is **red** and labelled **Dr** (debit) — you owe that amount.
- If you have paid more than you have bought, the balance is **green** and labelled **Cr** (credit) — you are ahead by that amount.
- If everything is perfectly squared, the balance is **₹0.00**, shown in **green** as **Cr 0.00**. A zero balance counts as credit. A brand-new shop with no purchases or payments yet also starts at **Cr 0.00** (green).

### Credit carries forward

Credit is not "used up and forgotten." If you overpay a shop, the extra amount stays on record as credit. The next time you buy something from that shop, the new purchase is offset against the credit you were holding — the credit is subtracted from the new amount owed. In other words, your past overpayment automatically counts toward future purchases. You do not need to do anything special; it simply carries forward.

### Partial and over payments are both allowed

When you go to pay a shop, Remoney suggests the exact amount needed to clear what you owe, but you are free to pay any amount greater than zero:

- **Pay less than what is owed (partial payment):** This is allowed. Your payment reduces the debt, and whatever is left over stays as debt. You still owe the remainder.
- **Pay exactly what is owed:** This clears the debt and brings the balance to zero (**Cr 0.00**).
- **Pay more than what is owed (overpayment):** This is allowed. The debt is cleared and the extra amount becomes credit that carries forward to your next purchase.

### Three worked examples

These three short stories show exactly how a balance moves as you owe, pay, and owe again. Amounts are shown in rupees for readability.

**Story 1 — Overpay, then buy again.**
You buy goods worth **₹3,000.00** from the shop, so you owe **₹3,000.00**. Later you pay **₹3,500.00** — that is ₹500.00 more than you owed, so the debt is cleared and you are now **ahead by ₹500.00** (credit). Some days later you buy another **₹2,000.00** of goods. The ₹500.00 credit you were holding is subtracted from that purchase, so you now owe **₹1,500.00**. Your balance reads **Dr ₹1,500.00** (red).

**Story 2 — Partial payment leaves a debt.**
You buy goods worth **₹3,000.00**, so you owe **₹3,000.00**. You can only pay **₹1,000.00** right now — a partial payment, which is allowed. That leaves **₹2,000.00** still owing. Then you buy another **₹500.00** of goods, pushing what you owe up to **₹2,500.00**. Your balance reads **Dr ₹2,500.00** (red). Because your last payment was partial and left you still owing, there was no leftover credit to carry forward.

**Story 3 — Overpay, then a smaller purchase.**
You buy goods worth **₹3,000.00**, so you owe **₹3,000.00**. You pay **₹3,500.00**, clearing the debt and leaving you **ahead by ₹500.00** (credit). Then you buy another **₹1,000.00** of goods. The ₹500.00 credit is subtracted, so you owe **₹500.00**. Your balance reads **Dr ₹500.00** (red).

### The settle screen breakdown

When you owe a shop money and open the settle screen, Remoney shows a transparent breakdown so you can see exactly how the suggested payment was worked out. It always reconciles to the real balance:

| Sequence (in rupees) | You owe now | Credit applied (green) | Gross owed (red) | Suggested payment (net) |
| --- | --- | --- | --- | --- |
| Owe 3,000 → pay 3,500 → owe 2,000 | 1,500 | 500 | 2,000 | 1,500 |
| Owe 3,000 → pay 1,000 (partial) → owe 500 | 2,500 | 0 | 2,500 | 2,500 |
| Owe 3,000 → pay 3,500 → owe 1,000 | 500 | 500 | 1,000 | 500 |

> **Note on the "You owe now" column:** the figure shown is the *amount owed* — the size of your debt, written as a plain positive number (its magnitude, |B|). Under the hood the balance for a shop you owe is a negative number (for example −1,500), but in this plain-language view we show only how much you owe, without the minus sign, to avoid confusion.

How to read these columns:

- **You owe now:** how much you currently owe the shop, shown as a plain positive amount. It is the magnitude of the (negative) balance.
- **Credit applied (green):** any overpayment your most recent payment left behind, which is being put toward what you currently owe. It is zero if your last payment was partial (it left you still owing), or if you have never paid this shop before.
- **Gross owed (red):** the total purchase amount before your carried-forward credit is applied. It equals what you currently owe plus the credit applied.
- **Suggested payment (net):** the amount Remoney pre-fills into the "To pay" box — exactly what you currently owe. By design, this always equals the gross owed minus the credit applied.

You can change the "To pay" amount to anything greater than zero before confirming (see partial and over payments above).

---

## Feature Requirements by Screen

Each requirement below is written as a plain, testable statement. "The user can…" describes an action; "The system shows…" describes what must appear; "The system must not…" describes what is forbidden.

### Dashboard (the home screen)

1. The system shows a top bar with the app name **"Remoney"** on the left.
2. The system shows a small text-style link labelled **"Settings"** on the right side of the top bar. It must look like a plain text link, not a button.
3. The user can tap **"Settings"** to open the Settings panel.
4. The system shows the body as a list of shop cards, one card per shop.
5. The system shows each shop card in a clean wallet-style design, displaying the shop's name and its balance badge.
6. The system shows the balance badge in green as **"Cr ₹{amount}"** when the user is ahead or square, and in red as **"Dr ₹{amount}"** when the user owes money.
7. The user can tap a shop card to open that shop's screen.
8. The system shows a circular **plus (+)** floating action button at the **bottom-left** of the screen for adding a new shop.
9. The user can tap the add-shop button to open an input asking for the new shop's name.
10. The user can create a new shop by entering a name; the system creates a shop with that name and an empty transaction list.
11. The system must not create a shop with an empty or blank name (the name is required, with surrounding spaces trimmed).
12. The system shows an **empty state** on the dashboard when there are no shops yet.

### Settings

1. The system shows exactly three actions in Settings: **Reset**, **Import**, and **Export**.
2. The user can tap **Export** to download all of their Remoney data as a single JSON file.
3. The user can tap **Import** to choose a JSON file and merge its contents into their current data (merge rules are described in the Import / Export / Reset section).
4. The user can tap **Reset** to wipe all local data.
5. The system must show a destructive confirmation dialog before performing a Reset, warning the user that the action is irreversible.
6. The system must not wipe any data until the user confirms the Reset.

### Shop screen

1. The system shows the shop's name as the title on the left of the header.
2. The system shows a red **"Settle"** button on the right of the header.
3. The system must disable the **"Settle"** button whenever the user does not owe the shop money (when the balance is zero or in credit). The settle screen is reachable only when money is owed.
4. The system shows an overflow (kebab) menu in the header containing **"Rename"** and **"Delete shop"**.
5. The user can rename the shop via the **"Rename"** option, editing its name.
6. The user can delete the shop via the **"Delete shop"** option; the system must show its own destructive confirmation dialog before deleting.
7. The system shows the transaction log in the body, grouped by date.
8. The system shows each date group with a small **green** date heading on the left, in the format **"15 apr, 2026"** — day with no leading zero, a lowercase three-letter month, a comma, then the year.
9. The system shows, under each date heading, all the purchase (debit) and payment (settlement) rows for that date.
10. The system shows the date groups newest-date-first, and within a single date the rows appear in the order they were added.
11. The system shows an **empty state** placeholder (in the style of "no entries been made yet") when the shop has no transactions at all. This placeholder is for an empty shop, not for individual empty days.
12. The system shows a circular **plus (+)** floating action button at the bottom of the screen for adding a new entry.
13. The user can tap the add-entry button to open the New Entry panel.

### New Entry

1. The system shows the New Entry panel as a bottom sheet (covering roughly half to nearly the full screen) that does **not** navigate away from the shop screen.
2. The system shows an **amount** input.
3. The system shows a **date** input that defaults to today's date and is editable.
4. The system must not allow a future date; the latest selectable date is today.
5. The system shows a clearly tappable close **"X"** at the top-right of the panel.
6. The system shows a blue **"Confirm"** button at the bottom.
7. The user can confirm to create a new purchase (debit) entry for the chosen amount and date.
8. The system must not accept an amount that is missing, non-numeric, or not greater than zero.

### Edit Entry

1. The system opens the Edit Entry panel when the user taps an existing purchase (debit) row; it reuses the same panel as New Entry, in edit mode.
2. The system shows the amount and date pre-filled with the entry's current values, both editable.
3. The system must not allow a future date when editing; the latest selectable date is today.
4. The system shows a red **"Delete"** action to remove the entry.
5. The system shows a blue **"Confirm"** button to save the edited entry.
6. The user can change the amount and/or date and confirm to update the entry.
7. The user can delete the entry from this panel.
8. The system must not accept an edited amount that is missing, non-numeric, or not greater than zero.

### Settle

1. The system shows the Settle panel as a bottom sheet (covering roughly half to nearly the full screen) that does **not** navigate away from the shop screen.
2. The system shows the **gross owed** amount in **red** at the top.
3. The system shows the **credit applied** amount in **green** below the gross owed, but only when there is credit being applied (greater than zero).
4. The system shows a dividing line, then an editable **"To pay"** input pre-filled with the suggested net amount (exactly what the user currently owes).
5. The user can change the "To pay" amount to any value greater than zero — paying less (partial), exactly, or more (overpayment) than suggested.
6. The system shows a red **"Confirm"** button at the bottom and a tappable close **"X"** at the top-right.
7. The system must not accept a "To pay" amount that is not greater than zero.
8. The user can confirm to create a new payment (settlement), dated **today**. The settlement's date is fixed to today at the moment of creation and is not editable on this screen.
9. The system must close the panel on confirm and re-derive all on-screen values (the balance, the breakdown, and the log).

### Settlement rows in the log

1. The system shows a payment (settlement) row with the amount paid and the result of that payment:
   - If the payment left the user ahead (in credit), the system shows the credit, for example **"Paid ₹3,500.00 - Cr ₹500.00"**.
   - If the payment was partial and the user still owed money right after it, the system shows the remaining amount owed, for example **"Paid ₹1,000.00 - still owe ₹2,000.00"**.
2. The system shows a purchase (debit) row with only the amount — no notes, categories, or any other details.
3. The user can tap a settlement row to edit it (edit the paid amount and date, with the date capped at today), or delete it.
4. The system automatically recalculates all later balances after a settlement (or entry) is edited or deleted, because every number is derived from the underlying list of transactions.

---

## Import, Export, and Reset Behavior

### Export

When the user chooses **Export**, Remoney bundles all of their data — every shop and every purchase and payment within it — into a single JSON file, along with a timestamp of when the export was made, and downloads it to the device. This file is the user's portable backup and is also how they move data to another device.

### Import (additive merge — never overwrites, never deletes)

When the user chooses **Import** and picks a JSON file, Remoney first checks that the file is valid. If the file cannot be read as proper Remoney data, it is rejected with an error message and nothing changes.

If the file is valid, Remoney **adds** its contents to the existing data using these rules:

1. **New shops are added in full.** If an imported shop is not already present on the device, the entire shop — with all of its purchases and payments — is added.
2. **Existing shops are merged, not replaced.** If an imported shop is already present on the device, the local shop is kept (including its existing name), and only its transactions are merged. For each imported purchase or payment: it is added only if it is not already present; if it is already present, it is skipped and the local copy is kept.
3. **Nothing is ever overwritten or deleted.** The result is the combined set of both datasets, with all existing entries preserved exactly as they were.

An important consequence: because import only ever **adds**, edits you make on one device do not carry over to another device through import. For example, if you correct an amount on one device and then import that file onto another device, the other device keeps its own existing version of that entry. This behavior is intentional and accepted. Remoney is designed for a single device per dataset, with export and import used to move or back up data — not to keep two devices continuously in sync.

### Reset

When the user chooses **Reset**, Remoney shows a destructive confirmation dialog warning that the action is irreversible. Only after the user confirms does Remoney wipe all local data, leaving an empty app. If the user cancels, nothing is deleted.

---

## Non-Functional Requirements

1. **Mobile-first:** The app is designed primarily for phones and is responsive across screen sizes.
2. **Works offline:** After the app has loaded, it continues to work with no network connection. All data and calculations happen on the device.
3. **Local-only and private:** All data is stored on the user's own device. There are no accounts, no sign-ups, no server, and no cloud. Nothing is uploaded.
4. **Clean wallet aesthetic:** Shop cards and the overall interface use a clean, professional, wallet-style design.
5. **Premium icons only:** The app uses a high-quality, consistent icon set throughout. It never hand-draws or improvises icons.
6. **Accessibility and tap targets:** Buttons, links, and tappable rows use large, comfortable tap targets so the app is easy to use on a phone.
7. **Fast and responsive:** Because everything is local and the calculations are simple, the app feels instant. Balances and breakdowns update immediately after any change.
8. **No future dates:** The app never allows a purchase or payment to be dated in the future.

---

## Acceptance Criteria / User Stories

These stories describe what a user can accomplish and how we will know it works.

1. **Add a shop.**
   *As a user, I want to add a new shop so I can start tracking what I owe it.*
   Done when: tapping the bottom-left plus on the dashboard lets me enter a name, and a new card appears showing **Cr ₹0.00** in green.

2. **See where I stand at a glance.**
   *As a user, I want each shop card to show whether I owe money or am ahead.*
   Done when: a card shows a red **Dr ₹{amount}** badge when I owe, and a green **Cr ₹{amount}** badge when I am square or ahead.

3. **Record a purchase.**
   *As a user, I want to record a purchase on credit.*
   Done when: I open the new-entry sheet from inside a shop, enter an amount, pick a date no later than today, confirm, and the purchase appears in the date-grouped log and increases what I owe.

4. **Be stopped from using a future date.**
   *As a user, I should not be able to date a purchase or payment in the future.*
   Done when: the date picker will not let me choose any date after today, in both the new-entry and edit modes.

5. **Edit or delete a purchase.**
   *As a user, I want to fix or remove a purchase I recorded.*
   Done when: tapping a purchase row opens it pre-filled, I can change the amount and date and confirm, or delete it, and the balance and log update accordingly.

6. **Pay a shop and clear my debt.**
   *As a user, I want to pay exactly what I owe.*
   Done when: the Settle button is enabled because I owe money, the settle sheet pre-fills the exact amount, and confirming brings the balance to **Cr ₹0.00** in green.

7. **Make a partial payment.**
   *As a user, I want to pay only part of what I owe.*
   Done when: I lower the "To pay" amount, confirm, and the remaining debt is still shown in red, and the payment row reads "Paid ₹{amount} - still owe ₹{amount}".

8. **Overpay and carry credit forward.**
   *As a user, I want my overpayment to count toward future purchases.*
   Done when: I pay more than I owe, the balance turns green as credit, the payment row reads "Paid ₹{amount} - Cr ₹{amount}", and my next purchase is reduced by that credit.

9. **Understand the settle breakdown.**
   *As a user, I want to see how the suggested payment was calculated.*
   Done when: the settle sheet shows the gross owed in red, the credit applied in green (only when there is some), and a "To pay" amount equal to gross owed minus credit applied.

10. **Be blocked from settling when nothing is owed.**
    *As a user, I should not be able to open the settle screen when I owe nothing.*
    Done when: the Settle button is disabled whenever the balance is zero or in credit.

11. **Rename or delete a shop.**
    *As a user, I want to rename a shop or remove it entirely.*
    Done when: the shop's overflow menu lets me rename it, and lets me delete it after confirming a destructive warning.

12. **Edit or delete a payment.**
    *As a user, I want to correct or remove a payment I recorded.*
    Done when: tapping a payment row lets me change the paid amount and date (date no later than today) or delete it, and all later balances recalculate automatically.

13. **Back up and restore my data.**
    *As a user, I want to export my data and import it elsewhere.*
    Done when: Export downloads a JSON file of all my data, and Import adds the contents of a chosen file without overwriting or deleting anything I already have.

14. **Start over safely.**
    *As a user, I want to wipe everything only on purpose.*
    Done when: Reset asks me to confirm an irreversible action, and only clears all data if I confirm.

15. **See helpful empty states.**
    *As a user, I want clear guidance when there is nothing to show.*
    Done when: the dashboard shows an empty state with no shops, and a shop with no transactions shows a "no entries been made yet" placeholder.

---

## Out of Scope / Non-Goals

Remoney deliberately does **not** include the following:

- **No accounts or authentication.** There is no login or user profile.
- **No cloud sync or backend.** Data never leaves the device automatically; there is no server.
- **No multi-currency.** All amounts are in a single currency (the rupee). Indian lakh-style grouping is a possible future option, not part of this release.
- **No notes, categories, or attachments** on purchases or payments. A purchase row shows only its amount.
- **No analytics, charts, or reports.**
- **No notifications.**
- **Single device per dataset.** To move data between devices, use Export and Import; the app is not designed to keep two devices continuously in sync.
