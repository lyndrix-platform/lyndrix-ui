// Durable, offline-first cache for theme CSS variables served by core
// (GET /api/themes/{id}/css-vars). Mirrors lib/catalogStore.ts: a synchronous
// localStorage read lets us inject the selected theme before first paint with no
// flash, then revalidate against core in the background. The React-selected
// theme id is independent of the NiceGUI active theme.

export interface ThemeVars {
  light: Record<string, string>
  dark: Record<string, string>
}

const VARS_PREFIX = 'lx_theme_vars_'
const SELECTED_KEY = 'lyndrix_react_theme'

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

/** Synchronous read of cached CSS vars for a theme, or null. */
export function getThemeVars(themeId: string): ThemeVars | null {
  const raw = safeGet(`${VARS_PREFIX}${themeId}`)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as ThemeVars
    if (parsed && parsed.light && parsed.dark) return parsed
    return null
  } catch {
    return null
  }
}

export function setThemeVars(themeId: string, vars: ThemeVars): void {
  safeSet(`${VARS_PREFIX}${themeId}`, JSON.stringify(vars))
}

/** The React-selected theme id (independent of the NiceGUI active theme). */
export function getSelectedThemeId(): string | null {
  return safeGet(SELECTED_KEY)
}

export function setSelectedThemeId(themeId: string): void {
  safeSet(SELECTED_KEY, themeId)
}
