import { useTranslation } from 'react-i18next'
import { SliderField, TextField, PresetRow } from '../controls'
import { effectiveScalar, isScalarEdited } from '../draft'
import type { GroupProps } from './common'

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
    </div>
  )
}
