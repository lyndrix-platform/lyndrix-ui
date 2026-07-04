import { useTranslation } from 'react-i18next'
import { ColorField, GroupSubhead } from '../controls'
import { effectiveColor, isColorEdited } from '../draft'
import { cssVarTools } from './cssVars'
import type { GroupProps } from './common'

// Engine-HARDCODED semantic colours (no colour token drives them) — edited via
// the css_variables escape-hatch. `--lx-state-success`/`-marked` differ per
// mode; `--lx-on-accent-text` is the text colour laid on accent fills.
const EXTRA_COLOR_VARS: { name: string; labelKey: string; label: string }[] = [
  { name: '--lx-state-success', labelKey: 'editor.color.state_success', label: 'Success' },
  { name: '--lx-state-marked', labelKey: 'editor.color.state_marked', label: 'Marked / selected' },
  { name: '--lx-on-accent-text', labelKey: 'editor.color.on_accent', label: 'Text on accent' },
]

// Sub-headed colour keys per §3.2. Order + grouping match the plan; every key is
// one of the 13 colour tokens in tokens.json.
const SUBGROUPS: { titleKey: string; title: string; keys: string[] }[] = [
  { titleKey: 'editor.colors.accents', title: 'Accents', keys: ['primary', 'secondary', 'accent'] },
  { titleKey: 'editor.colors.surfaces', title: 'Surfaces', keys: ['bg_body', 'bg_surface', 'bg_elevated'] },
  { titleKey: 'editor.colors.text', title: 'Text', keys: ['text_body', 'text_muted', 'text_subtle'] },
  { titleKey: 'editor.colors.states', title: 'States', keys: ['positive', 'negative', 'info', 'warning'] },
]

const KEY_LABELS: Record<string, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  accent: 'Accent',
  bg_body: 'Page background',
  bg_surface: 'Surface',
  bg_elevated: 'Elevated',
  text_body: 'Body text',
  text_muted: 'Muted text',
  text_subtle: 'Subtle text',
  positive: 'Positive',
  negative: 'Negative',
  info: 'Info',
  warning: 'Warning',
}

export default function ColorsGroup({ draft, dispatch, mode, baseCssVars }: GroupProps) {
  const { t } = useTranslation('ui')
  const css = cssVarTools(draft, dispatch, mode, baseCssVars)
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[11px] text-[var(--lx-text-muted)]">
        {t('editor.colors.mode_hint', {
          defaultValue: 'Editing the {{mode}} palette. Switch mode in the header to edit the other.',
          mode: t(`appearance.${mode}`, { defaultValue: mode }),
        })}
      </p>
      {SUBGROUPS.map((sg) => (
        <div key={sg.title} className="flex flex-col gap-2.5">
          <GroupSubhead>{t(sg.titleKey, { defaultValue: sg.title })}</GroupSubhead>
          {sg.keys.map((key) => (
            <ColorField
              key={key}
              label={t(`editor.color.${key}`, { defaultValue: KEY_LABELS[key] ?? key })}
              value={effectiveColor(draft, key, mode)}
              edited={isColorEdited(draft, key, mode)}
              note={
                key === 'info'
                  ? t('editor.color.info_note', {
                      defaultValue: 'No live preview — feeds the server (NiceGUI) palette only.',
                    })
                  : undefined
              }
              onChange={(v) => dispatch({ type: 'SET_TOKEN', group: 'colors', key, mode, value: v })}
              onReset={() => dispatch({ type: 'RESET_TOKEN', group: 'colors', key, mode })}
            />
          ))}
        </div>
      ))}

      {/* Semantic extras — engine-hardcoded, saved via css_variables[mode]. */}
      <div className="flex flex-col gap-2.5">
        <GroupSubhead>{t('editor.colors.semantic', { defaultValue: 'Semantic extras' })}</GroupSubhead>
        {EXTRA_COLOR_VARS.map((v) => (
          <ColorField
            key={v.name}
            label={t(v.labelKey, { defaultValue: v.label })}
            value={css.value(v.name)}
            edited={css.edited(v.name)}
            onChange={(val) => css.set(v.name, val)}
            onReset={() => css.reset(v.name)}
          />
        ))}
        <p className="text-[10px] text-[var(--lx-text-muted)] leading-tight">
          {t('editor.colors.semantic_note', {
            defaultValue: 'Saved as raw css_variables overrides (no colour token drives these).',
          })}
        </p>
      </div>
    </div>
  )
}
