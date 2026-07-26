import { describe, it, expect } from "vitest";
import {
  balance,
  buildTransactionList,
  lastSettlement,
  settleBreakdown,
  settlementRowInfo,
  groupByDate,
} from "./ledger";
import type { Shop, Transaction } from "./types";

type Spec = [type: Transaction["type"], paise: number, date: string];

function makeShop(specs: Spec[]): Shop {
  return {
    id: "shop-1",
    name: "Test",
    createdAt: "2026-04-01T00:00:00.000Z",
    transactions: specs.map(([type, amount, date], i) => ({
      id: `tx-${i}`,
      type,
      amount,
      date,
      // createdAt strictly increasing in declaration order
      createdAt: `2026-04-${String(10 + i).padStart(2, "0")}T09:0${i}:00.000Z`,
    })),
  };
}

describe("balance", () => {
  it("is 0 for an empty shop", () => {
    expect(balance(makeShop([]))).toBe(0);
  });

  it("is order-independent (addition commutes)", () => {
    const a = makeShop([
      ["DEBIT", 300000, "2026-04-15"],
      ["SETTLEMENT", 350000, "2026-04-20"],
    ]);
    const b: Shop = { ...a, transactions: [...a.transactions].reverse() };
    expect(balance(a)).toBe(balance(b));
    expect(balance(a)).toBe(50000);
  });
});

describe("lastSettlement", () => {
  it("returns null when there is no settlement", () => {
    expect(lastSettlement(makeShop([["DEBIT", 100, "2026-04-15"]]))).toBeNull();
  });

  it("picks the settlement with the greatest (date, createdAt)", () => {
    const shop = makeShop([
      ["SETTLEMENT", 100, "2026-04-15"],
      ["SETTLEMENT", 200, "2026-04-20"],
    ]);
    expect(lastSettlement(shop)?.amount).toBe(200);
  });
});

describe("settleBreakdown — proof table", () => {
  it("row 1: owe 3000, pay 3500, owe 2000 -> green 500, red 2000, net 1500", () => {
    const shop = makeShop([
      ["DEBIT", 300000, "2026-04-15"],
      ["SETTLEMENT", 350000, "2026-04-20"],
      ["DEBIT", 200000, "2026-04-25"],
    ]);
    const r = settleBreakdown(shop);
    expect(r.creditApplied).toBe(50000);
    expect(r.grossOwed).toBe(200000);
    expect(r.toPay).toBe(150000);
    expect(r.grossOwed - r.creditApplied).toBe(r.toPay);
    expect(r.toPay).toBe(Math.abs(balance(shop)));
  });

  it("row 2: owe 3000, pay 1000 (partial), owe 500 -> green 0, red 2500, net 2500", () => {
    const shop = makeShop([
      ["DEBIT", 300000, "2026-04-15"],
      ["SETTLEMENT", 100000, "2026-04-20"],
      ["DEBIT", 50000, "2026-04-25"],
    ]);
    const r = settleBreakdown(shop);
    expect(r.creditApplied).toBe(0);
    expect(r.grossOwed).toBe(250000);
    expect(r.toPay).toBe(250000);
    expect(r.grossOwed - r.creditApplied).toBe(r.toPay);
  });

  it("row 3: owe 3000, pay 3500, owe 1000 -> green 500, red 1000, net 500", () => {
    const shop = makeShop([
      ["DEBIT", 300000, "2026-04-15"],
      ["SETTLEMENT", 350000, "2026-04-20"],
      ["DEBIT", 100000, "2026-04-25"],
    ]);
    const r = settleBreakdown(shop);
    expect(r.creditApplied).toBe(50000);
    expect(r.grossOwed).toBe(100000);
    expect(r.toPay).toBe(50000);
    expect(r.grossOwed - r.creditApplied).toBe(r.toPay);
  });

  it("no prior settlement -> creditApplied 0, gross == net == total debt", () => {
    const shop = makeShop([
      ["DEBIT", 300000, "2026-04-15"],
      ["DEBIT", 200000, "2026-04-16"],
    ]);
    const r = settleBreakdown(shop);
    expect(r.creditApplied).toBe(0);
    expect(r.toPay).toBe(500000);
    expect(r.grossOwed).toBe(500000);
  });
});

describe("settlementRowInfo", () => {
  it("overpayment -> resultingCredit set, remainingOwed null", () => {
    const shop = makeShop([
      ["DEBIT", 300000, "2026-04-15"],
      ["SETTLEMENT", 350000, "2026-04-20"],
    ]);
    const settlement = shop.transactions[1];
    const info = settlementRowInfo(shop, settlement);
    expect(info.paid).toBe(350000);
    expect(info.resultingCredit).toBe(50000);
    expect(info.remainingOwed).toBeNull();
  });

  it("partial -> remainingOwed set, resultingCredit null", () => {
    const shop = makeShop([
      ["DEBIT", 300000, "2026-04-15"],
      ["SETTLEMENT", 100000, "2026-04-20"],
    ]);
    const settlement = shop.transactions[1];
    const info = settlementRowInfo(shop, settlement);
    expect(info.paid).toBe(100000);
    expect(info.resultingCredit).toBeNull();
    expect(info.remainingOwed).toBe(200000);
  });
});

describe("groupByDate", () => {
  it("groups newest-date-first, createdAt ascending within a group", () => {
    const shop = makeShop([
      ["DEBIT", 100, "2026-04-15"],
      ["DEBIT", 200, "2026-04-15"],
      ["DEBIT", 300, "2026-04-20"],
    ]);
    const groups = groupByDate(shop);
    expect(groups.map((g) => g.date)).toEqual(["2026-04-20", "2026-04-15"]);
    expect(groups[1].transactions.map((t) => t.amount)).toEqual([100, 200]);
  });
});

describe("buildTransactionList", () => {
  it("builds grouped rows and computes settlement info in one ordered pass", () => {
    const shop = makeShop([
      ["DEBIT", 300000, "2026-04-15"],
      ["SETTLEMENT", 100000, "2026-04-20"],
      ["SETTLEMENT", 250000, "2026-04-20"],
    ]);

    const groups = buildTransactionList(shop);

    expect(groups.map((group) => group.date)).toEqual(["2026-04-20", "2026-04-15"]);
    expect(groups[0].rows).toHaveLength(2);

    expect(groups[0].rows[0].settlementInfo).toEqual({
      paid: 100000,
      resultingCredit: null,
      remainingOwed: 200000,
    });
    expect(groups[0].rows[1].settlementInfo).toEqual({
      paid: 250000,
      resultingCredit: 50000,
      remainingOwed: null,
    });
    expect(groups[1].rows[0].settlementInfo).toBeNull();
  });
});
