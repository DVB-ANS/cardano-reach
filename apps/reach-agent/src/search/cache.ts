import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

const HOUR_MS = 3_600_000;
export const SEARCH_TTL_MS = 6 * HOUR_MS;
export const PAGE_TTL_MS = 24 * HOUR_MS;

interface CacheEntry {
  storedAt: number;
  value: unknown;
}

function cacheDir(): string {
  return process.env.REACH_CACHE_DIR ?? ".local/cache";
}

function entryPath(key: string): string {
  return join(cacheDir(), `${createHash("sha256").update(key).digest("hex")}.json`);
}

function isCacheEntry(value: unknown): value is CacheEntry {
  return typeof value === "object" && value !== null && "storedAt" in value && typeof value.storedAt === "number" && "value" in value;
}

function isMissingFile(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

/** Rend la valeur si elle est présente, valide et plus jeune que `ttlMs`. Un fichier illisible est ignoré. */
export async function readCache<T>(key: string, ttlMs: number, isValue: (value: unknown) => value is T): Promise<T | undefined> {
  let raw: string;
  try {
    raw = await readFile(entryPath(key), "utf8");
  } catch (error) {
    if (isMissingFile(error)) return undefined;
    throw error;
  }
  let entry: unknown;
  try {
    entry = JSON.parse(raw);
  } catch {
    entry = undefined;
  }
  if (!isCacheEntry(entry) || !isValue(entry.value)) {
    console.warn(`cache: unreadable entry ignored for key ${key}`);
    return undefined;
  }
  return Date.now() - entry.storedAt < ttlMs ? entry.value : undefined;
}

/** Écriture atomique : fichier temporaire puis `rename`. */
export async function writeCache(key: string, value: unknown): Promise<void> {
  const path = entryPath(key);
  const tmp = `${path}.${randomUUID()}.tmp`;
  await mkdir(cacheDir(), { recursive: true });
  const entry: CacheEntry = { storedAt: Date.now(), value };
  await writeFile(tmp, JSON.stringify(entry));
  await rename(tmp, path);
}
