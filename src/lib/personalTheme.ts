// Client-side theme personalization: per-user --lx-* color overrides layered on
// top of the selected server theme. Stored locally (per browser) and injected as
// the highest-precedence <style> by ThemeProvider, so a picked primary color wins
// over the theme without touching the server theme catalog. Overrides are kept
// per mode (light/dark) since a colour that reads well in dark may not in light.

export interface PersonalOverrides {
  light: Record<string, string>
  dark: Record<string, string>
}

const KEY = 'lyndrix_personal_theme'

export function getPersonalOverrides(): PersonalOverrides {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { light: {}, dark: {} }
    const p = JSON.parse(raw) as Partial<PersonalOverrides>
    return { light: p.light ?? {}, dark: p.dark ?? {} }
  } catch {
    return { light: {}, dark: {} }
  }
}

export function setPersonalOverrides(o: PersonalOverrides): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(o))
  } catch {
    // private mode / quota — best-effort.
  }
}

export function hasAnyOverride(o: PersonalOverrides): boolean {
  return Object.keys(o.light).length > 0 || Object.keys(o.dark).length > 0
}
