import { useTranslation } from 'react-i18next'
import { ColorField } from '../controls'
import { cssVarTools } from './cssVars'
import type { GroupProps } from './common'

// The categorical 8-hue data palette (--lx-chart-1..8). Engine-hardcoded per
// mode → personalised via css_variables[mode]. Shown as a swatch strip preview
// plus a ColorField per hue.
const CHART_VARS = Array.from({ length: 8 }, (_, i) => `--lx-chart-${i + 1}`)

export default function DataChartsGroup({ draft, dispatch, mode, baseCssVars }: GroupProps) {
  const { t } = useTranslation('ui')
  const css = cssVarTools(draft, dispatch, mode, baseCssVars)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[11px] text-[var(--lx-text-muted)]">
        {t('editor.charts.intro', {
          defaultValue:
            'The categorical 8-hue palette for charts and qualitative data. Saved as css_variables overrides.',
        })}
      </p>

      {/* Swatch strip preview */}
      <div className="flex h-10 w-full overflow-hidden rounded-lg border border-[var(--lx-border-soft)]">
        {CHART_VARS.map((name) => (
          <span key={name} className="flex-1" style={{ background: css.value(name) }} title={name} />
        ))}
      </div>

      <div className="flex flex-col gap-2.5">
        {CHART_VARS.map((name, i) => (
          <ColorField
            key={name}
            label={t('editor.charts.hue', { defaultValue: 'Hue {{n}}', n: i + 1 })}
            value={css.value(name)}
            edited={css.edited(name)}
            onChange={(v) => css.set(name, v)}
            onReset={() => css.reset(name)}
          />
        ))}
      </div>
    </div>
  )
}
