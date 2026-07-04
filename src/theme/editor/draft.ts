// Editor draft state: the token model + a useReducer over it.
//
// The data model is EXACTLY the tokens.json shape (see tokenMap.DEFAULT_TOKENS).
// `EditorDraft` keeps the loaded base pack immutable and layers sparse `edits`
// on top, so we can always diff (dirty count), reset, and re-serialise cleanly.
// Only edited leaves live in `edits`; everything else stays at the base value
// (and, for the live app, stays server-resolved).

import { cloneDefaultTokens } from './tokenMap'

export type Mode = 'light' | 'dark'

export interface ColorPair {
  light: string
  dark: string
}

/** The tokens.json shape. Non-colour categories are flat `key -> value` maps. */
export interface ThemeTokens {
  colors: Record<string, ColorPair>
  radius: Record<string, string>
  spacing: Record<string, string>
  typography: Record<string, string>
  shadow: Record<string, string>
  blur: Record<string, string>
  transition: Record<string, string>
  gradient: Record<string, string>
  border: Record<string, string>
  // Theming v2 T0 categories. No dedicated editor group yet (T0d, deferred), but
  // carried in the model so a saved pack round-trips them instead of dropping
  // them (backfillTokens preserves them; mergeTokens keeps them via base clone).
  icon: Record<string, string>
  zindex: Record<string, string>
  effect: Record<string, string>
  background_images: { light: string; dark: string }
  // Escape-hatch: raw per-mode `--lx-*` overrides (mirrors tokens.json
  // `css_variables[mode]`). This is the ONLY way to personalise engine-HARDCODED
  // vars that have no semantic token category (chart-*, terminal-*,
  // state-success/-marked, on-accent-text, scrim) and engine-COMPOSED literals
  // (border, border-soft, surface-glass). The engine applies these last, so they
  // win over every derived value.
  css_variables: { light: Record<string, string>; dark: Record<string, string> }
}

/** The flat, non-colour, mode-independent token categories. */
export type ScalarGroup =
  | 'radius'
  | 'spacing'
  | 'typography'
  | 'shadow'
  | 'blur'
  | 'transition'
  | 'gradient'
  | 'border'
  | 'icon'
  | 'zindex'
  | 'effect'

export const SCALAR_GROUPS: ScalarGroup[] = [
  'radius',
  'spacing',
  'typography',
  'shadow',
  'blur',
  'transition',
  'gradient',
  'border',
  'icon',
  'zindex',
  'effect',
]

/** Sparse edits: same shape as ThemeTokens but every leaf optional. */
export interface EditorEdits {
  colors: Record<string, Partial<ColorPair>>
  radius: Record<string, string>
  spacing: Record<string, string>
  typography: Record<string, string>
  shadow: Record<string, string>
  blur: Record<string, string>
  transition: Record<string, string>
  gradient: Record<string, string>
  border: Record<string, string>
  icon: Record<string, string>
  zindex: Record<string, string>
  effect: Record<string, string>
  background_images: Partial<{ light: string; dark: string }>
  /** Raw `--lx-*` overrides, per mode (feeds tokens.json css_variables). */
  cssVars: { light: Record<string, string>; dark: Record<string, string> }
}

export interface EditorDraft {
  baseThemeId: string
  base: ThemeTokens
  edits: EditorEdits
}

export function emptyEdits(): EditorEdits {
  return {
    colors: {},
    radius: {},
    spacing: {},
    typography: {},
    shadow: {},
    blur: {},
    transition: {},
    gradient: {},
    border: {},
    icon: {},
    zindex: {},
    effect: {},
    background_images: {},
    cssVars: { light: {}, dark: {} },
  }
}

export function initialDraft(): EditorDraft {
  return { baseThemeId: 'default', base: cloneDefaultTokens(), edits: emptyEdits() }
}

// ── Reducer ─────────────────────────────────────────────────────────────────────

