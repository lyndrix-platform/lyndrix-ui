import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getToken } from '../lib/api'
import {
  getThemeVars,
  setThemeVars,
  getSelectedThemeId,
  setSelectedThemeId,
  clearSelectedThemeId,
  type ThemeVars,
} from '../lib/themeStore'
import {
  useBrowserOverrides,
  setBrowserOverrideVars,
  clearBrowserOverrideVar,
  resetBrowserOverrides,
  type BrowserOverrides,
} from '../lib/browserOverrides'
import {
  useAccountLayer,
  getAccountLayer,
  preferencesClient,
  type AccountThemeSelection,
  type ThemeTarget,
} from '../lib/preferences'
import { ensureObjectURL } from '../lib/bgStore'

// Two independent axes:
//  • mode  — light/dark, toggled locally (data-theme on <html>), key `lyndrix_theme`
//  • theme pack — which server theme's --lx-* tokens apply to the React UI,
//    selected independently of the NiceGUI active theme (key `lyndrix_react_theme`).
// Theme tokens are fetched from core (GET /api/themes/{id}/css-vars) and injected
// as a <style> that overrides the bundled defaults in index.css. The bundled
// defaults remain the offline/first-paint fallback (no flash, works with no backend).

export type ThemeId = 'dark' | 'light'
export const THEME_KEY = 'lyndrix_theme'

const STYLE_EL_ID = 'lx-theme-vars'
const ACCOUNT_EL_ID = 'lx-account-vars'
const BROWSER_EL_ID = 'lx-browser-vars'
const USER_BG_EL_ID = 'lx-user-bg'
const BG_CACHE_EL_ID = 'lx-bg-cache'
const DRAFT_EL_ID = 'lx-editor-draft'
const DEFAULT_THEME = 'default'

// Precedence is encoded as <head> source order: later blocks win over earlier.
// theme/system → account (user, cross-device) → browser → background → editor draft.
// Every injector re-asserts this order so a late async inject can never jump the
// queue (e.g. a cached theme painting after the browser overrides on first load).
const LAYER_ORDER = [
  STYLE_EL_ID,
  ACCOUNT_EL_ID,
  BROWSER_EL_ID,
  USER_BG_EL_ID,
  BG_CACHE_EL_ID,
  DRAFT_EL_ID,
] as const

/** Move every present layer <style> to the end of <head> in precedence order. */
function enforceLayerOrder(): void {
  for (const id of LAYER_ORDER) {
    const el = document.getElementById(id)
    if (el) document.head.appendChild(el)
  }
}

/** Per-mode CSS-var delta for live editor previews (light/dark each optional). */
export interface VarDelta {
  light?: Record<string, string>
  dark?: Record<string, string>
}

function extractUrl(cssValue: string | undefined): string | null {
  if (!cssValue) return null
  const m = cssValue.match(/url\(["']?([^"')]+)["']?\)/)
  return m ? m[1] : null
}

/**
 * Create/replace a layer <style> by id, then re-assert the whole layer stack's
 * source order. Used by every var layer (theme/account/browser/background) so
 * precedence never depends on which async inject happened to land last.
 */
function setStyle(id: string, css: string): void {
  let el = document.getElementById(id) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = id
  }
  el.textContent = css
  document.head.appendChild(el)
  enforceLayerOrder()
}

/** Build the `:root{…}` / light-scoped CSS for a per-mode `--lx-*` override set. */
function overridesToCss(o: BrowserOverrides): string {
  const parts: string[] = []
  if (Object.keys(o.dark).length) parts.push(`:root{${toCss(o.dark)}}`)
  if (Object.keys(o.light).length) parts.push(`:root[data-theme="light"]{${toCss(o.light)}}`)
  return parts.join('\n')
}

