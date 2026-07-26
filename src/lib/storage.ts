// src/lib/storage.ts
import { STORAGE_KEY, SCHEMA_VERSION, EMPTY_APP_DATA } from "./constants";
import { isValidAppData } from "./validation";
import type { AppData } from "./types";

export interface AppDataLoadResult {
  data: AppData;
  /**
   * True when the loaded document should be written back once, typically after a
   * schema migration.
   */
  needsSave: boolean;
}

const EMPTY_LOAD_RESULT: AppDataLoadResult = {
  data: EMPTY_APP_DATA,
  needsSave: false,
};

let cachedRaw: string | null = null;
let cachedLoadResult: AppDataLoadResult = EMPTY_LOAD_RESULT;

/** Future format upgrades funnel through here. v1 is the identity migration. */
export function migrate(data: AppData): AppDataLoadResult {
  const next = { ...data, schemaVersion: SCHEMA_VERSION };
  return {
    data: next,
    needsSave: data.schemaVersion !== SCHEMA_VERSION,
  };
}

/** Parse + validate a raw storage payload. Falls back to EMPTY_APP_DATA on failure. */
export function parseStoredAppData(raw: string | null): AppDataLoadResult {
  if (raw === null) return EMPTY_LOAD_RESULT;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isValidAppData(parsed)) return EMPTY_LOAD_RESULT;
    return migrate(parsed);
  } catch {
    return EMPTY_LOAD_RESULT;
  }
}

function cacheLoadResult(raw: string | null, result: AppDataLoadResult): AppDataLoadResult {
  cachedRaw = raw;
  cachedLoadResult = result;
  return result;
}

function readStoredRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function scheduleAfterPaint(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && "requestAnimationFrame" in window) {
      window.requestAnimationFrame(() => resolve());
      return;
    }
    setTimeout(resolve, 0);
  });
}

/** Synchronous load used when the result is needed immediately. */
export function loadAppData(): AppDataLoadResult {
  const raw = readStoredRaw();
  if (raw === cachedRaw) return cachedLoadResult;
  return cacheLoadResult(raw, parseStoredAppData(raw));
}

/**
 * Async load used during hydration so the loading UI can paint before parsing a
 * large ledger document on the main thread.
 */
export async function loadAppDataAsync(): Promise<AppDataLoadResult> {
  const raw = readStoredRaw();
  if (raw === cachedRaw) return cachedLoadResult;
  await scheduleAfterPaint();
  return cacheLoadResult(raw, parseStoredAppData(raw));
}

/** Serialize + persist. Swallows quota/serialization errors. */
export function saveAppData(data: AppData): void {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.stringify(data);
    window.localStorage.setItem(STORAGE_KEY, raw);
    cacheLoadResult(raw, { data, needsSave: false });
  } catch {
    /* ignore quota / private-mode errors */
  }
}

/** Reset: clear the key. */
export function clearAppData(): void {
  cachedRaw = null;
  cachedLoadResult = EMPTY_LOAD_RESULT;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
