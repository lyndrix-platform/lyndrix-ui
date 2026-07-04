import { useSyncExternalStore } from 'react'
import { LEGACY_PERSONAL_THEME_KEY, type PersonalOverrides } from './personalTheme'

// Consolidated "this browser" CSS-variable override store. It layers per-browser
// `--lx-*` overrides on top of the selected server theme; ThemeProvider injects
// them as the highest-precedence <style> so a picked value wins over the theme
// without touching the server theme catalog. Overrides are kept per mode
// (light/dark) since a value that reads well in dark may not in light.
//
// This supersedes lib/personalTheme.ts. It KEEPS the exact same wire shape
// (`{ light, dark }`, each a `Record<varName, value>`) but GENERALISES it from
// colours-only to ANY `--lx-*` variable (radius, shadow, blur, spacing, fonts…).
//
// Reactive store (mirrors lib/glassConfig.ts): a synchronous localStorage read on
// module load hydrates `current`, mutations replace it immutably and notify
// subscribers, and `useBrowserOverrides()` re-renders consumers via
// useSyncExternalStore.

/** Same shape as the legacy PersonalOverrides — now free of the colour-only assumption. */
export type BrowserOverrides = PersonalOverrides

export type OverrideMode = 'light' | 'dark'

const KEY = 'lyndrix_browser_overrides'

// ── Facet classification ──────────────────────────────────────────────────────
// A var's "facet" is either `colour` or `other`. This is the set of `--lx-*`
// variables that carry a colour (the engine derives them from the 13 colour
// tokens, plus the composed border/state accents). Anything not listed here —
// radius, shadow, blur, spacing, fonts, transitions — counts as `other`.
// `countByFacet()` uses this so the Appearance overrides card can show
// "Colours: n · Tokens: n". Existing migrated users only ever have colours, so
// they report `{ colour: n, other: 0 }`, matching prior behaviour.
const COLOUR_VARS: ReadonlySet<string> = new Set([
  // Accents
  '--lx-accent',
  '--lx-accent-2',
  '--lx-accent-3',
  // Surfaces
  '--lx-bg',
  '--lx-surface',
  '--lx-elevated',
  // Text
  '--lx-text',
  '--lx-text-muted',
  '--lx-text-subtle',
  // Borders
  '--lx-border',
  '--lx-border-soft',
  // State accents
  '--lx-state-up',
  '--lx-state-down',
  '--lx-state-paused',
  '--lx-state-unknown',
  '--lx-info',
  '--lx-warning',
])

/** True if `varName` is a colour variable (vs a non-colour token). */
export function isColourVar(varName: string): boolean {
  return COLOUR_VARS.has(varName)
}

// ── Persistence ───────────────────────────────────────────────────────────────

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

function parse(raw: string): BrowserOverrides {
  try {
    const p = JSON.parse(raw) as Partial<BrowserOverrides>
    return { light: p.light ?? {}, dark: p.dark ?? {} }
  } catch {
    return { light: {}, dark: {} }
  }
}

/**
 * Load the current overrides, running the one-time legacy migration.
 *
 * If the new key is absent but the legacy `lyndrix_personal_theme` key exists,
 * copy it into the new key ONCE. The legacy key is left in place and never
 * written again — the presence of the new key makes this idempotent (the next
 * load returns the new key directly and never re-touches the legacy value).
 */
function load(): BrowserOverrides {
  const rawNew = safeGet(KEY)
  if (rawNew !== null) return parse(rawNew)
  const legacy = safeGet(LEGACY_PERSONAL_THEME_KEY)
  if (legacy !== null) {
    const migrated = parse(legacy)
    safeSet(KEY, JSON.stringify(migrated)) // copy once; never rewrite the legacy key.
    return migrated
  }
  return { light: {}, dark: {} }
}

let current: BrowserOverrides = load()

const listeners = new Set<() => void>()

function commit(next: BrowserOverrides): void {
  current = next
  safeSet(KEY, JSON.stringify(next))
  listeners.forEach((l) => l())
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Current overrides snapshot (stable reference until the next mutation). */
export function getBrowserOverrides(): BrowserOverrides {
  return current
}

/** Merge a patch of `{ varName: value }` into the given mode. */
export function setBrowserOverrideVars(mode: OverrideMode, patch: Record<string, string>): void {
  commit({
    light: { ...current.light },
    dark: { ...current.dark },
    [mode]: { ...current[mode], ...patch },
  })
}

/** Remove a single override var from the given mode. */
export function clearBrowserOverrideVar(mode: OverrideMode, varName: string): void {
  const nextMode = { ...current[mode] }
  delete nextMode[varName]
  commit({
    light: { ...current.light },
    dark: { ...current.dark },
    [mode]: nextMode,
  })
}

/** Drop every override in both modes. */
export function resetBrowserOverrides(): void {
  commit({ light: {}, dark: {} })
}

/** True if any override exists in either mode. */
export function hasAnyOverride(): boolean {
  return Object.keys(current.light).length > 0 || Object.keys(current.dark).length > 0
}

/**
 * Count overridden variables per facet, de-duplicated across modes: a var
 * customised in both light and dark counts once. Returns
 * `{ colour, other }` for the overrides card's facet chips.
 */
export function countByFacet(): { colour: number; other: number } {
  const names = new Set<string>([...Object.keys(current.light), ...Object.keys(current.dark)])
  let colour = 0
  let other = 0
  names.forEach((name) => {
    if (isColourVar(name)) colour += 1
    else other += 1
  })
  return { colour, other }
}

// ── Reactive subscription ─────────────────────────────────────────────────────

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

/** Reactive read — re-renders consumers whenever the overrides change. */
export function useBrowserOverrides(): BrowserOverrides {
  return useSyncExternalStore(subscribe, getBrowserOverrides, getBrowserOverrides)
}
