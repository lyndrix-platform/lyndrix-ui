import type { Dispatch } from 'react'
import type { DraftAction, EditorDraft, Mode } from '../draft'

/** Props every group panel receives from ThemeEditor. */
export interface GroupProps {
  draft: EditorDraft
  dispatch: Dispatch<DraftAction>
  /** The colour mode currently being edited (mirrors the app theme). */
  mode: Mode
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
  | 'effects'
  | 'background'
