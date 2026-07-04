import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TextField } from '../controls'
import { GroupSubhead } from '../controls'
import { cssVarTools } from './cssVars'
import type { GroupProps } from './common'

// Completeness panel: a raw text override for EVERY `--lx-*` variable, backed by
// the css_variables[mode] escape-hatch. This is the only way to reach vars with
// no semantic control — including the engine-COMPOSED literals (--lx-border,
// --lx-border-soft, --lx-surface-glass) and the shell-only glass/popover vars
// that resolve_css_variables never emits. Writes flow through the same draft
// path as every other control (live preview + saved into css_variables).
//
// Grouped for navigability; a filter narrows the (long) list.
const SECTIONS: { titleKey: string; title: string; vars: string[] }[] = [
  {
    titleKey: 'editor.raw.surfaces',
    title: 'Surfaces & text',
    vars: ['--lx-bg', '--lx-surface', '--lx-elevated', '--lx-text', '--lx-text-muted', '--lx-on-accent-text'],
  },
  {
    titleKey: 'editor.raw.accents',
    title: 'Accents',
    vars: ['--lx-accent', '--lx-accent-2', '--lx-accent-3'],
  },
  {
    titleKey: 'editor.raw.states',
    title: 'States',
    vars: [
      '--lx-state-up', '--lx-state-down', '--lx-state-paused', '--lx-state-unknown',
      '--lx-state-success', '--lx-state-marked', '--lx-warning',
    ],
  },
  {
    titleKey: 'editor.raw.charts',
    title: 'Chart hues',
    vars: Array.from({ length: 8 }, (_, i) => `--lx-chart-${i + 1}`),
  },
  {
    titleKey: 'editor.raw.gradients',
    title: 'Gradients',
    vars: ['--lx-gradient-accent', '--lx-gradient-success', '--lx-gradient-warning', '--lx-gradient-info', '--lx-gradient-danger'],
  },
  {
    titleKey: 'editor.raw.terminal',
    title: 'Terminal / log',
    vars: ['--lx-terminal-bg', '--lx-terminal-fg', '--lx-terminal-accent', '--lx-log-bg', '--lx-log-fg', '--lx-log-accent'],
  },
  {
    titleKey: 'editor.raw.borders',
    title: 'Borders & glass (engine-composed / shell)',
    vars: [
      '--lx-border', '--lx-border-soft', '--lx-border-width', '--lx-rail-width',
      '--lx-surface-glass', '--lx-elevated-glass', '--lx-glass-border', '--lx-glass-highlight',
      '--lx-glass-shadow', '--lx-glass-blur', '--lx-glass-saturate',
      '--lx-popover-glass', '--lx-popover-shadow',
    ],
  },
  {
    titleKey: 'editor.raw.radius',
    title: 'Radius',
    vars: ['--lx-radius-sm', '--lx-radius', '--lx-radius-md', '--lx-radius-lg', '--lx-radius-xl', '--lx-radius-2xl', '--lx-radius-3xl', '--lx-radius-full'],
  },
  {
    titleKey: 'editor.raw.shadow',
    title: 'Shadow & blur',
    vars: ['--lx-shadow-sm', '--lx-shadow-md', '--lx-shadow-lg', '--lx-shadow-glow', '--lx-glow', '--lx-blur-xs', '--lx-blur-sm', '--lx-blur-md', '--lx-blur-lg'],
  },
  {
    titleKey: 'editor.raw.type',
    title: 'Typography',
    vars: ['--lx-font-sans', '--lx-font-mono', '--lx-text-scale', '--lx-text-2xs', '--lx-text-3xs'],
  },
  {
    titleKey: 'editor.raw.motion',
    title: 'Motion',
    vars: ['--lx-transition-fast', '--lx-transition-base', '--lx-transition-slow', '--lx-ease'],
  },
  {
    titleKey: 'editor.raw.misc',
    title: 'Misc',
    vars: [
      '--lx-space-unit', '--lx-icon-xs', '--lx-icon-sm', '--lx-icon-md', '--lx-icon-lg',
      '--lx-z-dropdown', '--lx-z-modal', '--lx-z-toast', '--lx-scrim',
      '--lx-badge-bg-opacity', '--lx-badge-border-opacity',
      '--lx-bg-image', '--lx-bg-image-size', '--lx-bg-image-position',
    ],
  },
]

export default function RawVariablesGroup({ draft, dispatch, mode, baseCssVars }: GroupProps) {
  const { t } = useTranslation('ui')
  const css = cssVarTools(draft, dispatch, mode, baseCssVars)
  const [filter, setFilter] = useState('')
  const q = filter.trim().toLowerCase()

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[11px] text-[var(--lx-text-muted)]">
        {t('editor.raw.intro', {
          defaultValue:
            'Override ANY --lx-* variable directly (current {{mode}} mode). Includes engine-composed vars with no semantic control. Saved into the pack’s css_variables.',
          mode: t(`appearance.${mode}`, { defaultValue: mode }),
        })}
      </p>

      <input
        className="lx-input text-sm"
        placeholder={t('editor.raw.filter', { defaultValue: 'Filter variables…' })}
        value={filter}
        spellCheck={false}
        onChange={(e) => setFilter(e.target.value)}
      />

      {SECTIONS.map((section) => {
        const vars = q ? section.vars.filter((v) => v.toLowerCase().includes(q)) : section.vars
        if (vars.length === 0) return null
        return (
          <div key={section.title} className="flex flex-col gap-2.5">
            <GroupSubhead>{t(section.titleKey, { defaultValue: section.title })}</GroupSubhead>
            {vars.map((name) => (
              <TextField
                key={name}
                label={name}
                mono
                value={css.value(name)}
                edited={css.edited(name)}
                onChange={(v) => css.set(name, v)}
                onReset={() => css.reset(name)}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}
