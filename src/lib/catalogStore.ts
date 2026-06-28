// Durable, offline-first cache for the localization catalog served by core
// (GET /api/i18n/{locale}). This is what lets the app — and offline-capable
// plugins — keep working without a network: we persist each fetched locale and
// hydrate i18next from it synchronously on startup, then revalidate in the
// background (stale-while-revalidate).
//
// Storage choice: localStorage. Its *synchronous* read is what enables a
// zero-flash first paint (we can seed i18next before the first render without
// awaiting). The full `ui` + `settings` catalog per locale is tens of KB —
// comfortably under the ~5 MB quota. All access is wrapped so private-mode /
// quota errors degrade to "no cache" rather than throwing. The API below is
// deliberately small so it can be swapped for IndexedDB later if plugin
// namespaces grow the payload.

export interface CachedCatalog {
  version: string
  resources: Record<string, Record<string, unknown>>
}

export interface LocalesMeta {
  default?: string
  supported?: string[]
  client_namespaces?: string[]
  version?: string
}

const CATALOG_PREFIX = 'lx_i18n_catalog_'
const META_KEY = 'lx_i18n_locales'

function catalogKey(locale: string): string {
  return `${CATALOG_PREFIX}${locale}`
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // private mode / quota exceeded — cache is best-effort, ignore.
  }
}

/** Synchronous read of a cached catalog for `locale`, or null if absent/corrupt. */
export function getCatalog(locale: string): CachedCatalog | null {
  const raw = safeGet(catalogKey(locale))
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as CachedCatalog
    if (parsed && typeof parsed.version === 'string' && parsed.resources) return parsed
    return null
  } catch {
    return null
  }
}

export function setCatalog(locale: string, catalog: CachedCatalog): void {
  safeSet(catalogKey(locale), JSON.stringify(catalog))
}

/** Cached catalog version for `locale` (used as the `?v=` revalidation token). */
export function getCatalogVersion(locale: string): string | undefined {
  return getCatalog(locale)?.version
}

export function getLocalesMeta(): LocalesMeta {
  const raw = safeGet(META_KEY)
  if (!raw) return {}
  try {
    return JSON.parse(raw) as LocalesMeta
  } catch {
    return {}
  }
}

export function setLocalesMeta(meta: LocalesMeta): void {
  safeSet(META_KEY, JSON.stringify(meta))
}
