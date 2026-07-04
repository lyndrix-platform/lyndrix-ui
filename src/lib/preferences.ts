// Account-scoped ("My account") theme preferences — Theming v2 Phase 2 (frontend).
//
// This is the cross-device scope in the layered theming model. It sits BETWEEN
// the system default and the per-browser overrides:
//
//   effective(x) = browserOverride(x) ?? accountPreference(x)
//                                     ?? systemDefault(x) ?? themeDefault(x)
//
// Backed by the live core endpoints (all authed via apiFetch's bearer):
//   GET    /api/me/preferences            → { preferences: <dict> }   ({} if unset)
//   PUT    /api/me/preferences {preferences:<partial>} → deep-merges, returns full
//   DELETE /api/me/preferences/{dotted}   → { preferences: <remaining> }
//
// The preference document is a single namespaced tree; the theming-relevant keys:
//
//   {
//     "theme": {
//       "selection":       { "react": "<id|null>", "nicegui": "<id|null>" },
//       "token_overrides": { "light": { "--lx-*": "…" }, "dark": { … } }
//     },
//     "language": "<locale>"        // optional, not consumed here yet
//   }
//
// Design decisions (documented per the handoff):
//   • PUT deep-merges server-side, so we always send the MINIMAL partial (just the
//     changed dotted path) — never the whole doc. This makes concurrent edits from
//     two devices additive instead of last-writer-wins over the entire document.
//   • token_overrides are per mode ({light,dark}); a patch merges keys in, it does
//     not replace the map. Removing all account token overrides is a DELETE of the
//     whole `theme.token_overrides` subtree (there is no per-key account delete in
//     this pass).
//   • The last-known account layer (selection + token_overrides) is mirrored into
//     localStorage (`lyndrix_account_prefs`) and hydrated SYNCHRONOUSLY on module
//     load, so a logged-in reload paints the account theme with no flash before the
//     network GET returns. On a fresh device (empty cache) the server GET fills it.
//   • The reactive store lets ThemeProvider / cards re-render when the account layer
//     changes (login revalidation, a save, or logout clearing it).

import { useSyncExternalStore } from 'react'
import { apiFetch } from './api'
import type { BrowserOverrides, OverrideMode } from './browserOverrides'

/** Account scope is live now that /api/me/preferences exists. */
export const ACCOUNT_SCOPE_ENABLED = true

/** Which UI a theme selection applies to on the server. */
export type ThemeTarget = 'react' | 'nicegui'

/** Per-target account theme selection (null = unset → falls through to system). */
export interface AccountThemeSelection {
  react: string | null
  nicegui: string | null
}

/**
 * The resolved account layer used by the theming runtime: the cross-device theme
 * selection plus the per-mode `--lx-*` token overrides. This is the shape cached
 * in localStorage and exposed reactively.
 */
export interface AccountLayer {
  selection: AccountThemeSelection
  tokenOverrides: BrowserOverrides // { light: {...}, dark: {...} }
}

/** The raw server preference document (loosely typed — only theming keys matter here). */
export interface PreferencesDoc {
  theme?: {
    selection?: { react?: string | null; nicegui?: string | null }
    token_overrides?: { light?: Record<string, string>; dark?: Record<string, string> }
  }
  language?: string
  [key: string]: unknown
}

/**
 * Account-scoped preferences client, resolved server-side and shared across a
 * user's devices. See the payload map above.
 */
export interface PreferencesClient {
  /** Whole preference document (cached in-memory + localStorage; revalidates on force). */
  getPreferences(force?: boolean): Promise<PreferencesDoc>
  /** PUT a minimal partial at a dotted key (server deep-merges); returns the merged doc. */
  setPath(dottedKey: string, value: unknown): Promise<PreferencesDoc>
  /** DELETE a dotted key subtree; returns the remaining doc. */
  deletePath(dottedKey: string): Promise<PreferencesDoc>
  /** Resolve the account-scoped theme id for a UI target, or null if unset. */
  getThemeSelection(target: ThemeTarget): Promise<string | null>
  /** Persist the account-scoped theme id for a UI target. */
  setThemeSelection(target: ThemeTarget, id: string): Promise<void>
  /** Resolve the account-scoped per-mode `--lx-*` token overrides. */
  getTokenOverrides(): Promise<BrowserOverrides>
  /** Merge a patch of per-mode `--lx-*` token overrides into the account scope. */
  setTokenOverrides(mode: OverrideMode, patch: Record<string, string>): Promise<void>
}

// ── Cache + reactive store ──────────────────────────────────────────────────────

const CACHE_KEY = 'lyndrix_account_prefs'

const EMPTY_LAYER: AccountLayer = {
  selection: { react: null, nicegui: null },
  tokenOverrides: { light: {}, dark: {} },
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
    // private mode / quota — best-effort.
  }
}

/** Project the raw preference doc onto the compact account layer we actually apply. */
function toLayer(doc: PreferencesDoc): AccountLayer {
  return {
    selection: {
      react: doc.theme?.selection?.react ?? null,
      nicegui: doc.theme?.selection?.nicegui ?? null,
    },
    tokenOverrides: {
      light: doc.theme?.token_overrides?.light ?? {},
      dark: doc.theme?.token_overrides?.dark ?? {},
    },
  }
}