interface ThemeCtx {
  themeId: ThemeId
  setTheme: (id: ThemeId) => void
  selectedThemeId: string
  setSelectedTheme: (id: string) => void
  refreshTheme: () => void
  /** Remove the React theme pin and re-follow the global active theme. */
  unpinTheme: () => void
  // Account (user, cross-device) theme selection per target, from /api/me/preferences.
  accountSelection: AccountThemeSelection
  /**
   * Follow the account-scoped theme for a target. For 'react' this also drops the
   * browser pin so the account selection wins and applies it live; 'nicegui' just
   * persists the selection (React never consumes it live).
   */
  setAccountThemeSelection: (target: ThemeTarget, id: string) => void
  /** Clear the account-scoped theme selection for a target (falls back to system). */
  clearAccountThemeSelection: (target: ThemeTarget) => void
  // Per-browser --lx-* overrides on top of the selected theme (any var, per mode).
  browserOverrides: BrowserOverrides
  setBrowserOverrideVar: (mode: ThemeId, varName: string, value: string) => void
  clearBrowserOverrideVar: (mode: ThemeId, varName: string) => void
  resetBrowserOverrides: () => void
  /** Live editor preview: inject (or, with null, remove) a top-layer var delta. */
  setDraftVars: (delta: VarDelta | null) => void
  // Per-user background images (server-driven; {light,dark} URLs or null).
  userBg: { light?: string | null; dark?: string | null }
  refreshUserBg: () => void
}

const Ctx = createContext<ThemeCtx>({
  themeId: 'dark',
  setTheme: () => {},
  selectedThemeId: DEFAULT_THEME,
  setSelectedTheme: () => {},
  refreshTheme: () => {},
  unpinTheme: () => {},
  accountSelection: { react: null, nicegui: null },
  setAccountThemeSelection: () => {},
  clearAccountThemeSelection: () => {},
  browserOverrides: { light: {}, dark: {} },
  setBrowserOverrideVar: () => {},
  clearBrowserOverrideVar: () => {},
  resetBrowserOverrides: () => {},
  setDraftVars: () => {},
  userBg: {},
  refreshUserBg: () => {},
})

function toCss(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(';')
}

/** Inject/replace the theme <style> with the theme's dark + light blocks. */
function injectThemeVars(vars: ThemeVars): void {
  const css = `:root{${toCss(vars.dark)}}\n:root[data-theme="light"]{${toCss(vars.light)}}`
  // setStyle re-asserts LAYER_ORDER so account/browser/etc. stay above the theme,
  // regardless of which injected first (cache-sync vs network-async).
  setStyle(STYLE_EL_ID, css)
}

/**
 * Inject/replace the account (user, cross-device) override <style>. Same per-mode
 * `--lx-*` shape as browser overrides, but sits BELOW the browser layer: when a
 * user has both an account override and a browser override for the same var, the
 * browser wins by source order.
 */
function injectAccountVars(o: BrowserOverrides): void {
  setStyle(ACCOUNT_EL_ID, overridesToCss(o))
}

/** Inject/replace the browser-override <style> (only the overridden vars). */
function injectBrowserVars(o: BrowserOverrides): void {
  setStyle(BROWSER_EL_ID, overridesToCss(o))
}

/**
 * Inject/replace/remove the live-editor draft <style>, appended LAST in <head>
 * so it wins over every other layer (theme, browser overrides, backgrounds).
 * Passing null (or an empty delta) removes it. Same `:root{…}` / light-scoped
 * format as injectBrowserVars.
 */
function injectDraftVars(delta: VarDelta | null): void {
  const existing = document.getElementById(DRAFT_EL_ID) as HTMLStyleElement | null
  const darkKeys = delta?.dark ? Object.keys(delta.dark).length : 0
  const lightKeys = delta?.light ? Object.keys(delta.light).length : 0
  if (!delta || (darkKeys === 0 && lightKeys === 0)) {
    if (existing) existing.remove()
    return
  }
  const parts: string[] = []
  if (darkKeys) parts.push(`:root{${toCss(delta.dark as Record<string, string>)}}`)
  if (lightKeys) {
    parts.push(`:root[data-theme="light"]{${toCss(delta.light as Record<string, string>)}}`)
  }
  const el = existing ?? document.createElement('style')
  el.id = DRAFT_EL_ID
  el.textContent = parts.join('\n')
  // Always (re)append → keeps the draft as the last, highest-precedence layer.
  document.head.appendChild(el)
}

