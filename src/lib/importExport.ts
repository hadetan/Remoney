// src/lib/importExport.ts
import { SCHEMA_VERSION } from "./constants";
import { nowIso } from "./format";
import { isValidAppData } from "./validation";
import type { AppData, Shop } from "./types";

export interface ExportDocument {
  schemaVersion: number;
  exportedAt: string; // ISO 8601
  shops: Shop[];
}

/** Build the export document: full AppData + an exportedAt timestamp. */
export function buildExport(data: AppData): ExportDocument {
  return {
    schemaVersion: data.schemaVersion,
    exportedAt: nowIso(),
    shops: data.shops,
  };
}

/**
 * Additive union by id. Never overwrites, never deletes.
 *  - New shop id -> add the whole shop.
 *  - Existing shop id -> keep local (name included); add only transactions whose
 *    id is not already present (skip existing ids, never overwrite).
 * Returns the merged AppData; never mutates inputs.
 */
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

/**
 * Parse + DEEP-validate a raw imported JSON string into an ExportDocument.
 * Accepts both an ExportDocument and a bare AppData (shops array required).
 * Every shop and transaction is structurally validated (ids are strings, amounts
 * are finite numbers > 0, types are valid, etc.) so a malformed file can never
 * inject data that would corrupt the ledger math. Returns null on any failure.
 */
export function parseImport(raw: string): ExportDocument | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const v = parsed as Record<string, unknown>;

  // Deep structural validation of the core AppData shape (shops + every transaction).
  const candidate = { schemaVersion: v.schemaVersion, shops: v.shops };
  if (!isValidAppData(candidate)) return null;

  return {
    schemaVersion: candidate.schemaVersion,
    exportedAt: typeof v.exportedAt === "string" ? v.exportedAt : nowIso(),
    shops: candidate.shops as Shop[],
  };
}
