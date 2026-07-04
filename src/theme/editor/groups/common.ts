import type { Dispatch } from 'react'
import type { DraftAction, EditorDraft, Mode } from '../draft'
import type { ThemeVars } from '../../../lib/themeStore'

/** Props every group panel receives from ThemeEditor. */
export interface GroupProps {
  draft: EditorDraft
  dispatch: Dispatch<DraftAction>
  /** The colour mode currently being edited (mirrors the app theme). */
  mode: Mode
  /**
   * The base theme's server-RESOLVED `--lx-*` map (per mode), used as the
   * authoritative seed for controls that edit engine-hardcoded/composed vars via
   * the css_variables escape-hatch (charts, terminal, states, raw panel). Null
   * until fetched (offline open) — controls fall back to DEFAULT_CSS_VARS.
   */
  baseCssVars?: ThemeVars | null
  /**
   * Whether the base pack's background-image assets are copied into a saved pack
   * (Background group only). Lifted to ThemeEditor so the save flow can read it.
   */
  carryOverAssets?: boolean
  onCarryOverChange?: (value: boolean) => void
}

/** Group identifiers, in rail order. */
export type GroupId =
  | 'colors'
  | 'shape'
  | 'density'
  | 'typography'
  | 'depth'
  | 'motion'
  | 'gradient'
  | 'charts'
  | 'terminal'
  | 'sizing'
  | 'effects'
  | 'background'
  | 'raw'
