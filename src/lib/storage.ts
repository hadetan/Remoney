// src/lib/storage.ts
import { STORAGE_KEY, SCHEMA_VERSION, EMPTY_APP_DATA } from "./constants";
import { isValidAppData } from "./validation";
import type { AppData } from "./types";

/** Future format upgrades funnel through here. v1 is the identity migration. */
export function migrate(data: AppData): AppData {
  const d = data;
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
