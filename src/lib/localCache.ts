/**
 * Browser IndexedDB cache for large JSON (gamemaster / rankings).
 * Stale-while-revalidate: return cached data immediately, refresh in background.
 */

const DB_NAME = "pokelead-cache-v1";
const STORE = "entries";
const DB_VERSION = 1;

type CacheEntry = {
  key: string;
  data: unknown;
  savedAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("idb open failed"));
  });
}

async function idbGet(key: string): Promise<CacheEntry | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as CacheEntry | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function idbSet(entry: CacheEntry): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* quota / private mode - ignore */
  }
}

const memory = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

export const CACHE_TTL = {
  gamemaster: 1000 * 60 * 60 * 24,
  rankings: 1000 * 60 * 60 * 6,
} as const;

/** Sync peek of in-memory cache only (no IndexedDB). Avoids loading flashes on soft nav. */
export function peekCachedJson<T>(url: string): T | null {
  const entry = memory.get(url);
  return entry ? (entry.data as T) : null;
}

/** Fetch JSON with IndexedDB cache. Serves stale data while refreshing. */
export async function cachedJsonFetch<T>(
  url: string,
  ttlMs: number,
  init?: RequestInit,
): Promise<T> {
  const cached = memory.get(url) ?? (await idbGet(url));
  if (cached) memory.set(url, cached);

  const age = cached ? Date.now() - cached.savedAt : Infinity;
  const fresh = age < ttlMs;

  if (cached && fresh) {
    return cached.data as T;
  }

  const refresh = async (): Promise<T> => {
    const existing = inflight.get(url);
    if (existing) return existing as Promise<T>;

    const p = (async () => {
      const res = await fetch(url, init);
      if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
      const data = (await res.json()) as T;
      const entry: CacheEntry = { key: url, data, savedAt: Date.now() };
      memory.set(url, entry);
      void idbSet(entry);
      return data;
    })().finally(() => {
      inflight.delete(url);
    });

    inflight.set(url, p);
    return p;
  };

  if (cached) {
    void refresh().catch(() => {});
    return cached.data as T;
  }

  return refresh();
}
