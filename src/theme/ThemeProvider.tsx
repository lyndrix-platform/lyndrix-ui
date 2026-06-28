import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getToken } from '../lib/api'
import {
  getThemeVars,
  setThemeVars,
  getSelectedThemeId,
  setSelectedThemeId,
  type ThemeVars,
} from '../lib/themeStore'
import {
  getPersonalOverrides,
  setPersonalOverrides,
  type PersonalOverrides,
} from '../lib/personalTheme'
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
const PERSONAL_EL_ID = 'lx-personal-vars'
const USER_BG_EL_ID = 'lx-user-bg'
const BG_CACHE_EL_ID = 'lx-bg-cache'
const DEFAULT_THEME = 'default'

function extractUrl(cssValue: string | undefined): string | null {
  if (!cssValue) return null
  const m = cssValue.match(/url\(["']?([^"')]+)["']?\)/)
  return m ? m[1] : null
}

/** Create/replace a <style> by id and move it to the end of <head> (wins). */
function setStyle(id: string, css: string): void {
  let el = document.getElementById(id) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = id
  }
  el.textContent = css
  document.head.appendChild(el)
}

interface ThemeCtx {
  themeId: ThemeId
  setTheme: (id: ThemeId) => void
  selectedThemeId: string
  setSelectedTheme: (id: string) => void
  refreshTheme: () => void
  // Personalization (per-mode --lx-* overrides on top of the selected theme).
  personal: PersonalOverrides
  setPersonalColor: (mode: ThemeId, varName: string, value: string) => void
  clearPersonalColor: (mode: ThemeId, varName: string) => void
  resetPersonal: () => void
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
  personal: { light: {}, dark: {} },
  setPersonalColor: () => {},
  clearPersonalColor: () => {},
  resetPersonal: () => {},
  userBg: {},
  refreshUserBg: () => {},
})

function toCss(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(';')
}

/** Inject/replace the override <style> with the theme's dark + light blocks. */
function injectThemeVars(vars: ThemeVars): void {
  const css = `:root{${toCss(vars.dark)}}\n:root[data-theme="light"]{${toCss(vars.light)}}`
  let el = document.getElementById(STYLE_EL_ID) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = STYLE_EL_ID
    // Appended after index.css → overrides the bundled defaults by source order.
    document.head.appendChild(el)
  }
  el.textContent = css
  // Keep personal overrides last in <head> so they always win over the theme,
  // regardless of which injected first (cache-sync vs network-async).
  const personalEl = document.getElementById(PERSONAL_EL_ID)
  if (personalEl) document.head.appendChild(personalEl)
}

/** Inject/replace the personalization <style> (only the overridden vars). */
function injectPersonalVars(o: PersonalOverrides): void {
  const parts: string[] = []
  if (Object.keys(o.dark).length) parts.push(`:root{${toCss(o.dark)}}`)
  if (Object.keys(o.light).length) parts.push(`:root[data-theme="light"]{${toCss(o.light)}}`)
  let el = document.getElementById(PERSONAL_EL_ID) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = PERSONAL_EL_ID
  }
  el.textContent = parts.join('\n')
  // Always (re)append → moves it to the end of <head>, ahead of the theme block.
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
  const [selectedThemeId, setSelId] = useState<string>(
    () => getSelectedThemeId() ?? DEFAULT_THEME,
  )
  const [personal, setPersonal] = useState<PersonalOverrides>(() => getPersonalOverrides())
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

  // Personalization layer — declared AFTER the theme effect so on mount the
  // personal <style> is appended after the theme <style> (and injectThemeVars
  // re-asserts the ordering on every theme change).
  useEffect(() => {
    injectPersonalVars(personal)
  }, [personal])

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
  // (personal override → theme value), cache the bytes in IndexedDB, and inject
  // blob: object URLs as the top layer so the backdrop is instant and works
  // offline. Falls back to the network url() (in lx-theme/lx-personal) if the
  // image isn't cached yet.
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

  // First run (no explicit selection yet): follow the global active theme.
  // Not persisted — only an explicit user choice pins the React theme.
  useEffect(() => {
    if (getSelectedThemeId() || !getToken()) return
    void authedJson<{ theme_id: string }>('/api/themes/active').then((d) => {
      if (d?.theme_id && d.theme_id !== selectedThemeId) setSelId(d.theme_id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const setPersonalColor = useCallback((mode: ThemeId, varName: string, value: string) => {
    setPersonal((prev) => {
      const next: PersonalOverrides = {
        light: { ...prev.light },
        dark: { ...prev.dark },
      }
      next[mode][varName] = value
      setPersonalOverrides(next)
      return next
    })
  }, [])

  const clearPersonalColor = useCallback((mode: ThemeId, varName: string) => {
    setPersonal((prev) => {
      const next: PersonalOverrides = {
        light: { ...prev.light },
        dark: { ...prev.dark },
      }
      delete next[mode][varName]
      setPersonalOverrides(next)
      return next
    })
  }, [])

  const resetPersonal = useCallback(() => {
    const empty: PersonalOverrides = { light: {}, dark: {} }
    setPersonal(empty)
    setPersonalOverrides(empty)
  }, [])

  return (
    <Ctx.Provider
      value={{
        themeId,
        setTheme,
        selectedThemeId,
        setSelectedTheme,
        refreshTheme,
        personal,
        setPersonalColor,
        clearPersonalColor,
        resetPersonal,
        userBg,
        refreshUserBg,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export const useTheme = () => useContext(Ctx)
