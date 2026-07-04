import { useTranslation } from 'react-i18next'
import { SliderField, TextField, GroupSubhead } from '../controls'
import { effectiveScalar, isScalarEdited } from '../draft'
import type { GroupProps } from './common'

const SHADOW_KEYS = ['sm', 'md', 'lg', 'glow']
const BLUR_KEYS = ['sm', 'md', 'lg']

function parsePx(v: string): number {
  return parseFloat(v) || 0
}

export default function DepthGroup({ draft, dispatch }: GroupProps) {
  const { t } = useTranslation('ui')
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <GroupSubhead>{t('editor.depth.shadows', { defaultValue: 'Shadows' })}</GroupSubhead>
        {SHADOW_KEYS.map((key) => {
          const value = effectiveScalar(draft, 'shadow', key)
          return (
            <div key={key} className="flex items-end gap-3">
              {/* Live swatch chip rendered with the shadow value itself. */}
              <span
                aria-hidden
                className="shrink-0 w-9 h-9 rounded-lg bg-[var(--lx-surface)] border border-[var(--lx-border-soft)]"
                style={{ boxShadow: value }}
              />
              <div className="flex-1 min-w-0">
                <TextField
                  label={key}
                  mono
                  value={value}
                  edited={isScalarEdited(draft, 'shadow', key)}
                  onChange={(v) => dispatch({ type: 'SET_TOKEN', group: 'shadow', key, value: v })}
                  onReset={() => dispatch({ type: 'RESET_TOKEN', group: 'shadow', key })}
                />
              </div>
            </div>
          )
        })}
        <p className="text-[10px] text-[var(--lx-text-muted)]">
          {t('editor.depth.glow_note', {
            defaultValue: 'glow also drives the legacy --lx-glow alias.',
          })}
        </p>
      </div>

      <div className="flex flex-col gap-4 border-t border-[var(--lx-border-soft)] pt-4">
        <GroupSubhead>{t('editor.depth.blur', { defaultValue: 'Backdrop blur tiers' })}</GroupSubhead>
        {BLUR_KEYS.map((key) => {
          const px = parsePx(effectiveScalar(draft, 'blur', key))
          return (
            <SliderField
              key={key}
              label={key}
              value={px}
              min={0}
              max={40}
              step={1}
              display={`${px}px`}
              edited={isScalarEdited(draft, 'blur', key)}
              onChange={(v) => dispatch({ type: 'SET_TOKEN', group: 'blur', key, value: `${v}px` })}
              onReset={() => dispatch({ type: 'RESET_TOKEN', group: 'blur', key })}
            />
          )
        })}
      </div>
    </div>
  )
}
