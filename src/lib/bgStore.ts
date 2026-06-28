// Durable IndexedDB cache for background images (theme + per-user). Mirrors the
// cache-first intent of catalogStore/themeStore but for binary blobs (images are
// multi-MB, too big for localStorage). The server is the source of truth; this
// cache makes loads instant and keeps the backdrop working fully offline.
//
// Usage: ensureObjectURL(serverUrl) returns a blob: object URL for the image,
// fetching+storing it on first sight and serving from IndexedDB thereafter.

const DB_NAME = 'lyndrix-bg'
const STORE = 'images'

let _dbPromise: Promise<IDBDatabase | null> | null = null

function openDB(): Promise<IDBDatabase | null> {
  if (_dbPromise) return _dbPromise
  _dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
  return _dbPromise
}

function idbGet(key: string): Promise<Blob | null> {
  return openDB().then(
    (db) =>
      new Promise<Blob | null>((resolve) => {
        if (!db) return resolve(null)
        try {
          const tx = db.transaction(STORE, 'readonly')
          const req = tx.objectStore(STORE).get(key)
          req.onsuccess = () => resolve((req.result as Blob) ?? null)
          req.onerror = () => resolve(null)
        } catch {
          resolve(null)
        }
      }),
  )
}

function idbPut(key: string, blob: Blob): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise<void>((resolve) => {
        if (!db) return resolve()
        try {
          const tx = db.transaction(STORE, 'readwrite')
          tx.objectStore(STORE).put(blob, key)
          tx.oncomplete = () => resolve()
          tx.onerror = () => resolve()
        } catch {
          resolve()
        }
      }),
  )
}

// Track created object URLs so we can revoke stale ones on swap.
const _objectUrls = new Map<string, string>()

/**
 * Return a `blob:` object URL for `url`, cache-first:
 * 1. If cached in IndexedDB → object URL from the cached blob.
 * 2. Else fetch → cache → object URL.
 * 3. On any failure (offline + uncached) → null (caller keeps the network URL).
 */
export async function ensureObjectURL(url: string): Promise<string | null> {
  if (!url) return null
  // Cached blob?
  let blob = await idbGet(url)
  if (!blob) {
    try {
      const res = await fetch(url)
      if (!res.ok) return null
      blob = await res.blob()
      await idbPut(url, blob)
    } catch {
      return null
    }
  }
  const prev = _objectUrls.get(url)
  if (prev) return prev
  try {
    const obj = URL.createObjectURL(blob)
    _objectUrls.set(url, obj)
    return obj
  } catch {
    return null
  }
}
