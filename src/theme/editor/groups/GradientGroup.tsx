import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SliderField, TextField } from '../controls'
import { effectiveScalar, isScalarEdited } from '../draft'
import type { GroupProps } from './common'

const CANONICAL = (angle: number) =>
  `linear-gradient(${angle}deg, var(--lx-accent), var(--lx-accent-2), var(--lx-accent-3))`

function parseAngle(v: string): number {
  const m = v.match(/(-?[\d.]+)deg/)
  return m ? parseFloat(m[1]) : 135
}

export default function GradientGroup({ draft, dispatch }: GroupProps) {
  const { t } = useTranslation('ui')
  const value = effectiveScalar(draft, 'gradient', 'accent')
  const [angle, setAngle] = useState(() => parseAngle(value))

  function setAccentGradient(next: string) {
    dispatch({ type: 'SET_TOKEN', group: 'gradient', key: 'accent', value: next })
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Live preview bar */}
      <div
        className="h-16 rounded-xl border border-[var(--lx-border-soft)]"
        style={{ background: value }}
      />

      <div className="flex flex-wrap gap-2">
        <button
          className="lx-btn lx-btn--secondary lx-btn--sm"
          onClick={() => setAccentGradient(CANONICAL(angle))}
        >
          {t('editor.gradient.rebuild', { defaultValue: 'Rebuild from accent colours' })}
        </button>
        {isScalarEdited(draft, 'gradient', 'accent') && (
          <button
            className="lx-btn lx-btn--ghost lx-btn--sm"
            onClick={() => dispatch({ type: 'RESET_TOKEN', group: 'gradient', key: 'accent' })}
          >
            {t('editor.reset', { defaultValue: 'Reset' })}
          </button>
        )}
      </div>

      <SliderField
        label={t('editor.gradient.angle', { defaultValue: 'Angle' })}
        desc={t('editor.gradient.angle_desc', {
          defaultValue: 'Rebuilds the accent gradient at this angle.',
        })}
        value={angle}
        min={0}
        max={360}
        step={5}
        display={`${angle}°`}
        onChange={(v) => {
          setAngle(v)
          setAccentGradient(CANONICAL(v))
        }}
      />

      <TextField
        label={t('editor.gradient.raw', { defaultValue: 'Raw gradient value' })}
        mono
        value={value}
        edited={isScalarEdited(draft, 'gradient', 'accent')}
        onChange={setAccentGradient}
        onReset={() => dispatch({ type: 'RESET_TOKEN', group: 'gradient', key: 'accent' })}
      />
    </div>
  )
}
