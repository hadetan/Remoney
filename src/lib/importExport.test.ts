import { describe, it, expect } from "vitest";
import { buildExport, mergeImport, parseImport, type ExportDocument } from "./importExport";
import type { AppData, Shop, Transaction } from "./types";

function tx(id: string, amount = 100): Transaction {
  return { id, type: "DEBIT", amount, date: "2026-04-15", createdAt: "2026-04-15T09:00:00.000Z" };
}

function shop(id: string, name: string, txs: Transaction[]): Shop {
  return { id, name, createdAt: "2026-04-01T00:00:00.000Z", transactions: txs };
}

describe("buildExport", () => {
  it("includes schemaVersion, an exportedAt, and the shops", () => {
    const data: AppData = { schemaVersion: 1, shops: [shop("s1", "A", [tx("t1")])] };
    const doc = buildExport(data);
    expect(doc.schemaVersion).toBe(1);
    expect(typeof doc.exportedAt).toBe("string");
    expect(doc.shops).toHaveLength(1);
  });
});

describe("mergeImport — additive union by id", () => {
  it("adds an entirely new shop wholesale", () => {
    const local: AppData = { schemaVersion: 1, shops: [] };
    const imported: ExportDocument = {
      schemaVersion: 1,
      exportedAt: "x",
      shops: [shop("s1", "A", [tx("t1")])],
    };
    const merged = mergeImport(local, imported);
    expect(merged.shops).toHaveLength(1);
    expect(merged.shops[0].id).toBe("s1");
  });

  it("keeps the LOCAL name for an existing shop id", () => {
    const local: AppData = { schemaVersion: 1, shops: [shop("s1", "LocalName", [tx("t1")])] };
    const imported: ExportDocument = {
      schemaVersion: 1,
      exportedAt: "x",
      shops: [shop("s1", "ImportedName", [tx("t2")])],
    };
    const merged = mergeImport(local, imported);
    expect(merged.shops[0].name).toBe("LocalName");
  });

  it("unions transactions by id and skips existing ids (never overwrites)", () => {
    const local: AppData = { schemaVersion: 1, shops: [shop("s1", "A", [tx("t1", 100)])] };
    const imported: ExportDocument = {
      schemaVersion: 1,
      exportedAt: "x",
      shops: [shop("s1", "A", [tx("t1", 999), tx("t2", 200)])],
    };
    const merged = mergeImport(local, imported);
    const txs = merged.shops[0].transactions;
    expect(txs.map((t) => t.id).sort()).toEqual(["t1", "t2"]);
    // existing t1 kept at local value 100, NOT overwritten by imported 999
    expect(txs.find((t) => t.id === "t1")?.amount).toBe(100);
  });

  it("does not mutate the inputs", () => {
    const local: AppData = { schemaVersion: 1, shops: [shop("s1", "A", [tx("t1")])] };
    const imported: ExportDocument = {
      schemaVersion: 1,
      exportedAt: "x",
      shops: [shop("s1", "A", [tx("t2")])],
    };
    mergeImport(local, imported);
    expect(local.shops[0].transactions).toHaveLength(1);
    expect(imported.shops[0].transactions).toHaveLength(1);
  });
});

describe("parseImport", () => {
  it("parses a valid export document", () => {
    const raw = JSON.stringify({ schemaVersion: 1, exportedAt: "x", shops: [] });
    expect(parseImport(raw)).not.toBeNull();
  });

  it("rejects malformed JSON and bad schema", () => {
    expect(parseImport("not json")).toBeNull();
    expect(parseImport(JSON.stringify({ shops: [] }))).toBeNull();
    expect(parseImport(JSON.stringify({ schemaVersion: 1 }))).toBeNull();
  });

  it("deep-validates: rejects structurally broken shops/transactions", () => {
    // transaction amount as a string would corrupt ledger math -> must be rejected
    const badTx = JSON.stringify({
      schemaVersion: 1,
      shops: [
        {
          id: "s1",
          name: "A",
          createdAt: "2026-04-01T00:00:00.000Z",
          transactions: [{ id: "t1", type: "DEBIT", amount: "100", date: "2026-04-15", createdAt: "x" }],
        },
      ],
    });
    expect(parseImport(badTx)).toBeNull();

    // amount <= 0 is invalid
    const zeroTx = JSON.stringify({
      schemaVersion: 1,
      shops: [
        {
          id: "s1",
          name: "A",
          createdAt: "2026-04-01T00:00:00.000Z",
          transactions: [{ id: "t1", type: "DEBIT", amount: 0, date: "2026-04-15", createdAt: "x" }],
        },
      ],
    });
    expect(parseImport(zeroTx)).toBeNull();

    // unknown transaction type is invalid
    const badType = JSON.stringify({
      schemaVersion: 1,
      shops: [
        {
          id: "s1",
          name: "A",
          createdAt: "2026-04-01T00:00:00.000Z",
          transactions: [{ id: "t1", type: "REFUND", amount: 100, date: "2026-04-15", createdAt: "x" }],
        },
      ],
    });
    expect(parseImport(badType)).toBeNull();

    // a well-formed document still passes
    const good = JSON.stringify({
      schemaVersion: 1,
      shops: [
        {
          id: "s1",
          name: "A",
          createdAt: "2026-04-01T00:00:00.000Z",
          transactions: [{ id: "t1", type: "DEBIT", amount: 100, date: "2026-04-15", createdAt: "x" }],
        },
      ],
    });
    expect(parseImport(good)).not.toBeNull();
  });
});
