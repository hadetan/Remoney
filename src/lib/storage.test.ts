import { describe, expect, it } from "vitest";
import { parseStoredAppData } from "./storage";

describe("parseStoredAppData", () => {
  it("returns empty data for missing storage", () => {
    const result = parseStoredAppData(null);
    expect(result.data.shops).toEqual([]);
    expect(result.needsSave).toBe(false);
  });

  it("loads a valid stored document without forcing a rewrite", () => {
    const result = parseStoredAppData(
      JSON.stringify({
        schemaVersion: 1,
        shops: [
          {
            id: "shop-1",
            name: "Corner Shop",
            createdAt: "2026-04-01T00:00:00.000Z",
            transactions: [
              {
                id: "tx-1",
                type: "DEBIT",
                amount: 2500,
                date: "2026-04-15",
                createdAt: "2026-04-15T09:00:00.000Z",
              },
            ],
          },
        ],
      }),
    );

    expect(result.data.shops).toHaveLength(1);
    expect(result.data.shops[0].transactions).toHaveLength(1);
    expect(result.needsSave).toBe(false);
  });

  it("falls back to empty data for malformed JSON", () => {
    const result = parseStoredAppData("{not json");
    expect(result.data.shops).toEqual([]);
    expect(result.needsSave).toBe(false);
  });
});
