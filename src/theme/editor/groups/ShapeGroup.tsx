import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { SliderField, TextField } from '../controls'
import { effectiveScalar, isScalarEdited } from '../draft'
import type { GroupProps } from './common'

const RADIUS_KEYS = ['sm', 'DEFAULT', 'md', 'lg', 'xl', '2xl', '3xl', 'full']

/** Split a CSS length into [number, unit]; non-numeric (e.g. 9999px) still parses. */
function parseLen(v: string): [number, string] {
  const m = v.trim().match(/^([\d.]+)\s*([a-z%]*)$/i)
  if (!m) return [0, 'rem']
  return [parseFloat(m[1]) || 0, m[2] || '']
}

export default function ShapeGroup({ draft, dispatch }: GroupProps) {
  const { t } = useTranslation('ui')
  const [factor, setFactor] = useState(1)
  const [advanced, setAdvanced] = useState(false)

  // Master roundness: scale every base radius (except the pill `full`) by the
  // factor. Reads from the immutable base each time, so the factor is stable.
  function applyRoundness(f: number) {
    setFactor(f)
    for (const key of RADIUS_KEYS) {
      if (key === 'full') continue
      const [n, unit] = parseLen(draft.base.radius[key] ?? '0rem')
      const scaled = +(n * f).toFixed(4)
      dispatch({ type: 'SET_TOKEN', group: 'radius', key, value: `${scaled}${unit}` })
    }
  }

  const [bw] = parseLen(effectiveScalar(draft, 'border', 'width'))

  return (
    <div className="flex flex-col gap-5">
      <SliderField
        label={t('editor.shape.roundness', { defaultValue: 'Roundness' })}
        desc={t('editor.shape.roundness_desc', {
          defaultValue: 'Scales every corner radius. 1× keeps the base theme; 0× is fully square.',
        })}
        value={factor}
        min={0}
        max={2}
        step={0.05}
        display={`${factor.toFixed(2)}×`}
        edited={factor !== 1}
        onChange={applyRoundness}
        onReset={() => {
          setFactor(1)
          dispatch({ type: 'RESET_GROUP', group: 'radius' })
        }}
      />

      <SliderField
        label={t('editor.shape.border_width', { defaultValue: 'Border width' })}
        desc={t('editor.shape.border_width_desc', { defaultValue: 'Base outline thickness.' })}
        value={bw}
        min={0}
        max={4}
        step={0.5}
        display={`${bw}px`}
        edited={isScalarEdited(draft, 'border', 'width')}
        onChange={(v) => dispatch({ type: 'SET_TOKEN', group: 'border', key: 'width', value: `${v}px` })}
        onReset={() => dispatch({ type: 'RESET_TOKEN', group: 'border', key: 'width' })}
      />

      {/* Advanced: raw per-key radius inputs */}
      <div className="border-t border-[var(--lx-border-soft)] pt-3">
        <button
          onClick={() => setAdvanced((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-medium text-[var(--lx-text-muted)] hover:text-[var(--lx-text)]"
        >
          <ChevronDown size={14} className={`transition-transform ${advanced ? 'rotate-180' : ''}`} />
          {t('editor.shape.advanced', { defaultValue: 'Advanced — per-radius values' })}
        </button>
        {advanced && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            {RADIUS_KEYS.map((key) => (
              <TextField
                key={key}
                label={key === 'DEFAULT' ? 'default' : key}
                mono
                value={effectiveScalar(draft, 'radius', key)}
                edited={isScalarEdited(draft, 'radius', key)}
                onChange={(v) => dispatch({ type: 'SET_TOKEN', group: 'radius', key, value: v })}
                onReset={() => dispatch({ type: 'RESET_TOKEN', group: 'radius', key })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
