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
  background_images: { light: string; dark: string }
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

export const SCALAR_GROUPS: ScalarGroup[] = [
  'radius',
  'spacing',
  'typography',
  'shadow',
  'blur',
  'transition',
  'gradient',
  'border',
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
  background_images: Partial<{ light: string; dark: string }>
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
    background_images: {},
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
  | { type: 'RESET_TOKEN'; group: 'colors'; key: string; mode: Mode }
  | { type: 'RESET_TOKEN'; group: ScalarGroup; key: string }
  | { type: 'RESET_GROUP'; group: 'colors' | ScalarGroup | 'background_images' }
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

/** True when this exact leaf has been edited (drives per-key reset affordances). */
export function isColorEdited(draft: EditorDraft, key: string, mode: Mode): boolean {
  return draft.edits.colors[key]?.[mode] != null
}
export function isScalarEdited(draft: EditorDraft, group: ScalarGroup, key: string): boolean {
  return draft.edits[group][key] != null
}

// ── Dirty accounting ─────────────────────────────────────────────────────────────

/** Total edited leaves across all groups (colours count per mode). */
export function dirtyCount(edits: EditorEdits): number {
  let n = 0
  for (const pair of Object.values(edits.colors)) n += Object.keys(pair).length
  for (const g of SCALAR_GROUPS) n += Object.keys(edits[g]).length
  n += Object.keys(edits.background_images).length
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
  return out
}