export type DraftAction =
  | { type: 'LOAD_BASE'; baseThemeId: string; base: ThemeTokens }
  | { type: 'SET_TOKEN'; group: 'colors'; key: string; mode: Mode; value: string }
  | { type: 'SET_TOKEN'; group: ScalarGroup; key: string; value: string }
  | { type: 'SET_TOKEN'; group: 'background_images'; mode: Mode; value: string }
  | { type: 'SET_CSS_VAR'; varName: string; mode: Mode; value: string }
  | { type: 'RESET_TOKEN'; group: 'colors'; key: string; mode: Mode }
  | { type: 'RESET_TOKEN'; group: ScalarGroup; key: string }
  | { type: 'RESET_CSS_VAR'; varName: string; mode: Mode }
  | { type: 'RESET_GROUP'; group: 'colors' | ScalarGroup | 'background_images' | 'cssVars' }
  | { type: 'RESET_ALL' }

export function draftReducer(state: EditorDraft, action: DraftAction): EditorDraft {
  switch (action.type) {
    case 'LOAD_BASE':
      return { baseThemeId: action.baseThemeId, base: action.base, edits: emptyEdits() }

    case 'SET_TOKEN': {
      const edits = { ...state.edits }
      if (action.group === 'colors') {
        const prev = edits.colors[action.key] ?? {}
        edits.colors = { ...edits.colors, [action.key]: { ...prev, [action.mode]: action.value } }
      } else if (action.group === 'background_images') {
        edits.background_images = { ...edits.background_images, [action.mode]: action.value }
      } else {
        edits[action.group] = { ...edits[action.group], [action.key]: action.value }
      }
      return { ...state, edits }
    }

    case 'SET_CSS_VAR': {
      const edits = { ...state.edits }
      const prev = edits.cssVars[action.mode]
      edits.cssVars = {
        ...edits.cssVars,
        [action.mode]: { ...prev, [action.varName]: action.value },
      }
      return { ...state, edits }
    }

    case 'RESET_CSS_VAR': {
      const edits = { ...state.edits }
      const next = { ...edits.cssVars[action.mode] }
      delete next[action.varName]
      edits.cssVars = { ...edits.cssVars, [action.mode]: next }
      return { ...state, edits }
    }

    case 'RESET_TOKEN': {
      const edits = { ...state.edits }
      if (action.group === 'colors') {
        const prev = { ...(edits.colors[action.key] ?? {}) }
        delete prev[action.mode]
        const nextColors = { ...edits.colors }
        if (Object.keys(prev).length === 0) delete nextColors[action.key]
        else nextColors[action.key] = prev
        edits.colors = nextColors
      } else {
        const next = { ...edits[action.group] }
        delete next[action.key]
        edits[action.group] = next
      }
      return { ...state, edits }
    }

    case 'RESET_GROUP': {
      const edits = { ...state.edits }
      if (action.group === 'colors') edits.colors = {}
      else if (action.group === 'background_images') edits.background_images = {}
      else if (action.group === 'cssVars') edits.cssVars = { light: {}, dark: {} }
      else edits[action.group] = {}
      return { ...state, edits }
    }

    case 'RESET_ALL':
      return { ...state, edits: emptyEdits() }

    default:
      return state
  }
}

// ── Effective-value helpers (edit wins over base) ────────────────────────────────

export function effectiveColor(draft: EditorDraft, key: string, mode: Mode): string {
  const edit = draft.edits.colors[key]?.[mode]
  if (edit != null) return edit
  return draft.base.colors[key]?.[mode] ?? '#000000'
}

export function effectiveScalar(draft: EditorDraft, group: ScalarGroup, key: string): string {
  const edit = draft.edits[group][key]
  if (edit != null) return edit
  return draft.base[group][key] ?? ''
}

export function effectiveBg(draft: EditorDraft, mode: Mode): string {
  const edit = draft.edits.background_images[mode]
  if (edit != null) return edit
  return draft.base.background_images[mode] ?? ''
}

/**
 * Effective raw `--lx-*` override for a mode, or undefined when neither the
 * draft nor the base pack pins it. Callers OR this with the base RESOLVED
 * css-vars (server-authoritative) and finally a hard default, so a control can
 * always seed itself with the real current value even for engine-hardcoded vars
 * the pack never overrode.
 */
