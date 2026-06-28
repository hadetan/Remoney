// src/lib/constants.ts
import type { AppData } from "./types";

/** localStorage key holding the entire serialized AppData document. */
export const STORAGE_KEY = "remoney:appdata:v1";

/** Current storage format version. Drives the migration hook. */
export const SCHEMA_VERSION = 1;

/** The valid "no shops" / reset state. */
export const EMPTY_APP_DATA: AppData = { schemaVersion: SCHEMA_VERSION, shops: [] };

/** Currency display configuration. Standard thousands grouping by default. */
export const CURRENCY = {
  glyph: "₹",
  fractionDigits: 2,
  /** Locale used for thousands grouping. "en-IN" would give lakh grouping (future toggle). */
  locale: "en-US",
} as const;