async function authedJson<T>(path: string): Promise<T | null> {
  try {
    const token = getToken()
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(path, { headers })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(() =>
    localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark',
  )
  // Initial React theme: browser pin (highest) → cached account selection → default.
  // The account selection is read synchronously from the localStorage cache so a
  // fresh reload paints the cross-device theme with no flash before the server GET.
  const [selectedThemeId, setSelId] = useState<string>(() => {
    const pin = getSelectedThemeId()
    if (pin) return pin
    return getAccountLayer().selection.react ?? DEFAULT_THEME
  })
  // Per-browser --lx-* overrides, from the reactive browserOverrides store.
  const browserOverrides = useBrowserOverrides()
  // Account (user, cross-device) layer, from the reactive preferences store.
  const accountLayer = useAccountLayer()
  const loggedIn = !!getToken()
  // Per-user background images (server source of truth → syncs across devices).
  const [userBg, setUserBg] = useState<{ light?: string | null; dark?: string | null }>({})
  // Bumped whenever fresh theme css-vars are injected, so the bg-image cache
  // effect re-resolves the effective backdrop URLs.
  const [themeTick, setThemeTick] = useState(0)

  const refreshUserBg = useCallback(() => {
    if (!getToken()) return
    void authedJson<{ light: string | null; dark: string | null }>('/api/me/background').then(
      (d) => {
        if (d) setUserBg({ light: d.light, dark: d.dark })
      },
    )
  }, [])

  useEffect(() => {
    refreshUserBg()
  }, [refreshUserBg])

  // Mode toggle (unchanged behavior).
  useEffect(() => {
    document.documentElement.dataset.theme = themeId
  }, [themeId])

  // Account-override layer — sits between theme (below) and browser (above).
  // Applies only while authenticated; on logout the preferences store is cleared
  // to the empty layer, which removes these vars (system/browser scopes remain).
  useEffect(() => {
    injectAccountVars(loggedIn ? accountLayer.tokenOverrides : { light: {}, dark: {} })
  }, [accountLayer, loggedIn])

  // Revalidate the account preferences against the server on mount (covers a
  // logged-in reload); the fetch updates the reactive store + localStorage cache.
  useEffect(() => {
    if (!getToken()) return
    void preferencesClient.getPreferences()
  }, [])

  // Browser-override layer — declared AFTER the account effect so on mount the
  // browser <style> is appended after it (and enforceLayerOrder re-asserts the
  // ordering on every change regardless).
  useEffect(() => {
    injectBrowserVars(browserOverrides)
  }, [browserOverrides])

  // Cache-first inject for the selected theme pack: paint from cache immediately,
  // then revalidate against core (stale-while-revalidate).
  const applyTheme = useCallback((id: string) => {
    const cached = getThemeVars(id)
    if (cached) injectThemeVars(cached)
    void authedJson<{ css_variables: ThemeVars }>(
      `/api/themes/${encodeURIComponent(id)}/css-vars`,
    ).then((body) => {
      if (body?.css_variables) {
        setThemeVars(id, body.css_variables)
        injectThemeVars(body.css_variables)
        setThemeTick((n) => n + 1)
      }
    })
  }, [])

  useEffect(() => {
    applyTheme(selectedThemeId)
  }, [selectedThemeId, applyTheme])

  // Backdrop image offline cache: resolve the effective --lx-bg-image per mode
  // (per-user server image → theme value), cache the bytes in IndexedDB, and
  // inject blob: object URLs as the top layer so the backdrop is instant and
  // works offline. Falls back to the network url() (in lx-theme/lx-browser) if
  // the image isn't cached yet.
  useEffect(() => {
    let cancelled = false
    const themeVars = getThemeVars(selectedThemeId)
    // Effective backdrop per mode: per-user image (server) wins over the theme's.
    const effective = (mode: ThemeId): string | null =>
      userBg[mode] ?? extractUrl(themeVars?.[mode]?.['--lx-bg-image']) ?? null
    const darkUrl = effective('dark')
    const lightUrl = effective('light')

    // Layer 1 (lx-user-bg): network URL of a per-user image, so it applies
    // immediately online (overrides the theme) even before caching completes.
    const userParts: string[] = []
    if (userBg.dark) userParts.push(`:root{--lx-bg-image:url("${userBg.dark}")}`)
    if (userBg.light) userParts.push(`:root[data-theme="light"]{--lx-bg-image:url("${userBg.light}")}`)
    setStyle(USER_BG_EL_ID, userParts.join('\n'))

    // Layer 2 (lx-bg-cache): cached blob object URL of the EFFECTIVE image,
    // appended last → wins, and works fully offline.
    void (async () => {
      const [darkObj, lightObj] = await Promise.all([
        darkUrl ? ensureObjectURL(darkUrl) : Promise.resolve(null),
        lightUrl ? ensureObjectURL(lightUrl) : Promise.resolve(null),
      ])
      if (cancelled) return
      const parts: string[] = []
      if (darkObj) parts.push(`:root{--lx-bg-image:url("${darkObj}")}`)
      if (lightObj) parts.push(`:root[data-theme="light"]{--lx-bg-image:url("${lightObj}")}`)
      setStyle(BG_CACHE_EL_ID, parts.join('\n'))
    })()
    return () => {
      cancelled = true
    }
  }, [selectedThemeId, userBg, themeTick])

  // Follow the global active theme (GET /api/themes/active). Setting the same id
  // is a no-op for React, so re-following when already correct is harmless.
  const followActiveTheme = useCallback(() => {
    if (!getToken()) return
    void authedJson<{ theme_id: string }>('/api/themes/active').then((d) => {
      if (d?.theme_id) setSelId(d.theme_id)
    })
  }, [])

  // Theme-selection precedence when no explicit browser pin exists:
  //   browser pin (localStorage) → account selection (cross-device) → system active.
  // The account selection is followed but NOT persisted as a browser pin (only an
  // explicit "This browser" choice writes lyndrix_react_theme). Re-runs whenever the
  // account selection changes (e.g. server revalidation lands on a fresh device).
  useEffect(() => {
    if (getSelectedThemeId()) return // browser pin wins — leave it.
    const acct = accountLayer.selection.react
    if (acct) {
      setSelId(acct)
      return
    }
    followActiveTheme()
  }, [accountLayer.selection.react, followActiveTheme])

  function setTheme(id: ThemeId) {
    setThemeId(id)
    localStorage.setItem(THEME_KEY, id)
    document.documentElement.dataset.theme = id
  }

  function setSelectedTheme(id: string) {
    setSelId(id)
    setSelectedThemeId(id)
  }

  const refreshTheme = useCallback(() => applyTheme(selectedThemeId), [applyTheme, selectedThemeId])

  // Unpin the React theme: drop the local pin and re-follow the active theme.
  const unpinTheme = useCallback(() => {
    clearSelectedThemeId()
    followActiveTheme()
  }, [followActiveTheme])

  // Follow the account-scoped theme for a target. 'react' also drops the browser
  // pin so the account selection wins and applies it live; 'nicegui' only persists
  // the selection server-side (React never paints the NiceGUI theme).
  const setAccountThemeSelection = useCallback((target: ThemeTarget, id: string) => {
    void preferencesClient.setThemeSelection(target, id)
    if (target === 'react') {
      clearSelectedThemeId() // drop browser pin so account wins
      setSelId(id) // follow now (not persisted as a browser pin)
    }
  }, [])

  // Clear the account-scoped selection for a target → falls back to system default.
  const clearAccountThemeSelection = useCallback((target: ThemeTarget) => {
    void preferencesClient.deletePath(`theme.selection.${target}`)
  }, [])

  // Browser-override mutators delegate to the reactive store; the store notifies
  // useBrowserOverrides(), which re-renders the provider and re-injects the vars.
  const setBrowserOverrideVar = useCallback((mode: ThemeId, varName: string, value: string) => {
    setBrowserOverrideVars(mode, { [varName]: value })
  }, [])

  const clearBrowserOverride = useCallback((mode: ThemeId, varName: string) => {
    clearBrowserOverrideVar(mode, varName)
  }, [])

  const resetBrowserOverridesCb = useCallback(() => {
    resetBrowserOverrides()
  }, [])

  // Live editor preview: write/remove the top-layer #lx-editor-draft <style>.
  const setDraftVars = useCallback((delta: VarDelta | null) => {
    injectDraftVars(delta)
  }, [])

  return (
    <Ctx.Provider
      value={{
        themeId,
        setTheme,
        selectedThemeId,
        setSelectedTheme,
        refreshTheme,
        unpinTheme,
        accountSelection: accountLayer.selection,
        setAccountThemeSelection,
        clearAccountThemeSelection,
        browserOverrides,
        setBrowserOverrideVar,
        clearBrowserOverrideVar: clearBrowserOverride,
        resetBrowserOverrides: resetBrowserOverridesCb,
        setDraftVars,
        userBg,
        refreshUserBg,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export const useTheme = () => useContext(Ctx)
