// Phase-2 seam for account-scoped ("My account") theme preferences.
//
// TODAY nothing consumes this module — it is the single drop-in point for when
// the backend gains `GET/PUT /api/me/preferences`. Until then:
//   • ACCOUNT_SCOPE_ENABLED stays false, so the "My account" scope renders
//     visible-but-DISABLED (lock + "Requires Theming v2 Phase 2" tooltip).
//   • The stub client throws clearly if anything calls it by mistake.
//
// Wiring guide for Phase 2 — how each method maps onto the planned
// `/api/me/preferences` JSON payload (a single document, GET whole / PUT patch):
//
//   {
//     "theme": {
//       "selection": {
//         "react":   "<theme-id | null>",   // getThemeSelection('react')  / setThemeSelection('react', id)
//         "nicegui": "<theme-id | null>"     // getThemeSelection('nicegui')/ setThemeSelection('nicegui', id)
//       },
//       "token_overrides": {                 // getTokenOverrides() / setTokenOverrides(mode, patch)
//         "light": { "--lx-accent": "#...", ... },
//         "dark":  { "--lx-accent": "#...", ... }
//       }
//     }
//   }
//
//   getThemeSelection(target)      → GET  /api/me/preferences → theme.selection[target]
//   setThemeSelection(target, id)  → PUT  /api/me/preferences { theme: { selection: { [target]: id } } }
//   getTokenOverrides()            → GET  /api/me/preferences → theme.token_overrides
//   setTokenOverrides(mode, patch) → PUT  /api/me/preferences { theme: { token_overrides: { [mode]: patch } } }

import type { BrowserOverrides, OverrideMode } from './browserOverrides'

/** Flip to true once /api/me/preferences exists and PreferencesClient is real. */
export const ACCOUNT_SCOPE_ENABLED = false

/** Which UI a theme selection applies to on the server. */
export type ThemeTarget = 'react' | 'nicegui'

/**
 * Account-scoped preferences, resolved server-side and shared across a user's
 * devices. Backed by `/api/me/preferences` in Phase 2. See the payload map above.
 */
export interface PreferencesClient {
  /** Resolve the account-scoped theme id for a UI target, or null if unset. */
  getThemeSelection(target: ThemeTarget): Promise<string | null>
  /** Persist the account-scoped theme id for a UI target. */
  setThemeSelection(target: ThemeTarget, id: string): Promise<void>
  /** Resolve the account-scoped per-mode `--lx-*` token overrides. */
  getTokenOverrides(): Promise<BrowserOverrides>
  /** Merge a patch of per-mode `--lx-*` token overrides into the account scope. */
  setTokenOverrides(mode: OverrideMode, patch: Record<string, string>): Promise<void>
}

const NOT_AVAILABLE =
  'Account-scoped preferences require Theming v2 Phase 2 (/api/me/preferences), which is not available yet.'

/** No-op / throwing stub — replaced by a real implementation in Phase 2. */
export const preferencesClient: PreferencesClient = {
  getThemeSelection() {
    return Promise.reject(new Error(NOT_AVAILABLE))
  },
  setThemeSelection() {
    return Promise.reject(new Error(NOT_AVAILABLE))
  },
  getTokenOverrides() {
    return Promise.reject(new Error(NOT_AVAILABLE))
  },
  setTokenOverrides() {
    return Promise.reject(new Error(NOT_AVAILABLE))
  },
}
