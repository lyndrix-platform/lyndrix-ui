import { useTranslation } from 'react-i18next'
import { SliderField, SelectField, TextField } from '../controls'
import { effectiveScalar, isScalarEdited } from '../draft'
import type { GroupProps } from './common'

const DURATION_KEYS: { key: string; label: string }[] = [
  { key: 'fast', label: 'Fast' },
  { key: 'base', label: 'Base' },
  { key: 'slow', label: 'Slow' },
]

// Named easing presets; anything else is treated as a custom cubic-bezier.
const EASE_PRESETS: Record<string, string> = {
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  'ease-in-out': 'ease-in-out',
  linear: 'linear',
}

function parseMs(v: string): number {
  return parseFloat(v) || 0
}

export default function MotionGroup({ draft, dispatch }: GroupProps) {
  const { t } = useTranslation('ui')
  const ease = effectiveScalar(draft, 'transition', 'ease')
  const easeKind = Object.entries(EASE_PRESETS).find(([, v]) => v === ease)?.[0] ?? 'custom'

  return (
    <div className="flex flex-col gap-5">
      {DURATION_KEYS.map(({ key, label }) => {
        const ms = parseMs(effectiveScalar(draft, 'transition', key))
        return (
          <SliderField
            key={key}
            label={t(`editor.motion.${key}`, { defaultValue: `${label} transition` })}
            value={ms}
            min={0}
            max={800}
            step={10}
            display={`${ms}ms`}
            edited={isScalarEdited(draft, 'transition', key)}
            onChange={(v) => dispatch({ type: 'SET_TOKEN', group: 'transition', key, value: `${v}ms` })}
            onReset={() => dispatch({ type: 'RESET_TOKEN', group: 'transition', key })}
          />
        )
      })}

      <div className="flex flex-col gap-2 border-t border-[var(--lx-border-soft)] pt-4">
        <SelectField
          label={t('editor.motion.ease', { defaultValue: 'Easing' })}
          value={easeKind}
          options={[
            { value: 'standard', label: t('editor.motion.ease_standard', { defaultValue: 'Standard' }) },
            { value: 'ease-in-out', label: 'ease-in-out' },
            { value: 'linear', label: 'linear' },
            { value: 'custom', label: t('editor.motion.ease_custom', { defaultValue: 'Custom cubic-bezier' }) },
          ]}
          onChange={(kind) => {
            if (kind === 'custom') return
            dispatch({ type: 'SET_TOKEN', group: 'transition', key: 'ease', value: EASE_PRESETS[kind] })
          }}
        />
        {easeKind === 'custom' && (
          <TextField
            label={t('editor.motion.ease_value', { defaultValue: 'cubic-bezier(...)' })}
            mono
            value={ease}
            edited={isScalarEdited(draft, 'transition', 'ease')}
            onChange={(v) => dispatch({ type: 'SET_TOKEN', group: 'transition', key: 'ease', value: v })}
            onReset={() => dispatch({ type: 'RESET_TOKEN', group: 'transition', key: 'ease' })}
          />
        )}
      </div>
    </div>
  )
}
