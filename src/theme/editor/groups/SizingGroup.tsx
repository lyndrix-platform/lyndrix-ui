import { useTranslation } from 'react-i18next'
import { Circle } from 'lucide-react'
import { SliderField, NumberField, GroupSubhead } from '../controls'
import { effectiveScalar, isScalarEdited } from '../draft'
import type { GroupProps } from './common'

const ICON_KEYS = ['xs', 'sm', 'md', 'lg']
const Z_KEYS: { key: string; labelKey: string; label: string }[] = [
  { key: 'dropdown', labelKey: 'editor.sizing.z_dropdown', label: 'Dropdown' },
  { key: 'modal', labelKey: 'editor.sizing.z_modal', label: 'Modal' },
  { key: 'toast', labelKey: 'editor.sizing.z_toast', label: 'Toast' },
]

function parsePx(v: string): number {
  return parseFloat(v) || 0
}

export default function SizingGroup({ draft, dispatch }: GroupProps) {
  const { t } = useTranslation('ui')
  const rail = parsePx(effectiveScalar(draft, 'border', 'rail'))

  return (
    <div className="flex flex-col gap-6">
      {/* Icon-size scale — px sliders, each with a sample glyph at that size. */}
      <div className="flex flex-col gap-4">
        <GroupSubhead>{t('editor.sizing.icons', { defaultValue: 'Icon sizes' })}</GroupSubhead>
        {ICON_KEYS.map((key) => {
          const px = parsePx(effectiveScalar(draft, 'icon', key))
          return (
            <div key={key} className="flex items-center gap-3">
              <Circle size={px || 1} className="shrink-0 text-[var(--lx-accent)]" style={{ width: 36 }} />
              <div className="flex-1 min-w-0">
                <SliderField
                  label={key}
                  value={px}
                  min={8}
                  max={48}
                  step={1}
                  display={`${px}px`}
                  edited={isScalarEdited(draft, 'icon', key)}
                  onChange={(v) => dispatch({ type: 'SET_TOKEN', group: 'icon', key, value: `${v}px` })}
                  onReset={() => dispatch({ type: 'RESET_TOKEN', group: 'icon', key })}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Rail width — the active-nav accent bar thickness. */}
      <div className="border-t border-[var(--lx-border-soft)] pt-4">
        <SliderField
          label={t('editor.sizing.rail', { defaultValue: 'Rail width' })}
          desc={t('editor.sizing.rail_desc', {
            defaultValue: 'Thickness of the active-nav accent rail.',
          })}
          value={rail}
          min={0}
          max={8}
          step={1}
          display={`${rail}px`}
          edited={isScalarEdited(draft, 'border', 'rail')}
          onChange={(v) => dispatch({ type: 'SET_TOKEN', group: 'border', key: 'rail', value: `${v}px` })}
          onReset={() => dispatch({ type: 'RESET_TOKEN', group: 'border', key: 'rail' })}
        />
      </div>

      {/* Z-index scale — numeric only (no visual preview). */}
      <div className="border-t border-[var(--lx-border-soft)] pt-4 flex flex-col gap-3">
        <GroupSubhead>{t('editor.sizing.zindex', { defaultValue: 'Stacking order (z-index)' })}</GroupSubhead>
        <p className="text-[11px] text-[var(--lx-text-muted)] -mt-1">
          {t('editor.sizing.zindex_note', {
            defaultValue: 'Ordering of floating layers. No visual preview — keep dropdown < modal < toast.',
          })}
        </p>
        <div className="grid grid-cols-3 gap-3">
          {Z_KEYS.map(({ key, labelKey, label }) => (
            <NumberField
              key={key}
              label={t(labelKey, { defaultValue: label })}
              value={parseFloat(effectiveScalar(draft, 'zindex', key)) || 0}
              min={0}
              step={100}
              edited={isScalarEdited(draft, 'zindex', key)}
              onChange={(v) => dispatch({ type: 'SET_TOKEN', group: 'zindex', key, value: String(Math.round(v)) })}
              onReset={() => dispatch({ type: 'RESET_TOKEN', group: 'zindex', key })}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