/** Synchronous localStorage hydration of the last-known account layer (no flash). */
function loadCache(): AccountLayer {
  const raw = safeGet(CACHE_KEY)
  if (!raw) return EMPTY_LAYER
  try {
    const p = JSON.parse(raw) as Partial<AccountLayer>
    return {
      selection: {
        react: p.selection?.react ?? null,
        nicegui: p.selection?.nicegui ?? null,
      },
      tokenOverrides: {
        light: p.tokenOverrides?.light ?? {},
        dark: p.tokenOverrides?.dark ?? {},
      },
    }
  } catch {
    return EMPTY_LAYER
  }
}

let currentLayer: AccountLayer = loadCache()
let currentDoc: PreferencesDoc | null = null
let inflight: Promise<PreferencesDoc> | null = null

const listeners = new Set<() => void>()

function notify(): void {
  listeners.forEach((l) => l())
}

/** Replace the reactive layer, persist to cache, and notify subscribers. */
function commitLayer(layer: AccountLayer): void {
  currentLayer = layer
  safeSet(CACHE_KEY, JSON.stringify(layer))
  notify()
}

/** Adopt a fresh server doc as authoritative and re-derive the applied layer. */
function adoptDoc(doc: PreferencesDoc): PreferencesDoc {
  currentDoc = doc
  commitLayer(toLayer(doc))
  return doc
}

/** Build a minimal nested object from a dotted key: `a.b.c`, v → {a:{b:{c:v}}}. */
function buildNested(dottedKey: string, value: unknown): Record<string, unknown> {
  const parts = dottedKey.split('.')
  const root: Record<string, unknown> = {}
  let node = root
  for (let i = 0; i < parts.length - 1; i += 1) {
    const next: Record<string, unknown> = {}
    node[parts[i]] = next
    node = next
  }
  node[parts[parts.length - 1]] = value
  return root
}

// ── Public reactive accessors ─────────────────────────────────────────────────

/** Current account layer snapshot (stable reference until the next mutation). */
export function getAccountLayer(): AccountLayer {
  return currentLayer
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

/** Reactive read — re-renders consumers whenever the account layer changes. */
export function useAccountLayer(): AccountLayer {
  return useSyncExternalStore(subscribe, getAccountLayer, getAccountLayer)
}

/** Count of distinct account token-override vars across both modes (facet chip). */
export function countAccountOverrides(layer: AccountLayer = currentLayer): number {
  const names = new Set<string>([
    ...Object.keys(layer.tokenOverrides.light),
    ...Object.keys(layer.tokenOverrides.dark),
  ])
  return names.size
}

/**
 * Drop the account layer entirely (logout): clears the in-memory doc + localStorage
 * cache and notifies, so ThemeProvider stops painting the account vars. System and
 * browser scopes are untouched.
 */
export function clearAccountPrefs(): void {
  currentDoc = null
  inflight = null
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    // best-effort.
  }
  currentLayer = EMPTY_LAYER
  notify()
}

// ── API client ────────────────────────────────────────────────────────────────

async function getPreferences(force = false): Promise<PreferencesDoc> {
  if (currentDoc && !force) return currentDoc
  if (inflight && !force) return inflight
  inflight = apiFetch<{ preferences: PreferencesDoc }>('/api/me/preferences')
    .then((r) => adoptDoc(r.preferences ?? {}))
    .finally(() => {
      inflight = null
    })
  return inflight
}

async function setPath(dottedKey: string, value: unknown): Promise<PreferencesDoc> {
  const partial = buildNested(dottedKey, value)
  const r = await apiFetch<{ preferences: PreferencesDoc }>('/api/me/preferences', {
    method: 'PUT',
    body: JSON.stringify({ preferences: partial }),
  })
  return adoptDoc(r.preferences ?? {})
}

async function deletePath(dottedKey: string): Promise<PreferencesDoc> {
  const r = await apiFetch<{ preferences: PreferencesDoc }>(
    `/api/me/preferences/${encodeURIComponent(dottedKey)}`,
    { method: 'DELETE' },
  )
  return adoptDoc(r.preferences ?? {})
}

async function getThemeSelection(target: ThemeTarget): Promise<string | null> {
  const doc = await getPreferences()
  return doc.theme?.selection?.[target] ?? null
}

async function setThemeSelection(target: ThemeTarget, id: string): Promise<void> {
  // Optimistic: reflect the selection locally before the round-trip so the account
  // layer paints immediately; the server response reconciles it.
  commitLayer({
    ...currentLayer,
    selection: { ...currentLayer.selection, [target]: id },
  })
  await setPath(`theme.selection.${target}`, id)
}

async function getTokenOverrides(): Promise<BrowserOverrides> {
  const doc = await getPreferences()
  return toLayer(doc).tokenOverrides
}

async function setTokenOverrides(
  mode: OverrideMode,
  patch: Record<string, string>,
): Promise<void> {
  // Optimistic merge into the applied layer (server deep-merges the same patch).
  commitLayer({
    ...currentLayer,
    tokenOverrides: {
      light: { ...currentLayer.tokenOverrides.light },
      dark: { ...currentLayer.tokenOverrides.dark },
      [mode]: { ...currentLayer.tokenOverrides[mode], ...patch },
    },
  })
  await setPath(`theme.token_overrides.${mode}`, patch)
}

export const preferencesClient: PreferencesClient = {
  getPreferences,
  setPath,
  deletePath,
  getThemeSelection,
  setThemeSelection,
  getTokenOverrides,
  setTokenOverrides,
}
