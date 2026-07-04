import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SliderField, PresetRow } from '../controls'
import { effectiveScalar, isScalarEdited } from '../draft'
import {
  getUiScale,
  setUiScale,
  UI_SCALE_DEFAULT,
  UI_SCALE_MIN,
  UI_SCALE_MAX,
  UI_SCALE_STEP,
} from '../../../lib/uiScale'
import type { GroupProps } from './common'

function parseRem(v: string): number {
  return parseFloat(v) || 0
}

export default function DensityGroup({ draft, dispatch }: GroupProps) {
  const { t } = useTranslation('ui')
  const unit = parseRem(effectiveScalar(draft, 'spacing', 'unit'))
  const [scale, setScale] = useState(getUiScale)

  // Combined effective size: theme text_scale (typography token) × browser UI
  // scale (root font-size). They live in different scopes on purpose but multiply.
  const textScale = parseFloat(effectiveScalar(draft, 'typography', 'text_scale')) || 1
  const combined = Math.round(scale * textScale * 100)

  return (
    <div className="flex flex-col gap-5">
      <SliderField
        label={t('editor.density.spacing', { defaultValue: 'Spacing unit' })}
        desc={t('editor.density.spacing_desc', {
          defaultValue: 'The one density knob — every gap/padding is a multiple of this.',
        })}
        value={unit}
        min={0.2}
        max={0.3}
        step={0.005}
        display={`${unit.toFixed(3)}rem`}
        edited={isScalarEdited(draft, 'spacing', 'unit')}
        onChange={(v) =>
          dispatch({ type: 'SET_TOKEN', group: 'spacing', key: 'unit', value: `${v}rem` })
        }
        onReset={() => dispatch({ type: 'RESET_TOKEN', group: 'spacing', key: 'unit' })}
      />
      <PresetRow
        label={t('editor.density.presets', { defaultValue: 'Presets' })}
        activeValue={unit.toFixed(3)}
        presets={[
          { label: t('editor.density.compact', { defaultValue: 'Compact' }), value: '0.225' },
          { label: t('editor.density.default', { defaultValue: 'Default' }), value: '0.250' },
          { label: t('editor.density.comfy', { defaultValue: 'Comfy' }), value: '0.275' },
        ]}
        onPick={(v) =>
          dispatch({ type: 'SET_TOKEN', group: 'spacing', key: 'unit', value: `${v}rem` })
        }
      />

      {/* Browser-only UI scale — distinct scope from the theme's text_scale. */}
      <div className="border-t border-[var(--lx-border-soft)] pt-4">
        <SliderField
          label={t('editor.density.ui_scale', { defaultValue: 'UI scale (this browser)' })}
          desc={t('editor.density.ui_scale_desc', {
            defaultValue: 'Root font-size for this browser only. Multiplies with the theme text scale.',
          })}
          value={scale}
          min={UI_SCALE_MIN}
          max={UI_SCALE_MAX}
          step={UI_SCALE_STEP}
          display={`${Math.round(scale * 100)}%`}
          edited={scale !== UI_SCALE_DEFAULT}
          onChange={(v) => setScale(setUiScale(v))}
          onReset={() => setScale(setUiScale(UI_SCALE_DEFAULT))}
        />
        <p className="text-[11px] text-[var(--lx-text-muted)] mt-1">
          {t('editor.density.combined', {
            defaultValue: 'Combined effective text size: ~{{n}}% (theme scale × browser scale).',
            n: combined,
          })}
        </p>
      </div>
    </div>
  )
}
