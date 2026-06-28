import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  getCatalog,
  setCatalog,
  getCatalogVersion,
  getLocalesMeta,
  setLocalesMeta,
  type LocalesMeta,
} from './catalogStore'

// Localization is served by core (GET /api/i18n) and cached locally. The UI
// bundles NO strings: on startup we hydrate i18next synchronously from the
// durable cache (instant, offline-capable first paint), then revalidate against
// core in the background (stale-while-revalidate). See lib/catalogStore.ts.

export const LANG_KEY = 'lyndrix_lang'

const FALLBACK_LANG = 'de'
// Core seed namespaces. Plugins add their own (via the server's client_namespaces
// list); the full set is discovered at runtime, never hardcoded beyond this seed.
const CORE_NAMESPACES = ['ui', 'settings']

function asArray(ns: string | readonly string[] | undefined): string[] {
  if (!ns) return []
  return Array.isArray(ns) ? [...ns] : [ns as string]
}

/** Union of core seed + cached server namespaces + i18next's current ns list. */
function knownNamespaces(): string[] {
  return Array.from(
    new Set([
      ...CORE_NAMESPACES,
      ...(getLocalesMeta().client_namespaces ?? []),
      ...asArray(i18n.options.ns),
    ]),
  )
}

interface LocalesResponse {
  default: string
  supported: string[]
  client_namespaces: string[]
  version: string
}
interface CatalogResponse {
  locale: string
  version: string
  resources: Record<string, Record<string, unknown>>
}

function storedLang(): string | null {
  try {
    return localStorage.getItem(LANG_KEY)
  } catch {
    return null
  }
}

const initialMeta = getLocalesMeta()
const initialLng = storedLang() ?? initialMeta.default ?? FALLBACK_LANG
const initialFallback = initialMeta.default ?? FALLBACK_LANG
// Returning users may have plugin namespaces cached — seed them so plugin strings
// are available on first paint without waiting for the meta refresh.
const initialNs = Array.from(
  new Set([...CORE_NAMESPACES, ...(initialMeta.client_namespaces ?? [])]),
)

i18n.use(initReactI18next).init({
  // Seed synchronously from cache (empty object on a true first run).
  resources: { [initialLng]: getCatalog(initialLng)?.resources ?? {} },
  lng: initialLng,
  fallbackLng: initialFallback,
  ns: initialNs,
  defaultNS: 'ui',
  interpolation: { escapeValue: false },
  // A partial/empty resource set is valid — we fill it in at runtime.
  partialBundledLanguages: true,
  // `added` is critical: a background addResourceBundle must trigger a
  // react-i18next re-render (the default bindI18n omits it).
  react: { bindI18n: 'languageChanged loaded added' },
})

function registerResources(
  locale: string,
  resources: Record<string, Record<string, unknown>>,
): void {
  for (const [ns, data] of Object.entries(resources)) {
    i18n.addResourceBundle(locale, ns, data, true, true)
  }
}

async function timedFetch(url: string, timeoutMs = 8000): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
  } finally {
    clearTimeout(timer)
  }
}

/** True once the active locale has usable `ui` strings registered. */
export function hasUsableCatalog(locale: string = i18n.language): boolean {
  return i18n.hasResourceBundle(locale, 'ui')
}

/**
 * Fetch + cache + register the catalog for one locale (cache-first revalidate).
 * Returns true if usable resources are available afterwards (fresh, 304, or
 * cached-after-network-failure), false only when there is nothing to show.
 */
export async function loadCatalog(locale: string): Promise<boolean> {
  const cachedVersion = getCatalogVersion(locale)
  const params = new URLSearchParams()
  // Request every known namespace (core + plugin) so plugin strings are fetched.
  params.set('ns', knownNamespaces().join(','))
  if (cachedVersion) params.set('v', cachedVersion)
  const url = `/api/i18n/${encodeURIComponent(locale)}?${params.toString()}`
  try {
    const res = await timedFetch(url)
    if (res.status === 304) {
      const cached = getCatalog(locale)
      if (cached) registerResources(locale, cached.resources)
      return hasUsableCatalog(locale)
    }
    if (!res.ok) {
      const cached = getCatalog(locale)
      if (cached) registerResources(locale, cached.resources)
      return hasUsableCatalog(locale)
    }
    const body = (await res.json()) as CatalogResponse
    setCatalog(locale, { version: body.version, resources: body.resources })
    registerResources(locale, body.resources)
    return hasUsableCatalog(locale)
  } catch {
    // Offline / aborted — fall back to whatever cache we have.
    const cached = getCatalog(locale)
    if (cached) registerResources(locale, cached.resources)
    return hasUsableCatalog(locale)
  }
}

async function fetchLocalesMeta(): Promise<LocalesMeta | null> {
  try {
    const res = await timedFetch('/api/i18n/locales')
    if (!res.ok) return null
    const meta = (await res.json()) as LocalesResponse
    setLocalesMeta(meta)
    return meta
  } catch {
    return null
  }
}

/**
 * Refresh locale metadata + the active locale's catalog. Safe to call repeatedly
 * (e.g. after a plugin install bumps the catalog version). Resolves to whether
 * the active locale has usable strings.
 */
export async function bootstrapI18n(): Promise<boolean> {
  const meta = await fetchLocalesMeta()
  // Expand the active namespace set with any server/plugin-declared namespaces
  // so react-i18next knows about them (a plugin's useTranslation('<ns>') works
  // and re-renders once its strings register).
  if (meta?.client_namespaces?.length) {
    const merged = Array.from(new Set([...asArray(i18n.options.ns), ...meta.client_namespaces]))
    i18n.options.ns = merged
  }
  let lng = i18n.language
  const supported = meta?.supported ?? getLocalesMeta().supported
  if (supported?.length && !supported.includes(lng)) {
    lng = meta?.default ?? supported[0]
  }
  const ok = await loadCatalog(lng)
  if (ok && i18n.language !== lng) {
    await i18n.changeLanguage(lng)
  }
  return ok
}

/** Supported/default languages, seeded from cache and refreshed from core. */
export function useSupportedLanguages(): { default: string; supported: string[] } {
  const { data } = useQuery({
    queryKey: ['i18n-locales'],
    queryFn: async () => (await fetchLocalesMeta()) ?? getLocalesMeta(),
    staleTime: 5 * 60_000,
  })
  const meta = data ?? getLocalesMeta()
  return {
    default: meta.default ?? FALLBACK_LANG,
    supported: meta.supported?.length ? meta.supported : [FALLBACK_LANG, 'en'],
  }
}

export default i18n
