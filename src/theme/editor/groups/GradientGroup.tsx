import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SliderField, TextField, GroupSubhead } from '../controls'
import { effectiveScalar, isScalarEdited } from '../draft'
import type { GroupProps } from './common'

const ACCENT_CANONICAL = (angle: number) =>
  `linear-gradient(${angle}deg, var(--lx-accent), var(--lx-accent-2), var(--lx-accent-3))`

// Canonical token-built recipes for the semantic header-stripe family — mirror
// the engine's _GRADIENT_DEFAULTS so "Rebuild from tokens" restores the theme's
// derived value exactly (re-skins with the state/chart tokens).
const CANONICAL: Record<string, string> = {
  success: 'linear-gradient(90deg, var(--lx-state-success), var(--lx-chart-8))',
  warning: 'linear-gradient(90deg, var(--lx-warning), var(--lx-chart-4))',
  info: 'linear-gradient(90deg, var(--lx-accent-2), var(--lx-accent))',
  danger: 'linear-gradient(90deg, var(--lx-state-down), var(--lx-chart-5))',
}

const FAMILY: { key: string; labelKey: string; label: string }[] = [
  { key: 'success', labelKey: 'editor.gradient.success', label: 'Success' },
  { key: 'warning', labelKey: 'editor.gradient.warning', label: 'Warning' },
  { key: 'info', labelKey: 'editor.gradient.info', label: 'Info' },
  { key: 'danger', labelKey: 'editor.gradient.danger', label: 'Danger' },
]

function parseAngle(v: string): number {
  const m = v.match(/(-?[\d.]+)deg/)
  return m ? parseFloat(m[1]) : 135
}

export default function GradientGroup({ draft, dispatch }: GroupProps) {
  const { t } = useTranslation('ui')
  const accent = effectiveScalar(draft, 'gradient', 'accent')
  const [angle, setAngle] = useState(() => parseAngle(accent))

  const setGradient = (key: string, next: string) =>
    dispatch({ type: 'SET_TOKEN', group: 'gradient', key, value: next })
  const resetGradient = (key: string) =>
    dispatch({ type: 'RESET_TOKEN', group: 'gradient', key })

  return (
    <div className="flex flex-col gap-6">
      {/* Primary accent gradient — keeps the angle/rebuild affordance. */}
      <div className="flex flex-col gap-3">
        <GroupSubhead>{t('editor.gradient.accent', { defaultValue: 'Accent gradient' })}</GroupSubhead>
        <div
          className="h-16 rounded-xl border border-[var(--lx-border-soft)]"
          style={{ background: accent }}
        />
        <div className="flex flex-wrap gap-2">
          <button
            className="lx-btn lx-btn--secondary lx-btn--sm"
            onClick={() => setGradient('accent', ACCENT_CANONICAL(angle))}
          >
            {t('editor.gradient.rebuild', { defaultValue: 'Rebuild from accent colours' })}
          </button>
          {isScalarEdited(draft, 'gradient', 'accent') && (
            <button
              className="lx-btn lx-btn--ghost lx-btn--sm"
              onClick={() => resetGradient('accent')}
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
            setGradient('accent', ACCENT_CANONICAL(v))
          }}
        />
        <TextField
          label={t('editor.gradient.raw', { defaultValue: 'Raw gradient value' })}
          mono
          value={accent}
          edited={isScalarEdited(draft, 'gradient', 'accent')}
          onChange={(v) => setGradient('accent', v)}
          onReset={() => resetGradient('accent')}
        />
      </div>

      {/* Semantic header-stripe family. */}
      <div className="flex flex-col gap-5 border-t border-[var(--lx-border-soft)] pt-4">
        <GroupSubhead>{t('editor.gradient.family', { defaultValue: 'Semantic stripe family' })}</GroupSubhead>
        {FAMILY.map(({ key, labelKey, label }) => {
          const value = effectiveScalar(draft, 'gradient', key)
          const edited = isScalarEdited(draft, 'gradient', key)
          return (
            <div key={key} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-[var(--lx-text)]">
                  {t(labelKey, { defaultValue: label })}
                </span>
                <span className="flex items-center gap-2">
                  <button
                    className="text-[10px] text-[var(--lx-text-muted)] hover:text-[var(--lx-accent)]"
                    onClick={() => setGradient(key, CANONICAL[key])}
                  >
                    {t('editor.gradient.rebuild_tokens', { defaultValue: 'rebuild from tokens' })}
                  </button>
                  {edited && (
                    <button
                      className="text-[10px] text-[var(--lx-text-muted)] hover:text-[var(--lx-accent)]"
                      onClick={() => resetGradient(key)}
                    >
                      reset
                    </button>
                  )}
                </span>
              </div>
              <div
                className="h-9 rounded-lg border border-[var(--lx-border-soft)]"
                style={{ background: value }}
                aria-label={t(labelKey, { defaultValue: label })}
              />
              <TextField
                label={t('editor.gradient.raw', { defaultValue: 'Raw gradient value' })}
                mono
                value={value}
                edited={edited}
                onChange={(v) => setGradient(key, v)}
                onReset={() => resetGradient(key)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
