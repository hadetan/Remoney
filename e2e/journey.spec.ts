import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * End-to-end coverage of the whole Remoney app against a real browser.
 * The money math mirrors the locked proof table:
 *   owe 3000, pay 3500 (over), owe 2000, pay 1000 (partial)  ->  net Dr 1500 then Dr 500.
 */

function today(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

async function freshApp(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

async function addShop(page: Page, name: string) {
  await page.getByRole("button", { name: "Add shop" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByPlaceholder("e.g. Sharma General Store").fill(name);
  await dialog.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
}

async function openShop(page: Page, name: string) {
  await page.getByRole("button").filter({ hasText: name }).click();
  await expect(page.getByRole("button", { name: "New entry" })).toBeVisible();
}

async function addEntry(page: Page, rupees: string) {
  await page.getByRole("button", { name: "New entry" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('input[inputmode="decimal"]').fill(rupees);
  await dialog.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
}

async function settle(page: Page, rupees: string) {
  await page.getByRole("button", { name: "Settle" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('input[inputmode="decimal"]').fill(rupees);
  await dialog.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
}

async function backToDashboard(page: Page) {
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByRole("heading", { name: "Remoney" })).toBeVisible();
}

test.describe.configure({ mode: "serial" });

test.describe("money journey: owe / overpay / owe / partial", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await freshApp(page);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("empty dashboard shows the placeholder", async () => {
    await expect(page.getByText("No shops yet")).toBeVisible();
  });

  test("adding a shop shows Cr 0.00 in green", async () => {
    await addShop(page, "Sharma Store");
    await expect(page.getByText("Sharma Store")).toBeVisible();
    const badge = page.getByText("Cr ₹0.00");
    await expect(badge).toBeVisible();
    await expect(badge).toHaveClass(/text-emerald-600/);
  });

  test("opening a fresh shop: empty log + Settle disabled", async () => {
    await openShop(page, "Sharma Store");
    await expect(page.getByText("No entries yet")).toBeVisible();
    await expect(page.getByRole("button", { name: "Settle" })).toBeDisabled();
  });

  test("adding a 3000 debit shows a Purchase row under today's heading", async () => {
    await addEntry(page, "3000");
    await expect(page.getByText("Purchase")).toBeVisible();
    await expect(page.getByText("₹3,000.00")).toBeVisible();
    // green date heading present
    await expect(page.locator("h3.text-emerald-600").first()).toBeVisible();
  });

  test("dashboard now shows Dr 3,000.00 in red", async () => {
    await backToDashboard(page);
    const badge = page.getByText("Dr ₹3,000.00");
    await expect(badge).toBeVisible();
    await expect(badge).toHaveClass(/text-red-600/);
  });

  test("settle breakdown for a plain debt: owed only, prefilled net", async () => {
    await openShop(page, "Sharma Store");
    await expect(page.getByRole("button", { name: "Settle" })).toBeEnabled();
    await page.getByRole("button", { name: "Settle" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Owed")).toBeVisible();
    await expect(dialog.getByText("₹3,000.00")).toBeVisible();
    await expect(dialog.getByText("Credit", { exact: true })).toBeHidden(); // no carried credit yet
    await expect(dialog.locator('input[inputmode="decimal"]')).toHaveValue("3000");
    // close without settling
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("overpaying 3500 leaves Cr 500 and a credit row", async () => {
    await settle(page, "3500");
    await expect(page.getByText("Paid ₹3,500.00")).toBeVisible();
    await expect(page.getByText("Cr ₹500.00")).toBeVisible();
    // settle is disabled again — nothing owed
    await expect(page.getByRole("button", { name: "Settle" })).toBeDisabled();
    await backToDashboard(page);
    await expect(page.getByText("Cr ₹500.00")).toHaveClass(/text-emerald-600/);
  });

  test("a new 2000 debit nets to Dr 1,500.00 (credit absorbed)", async () => {
    await openShop(page, "Sharma Store");
    await addEntry(page, "2000");
    await backToDashboard(page);
    await expect(page.getByText("Dr ₹1,500.00")).toBeVisible();
  });

  test("settle now shows gross owed 2000, credit 500, net 1500", async () => {
    await openShop(page, "Sharma Store");
    await page.getByRole("button", { name: "Settle" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("₹2,000.00")).toBeVisible(); // grossOwed (red)
    await expect(dialog.getByText("Credit", { exact: true })).toBeVisible();
    await expect(dialog.getByText("₹500.00")).toBeVisible(); // creditApplied (green)
    await expect(dialog.locator('input[inputmode="decimal"]')).toHaveValue("1500"); // net
  });

  test("partial payment of 1000 leaves Dr 500 and a 'still owe' row", async () => {
    const dialog = page.getByRole("dialog");
    await dialog.locator('input[inputmode="decimal"]').fill("1000");
    await dialog.getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByText("Paid ₹1,000.00")).toBeVisible();
    await expect(page.getByText("still owe ₹500.00")).toBeVisible();
    await backToDashboard(page);
    await expect(page.getByText("Dr ₹500.00")).toBeVisible();
  });
});

test.describe("validation, edit, delete, rename", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await freshApp(page);
    await addShop(page, "Edit Co");
    await openShop(page, "Edit Co");
    await addEntry(page, "1000");
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("entry date input forbids the future (max = today)", async () => {
    await page.getByRole("button", { name: "New entry" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.locator('input[type="date"]')).toHaveAttribute("max", today());
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("invalid amount is rejected with an error", async () => {
    await page.getByRole("button", { name: "New entry" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator('input[inputmode="decimal"]').fill("0");
    await dialog.getByRole("button", { name: "Confirm" }).click();
    await expect(dialog.getByText(/valid amount greater than 0/i)).toBeVisible();
    await dialog.getByRole("button", { name: "Close" }).click();
  });

  test("editing a purchase updates the balance", async () => {
    await page.getByRole("button").filter({ hasText: "Purchase" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Edit entry" })).toBeVisible();
    await dialog.locator('input[inputmode="decimal"]').fill("1500");
    await dialog.getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByText("₹1,500.00")).toBeVisible();
    await backToDashboard(page);
    await expect(page.getByText("Dr ₹1,500.00")).toBeVisible();
  });

  test("deleting the entry empties the shop and zeroes the balance", async () => {
    await openShop(page, "Edit Co");
    await page.getByRole("button").filter({ hasText: "Purchase" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByText("No entries yet")).toBeVisible();
    await backToDashboard(page);
    await expect(page.getByText("Cr ₹0.00")).toBeVisible();
  });

  test("rename shop updates the header", async () => {
    await openShop(page, "Edit Co");
    await page.getByRole("button", { name: "More" }).click();
    await page.getByRole("button", { name: "Rename" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator('input[type="text"]').fill("Renamed Co");
    await dialog.getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByRole("heading", { name: "Renamed Co" })).toBeVisible();
  });

  test("delete shop returns to an empty dashboard", async () => {
    await page.getByRole("button", { name: "More" }).click();
    await page.getByRole("button", { name: "Delete shop" }).click();
    const confirm = page.getByRole("dialog");
    await confirm.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("No shops yet")).toBeVisible();
  });
});

test.describe("settings: import merge, reset", () => {
  let page: Page;
  let fixturePath: string;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await freshApp(page);

    // Build a valid export fixture with one shop + one debit.
    const doc = {
      schemaVersion: 1,
      exportedAt: "2026-06-28T00:00:00.000Z",
      shops: [
        {
          id: "imported-shop-1",
          name: "Imported Store",
          createdAt: "2026-06-01T00:00:00.000Z",
          transactions: [
            {
              id: "imported-tx-1",
              type: "DEBIT",
              amount: 250000, // ₹2,500.00 in paise
              date: "2026-06-10",
              createdAt: "2026-06-10T10:00:00.000Z",
            },
          ],
        },
      ],
    };
    fixturePath = path.join(os.tmpdir(), "remoney-import-fixture.json");
    fs.writeFileSync(fixturePath, JSON.stringify(doc), "utf8");
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("importing a file merges in the new shop", async () => {
    await page.getByRole("button", { name: "Settings" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator('input[type="file"]').setInputFiles(fixturePath);
    await expect(dialog.getByText(/Import complete/i)).toBeVisible();
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(page.getByText("Imported Store")).toBeVisible();
    await expect(page.getByText("Dr ₹2,500.00")).toBeVisible();
  });

  test("importing the same file again is a no-op (skip existing ids)", async () => {
    await page.getByRole("button", { name: "Settings" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator('input[type="file"]').setInputFiles(fixturePath);
    await expect(dialog.getByText(/Import complete/i)).toBeVisible();
    await dialog.getByRole("button", { name: "Close" }).click();
    // still exactly one card / one balance
    await expect(page.getByText("Imported Store")).toHaveCount(1);
  });

  test("reset wipes everything after confirmation", async () => {
    await page.getByRole("button", { name: "Settings" }).click();
    let dialog = page.getByRole("dialog");
    await dialog.getByText("Reset", { exact: true }).click();
    const confirm = page.getByRole("dialog").last();
    await confirm.getByRole("button", { name: "Reset" }).click();
    // settings sheet still open with the reset message; close it
    dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(page.getByText("No shops yet")).toBeVisible();
  });
});
