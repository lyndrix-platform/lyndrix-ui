import { useTranslation } from 'react-i18next'
import { ColorField, GroupSubhead } from '../controls'
import { effectiveColor, isColorEdited } from '../draft'
import type { GroupProps } from './common'

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

export default function ColorsGroup({ draft, dispatch, mode }: GroupProps) {
  const { t } = useTranslation('ui')
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
    </div>
  )
}
