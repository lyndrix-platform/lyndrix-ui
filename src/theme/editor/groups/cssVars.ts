// Shared plumbing for the groups that edit engine-HARDCODED / engine-COMPOSED
// `--lx-*` vars through the css_variables escape-hatch (charts, terminal, the
// semantic-state extras, scrim, and the raw panel). Every such control resolves
// its current value from three layers, in order:
//
//   1. the live draft edit           (draft.edits.cssVars[mode][var])
//   2. the base pack's raw override   (draft.base.css_variables[mode][var])
//   3. the base theme's RESOLVED map  (baseCssVars[mode][var] — server truth)
//   4. the hard engine default        (DEFAULT_CSS_VARS[mode][var])
//
// Layers 1–2 come from effectiveCssVar(); 3–4 are the fallbacks applied here.

import type { Dispatch } from 'react'
import type { DraftAction, EditorDraft, Mode } from '../draft'
import { effectiveCssVar, isCssVarEdited } from '../draft'
import { DEFAULT_CSS_VARS } from '../tokenMap'
import type { ThemeVars } from '../../../lib/themeStore'

export interface CssVarTools {
  /** Effective current value of a `--lx-*` var for the active mode. */
  value: (name: string) => string
  set: (name: string, value: string) => void
  reset: (name: string) => void
  edited: (name: string) => boolean
}

export function cssVarTools(
  draft: EditorDraft,
  dispatch: Dispatch<DraftAction>,
  mode: Mode,
  baseCssVars: ThemeVars | null | undefined,
): CssVarTools {
  return {
    value: (name) =>
      effectiveCssVar(draft, name, mode) ??
      baseCssVars?.[mode]?.[name] ??
      DEFAULT_CSS_VARS[mode]?.[name] ??
      '',
    set: (name, value) => dispatch({ type: 'SET_CSS_VAR', varName: name, mode, value }),
    reset: (name) => dispatch({ type: 'RESET_CSS_VAR', varName: name, mode }),
    edited: (name) => isCssVarEdited(draft, name, mode),
  }
}