export function effectiveCssVar(draft: EditorDraft, varName: string, mode: Mode): string | undefined {
  const edit = draft.edits.cssVars[mode]?.[varName]
  if (edit != null) return edit
  return draft.base.css_variables?.[mode]?.[varName]
}

/** True when this exact leaf has been edited (drives per-key reset affordances). */
export function isColorEdited(draft: EditorDraft, key: string, mode: Mode): boolean {
  return draft.edits.colors[key]?.[mode] != null
}
export function isScalarEdited(draft: EditorDraft, group: ScalarGroup, key: string): boolean {
  return draft.edits[group][key] != null
}
export function isCssVarEdited(draft: EditorDraft, varName: string, mode: Mode): boolean {
  return draft.edits.cssVars[mode]?.[varName] != null
}

// ── Dirty accounting ─────────────────────────────────────────────────────────────

/** Count of edited raw `--lx-*` overrides (per mode leaf). */
export function cssVarsDirty(edits: EditorEdits): number {
  return Object.keys(edits.cssVars.light).length + Object.keys(edits.cssVars.dark).length
}

/** Total edited leaves across all groups (colours count per mode). */
export function dirtyCount(edits: EditorEdits): number {
  let n = 0
  for (const pair of Object.values(edits.colors)) n += Object.keys(pair).length
  for (const g of SCALAR_GROUPS) n += Object.keys(edits[g]).length
  n += Object.keys(edits.background_images).length
  n += cssVarsDirty(edits)
  return n
}

/** Edited-leaf count per group id (for the group rail badges). */
export function dirtyCountByGroup(edits: EditorEdits): Record<string, number> {
  const out: Record<string, number> = {}
  let colours = 0
  for (const pair of Object.values(edits.colors)) colours += Object.keys(pair).length
  if (colours) out.colors = colours
  for (const g of SCALAR_GROUPS) {
    const c = Object.keys(edits[g]).length
    if (c) out[g] = c
  }
  const bg = Object.keys(edits.background_images).length
  if (bg) out.background_images = bg
  const css = cssVarsDirty(edits)
  if (css) out.cssVars = css
  return out
}

/**
 * Bucket edited raw `--lx-*` overrides onto the rail groups that own them, so a
 * semantic control (charts, terminal, states, scrim) surfaces its change count
 * on its own rail entry and the rest falls to the Advanced/raw panel. Counts
 * both modes. Keyed by rail group id.
 */
export function cssVarsDirtyByRail(edits: EditorEdits): Record<string, number> {
  const out: Record<string, number> = {}
  const bump = (bucket: string) => {
    out[bucket] = (out[bucket] ?? 0) + 1
  }
  for (const mode of ['light', 'dark'] as const) {
    for (const name of Object.keys(edits.cssVars[mode])) {
      if (name.startsWith('--lx-chart-')) bump('charts')
      else if (name.startsWith('--lx-terminal')) bump('terminal')
      else if (name === '--lx-state-success' || name === '--lx-state-marked' || name === '--lx-on-accent-text')
        bump('colors')
      else if (name === '--lx-scrim') bump('effects')
      else bump('raw')
    }
  }
  return out
}

// ── Merge (base ⊕ edits → full tokens.json) — used by step-4 pack save ───────────

export function mergeTokens(base: ThemeTokens, edits: EditorEdits): ThemeTokens {
  const out: ThemeTokens = JSON.parse(JSON.stringify(base)) as ThemeTokens
  for (const [k, pair] of Object.entries(edits.colors)) {
    out.colors[k] = { ...(out.colors[k] ?? { light: '#000000', dark: '#000000' }), ...pair }
  }
  for (const g of SCALAR_GROUPS) out[g] = { ...out[g], ...edits[g] }
  out.background_images = { ...out.background_images, ...edits.background_images }
  // Raw `--lx-*` overrides → css_variables[mode], base ⊕ edits per mode. This is
  // the escape-hatch persistence for engine-hardcoded/composed vars (the engine
  // applies css_variables last, so they win).
  const baseCss = base.css_variables ?? { light: {}, dark: {} }
  out.css_variables = {
    light: { ...baseCss.light, ...edits.cssVars.light },
    dark: { ...baseCss.dark, ...edits.cssVars.dark },
  }
  return out
}
