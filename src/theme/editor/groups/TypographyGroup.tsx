import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { SliderField, TextField, PresetRow, GroupSubhead } from '../controls'
import { effectiveScalar, isScalarEdited } from '../draft'
import type { GroupProps } from './common'

const MICRO_KEYS: { key: string; labelKey: string; label: string }[] = [
  { key: 'text_2xs', labelKey: 'editor.type.text_2xs', label: 'Micro (2xs)' },
  { key: 'text_3xs', labelKey: 'editor.type.text_3xs', label: 'Micro (3xs)' },
]

const SANS_PRESETS = [
  { label: 'System', value: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
  { label: 'Inter', value: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
]
const MONO_PRESETS = [
  { label: 'JetBrains', value: '"JetBrains Mono", "Fira Code", ui-monospace, monospace' },
  { label: 'System', value: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' },
]

export default function TypographyGroup({ draft, dispatch }: GroupProps) {
  const { t } = useTranslation('ui')
  const [advanced, setAdvanced] = useState(false)
  const scale = parseFloat(effectiveScalar(draft, 'typography', 'text_scale')) || 1
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <TextField
          label={t('editor.type.font_sans', { defaultValue: 'Sans font stack' })}
          mono
          value={effectiveScalar(draft, 'typography', 'font_sans')}
          edited={isScalarEdited(draft, 'typography', 'font_sans')}
          onChange={(v) => dispatch({ type: 'SET_TOKEN', group: 'typography', key: 'font_sans', value: v })}
          onReset={() => dispatch({ type: 'RESET_TOKEN', group: 'typography', key: 'font_sans' })}
        />
        <PresetRow
          presets={SANS_PRESETS}
          onPick={(v) => dispatch({ type: 'SET_TOKEN', group: 'typography', key: 'font_sans', value: v })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <TextField
          label={t('editor.type.font_mono', { defaultValue: 'Mono font stack' })}
          mono
          value={effectiveScalar(draft, 'typography', 'font_mono')}
          edited={isScalarEdited(draft, 'typography', 'font_mono')}
          onChange={(v) => dispatch({ type: 'SET_TOKEN', group: 'typography', key: 'font_mono', value: v })}
          onReset={() => dispatch({ type: 'RESET_TOKEN', group: 'typography', key: 'font_mono' })}
        />
        <PresetRow
          presets={MONO_PRESETS}
          onPick={(v) => dispatch({ type: 'SET_TOKEN', group: 'typography', key: 'font_mono', value: v })}
        />
      </div>

      <SliderField
        label={t('editor.type.text_scale', { defaultValue: 'Text scale' })}
        desc={t('editor.type.text_scale_desc', {
          defaultValue: 'Theme-level type scale (saved with the pack, all viewers see it).',
        })}
        value={scale}
        min={0.85}
        max={1.25}
        step={0.01}
        display={`${scale.toFixed(2)}×`}
        edited={isScalarEdited(draft, 'typography', 'text_scale')}
        onChange={(v) =>
          dispatch({ type: 'SET_TOKEN', group: 'typography', key: 'text_scale', value: String(v) })
        }
        onReset={() => dispatch({ type: 'RESET_TOKEN', group: 'typography', key: 'text_scale' })}
      />

      {/* Micro-typography: eyebrow/meta sizes. Default is a calc() that tracks
          the text scale above; the raw override lets a theme pin them exactly. */}
      <div className="border-t border-[var(--lx-border-soft)] pt-3">
        <button
          onClick={() => setAdvanced((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-medium text-[var(--lx-text-muted)] hover:text-[var(--lx-text)]"
        >
          <ChevronDown size={14} className={`transition-transform ${advanced ? 'rotate-180' : ''}`} />
          {t('editor.type.micro', { defaultValue: 'Advanced — micro type sizes' })}
        </button>
        {advanced && (
          <div className="flex flex-col gap-3 mt-3">
            <GroupSubhead>{t('editor.type.micro', { defaultValue: 'Micro type sizes' })}</GroupSubhead>
            <p className="text-[11px] text-[var(--lx-text-muted)] -mt-1">
              {t('editor.type.micro_desc', {
                defaultValue:
                  'Eyebrow / meta label sizes. Default is calc(rem × text scale), so they follow the scale above — override to pin exactly.',
              })}
            </p>
            {MICRO_KEYS.map(({ key, labelKey, label }) => {
              const value = effectiveScalar(draft, 'typography', key)
              return (
                <div key={key} className="flex items-center gap-3">
                  <span
                    className="shrink-0 text-[var(--lx-text)]"
                    style={{ fontSize: value, width: 44 }}
                  >
                    Aa
                  </span>
                  <div className="flex-1 min-w-0">
                    <TextField
                      label={t(labelKey, { defaultValue: label })}
                      mono
                      value={value}
                      edited={isScalarEdited(draft, 'typography', key)}
                      onChange={(v) => dispatch({ type: 'SET_TOKEN', group: 'typography', key, value: v })}
                      onReset={() => dispatch({ type: 'RESET_TOKEN', group: 'typography', key })}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
