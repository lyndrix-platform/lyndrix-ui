import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { apiFetch } from '../../lib/api'
import type { EditableSettingMeta } from '../../lib/types'
import SettingsForm from '../../components/SettingsForm'

/**
 * App-side wrapper around the generic, shareable `SettingsForm`. Wires it to the
 * system config endpoint and the `ui` i18n namespace, preserving the public
 * signature used by SettingsPage. The generic form itself is exposed to plugins
 * via `window.__lyndrix_ui` (with their own submitFn / namespace).
 */
export default function EditableSettingsForm({
  metas,
  config,
  envLocked,
}: {
  metas: EditableSettingMeta[]
  config: Record<string, unknown>
  envLocked: string[]
}) {
  const { t } = useTranslation('ui')
  const qc = useQueryClient()

  return (
    <SettingsForm
      metas={metas}
      config={config}
      envLocked={envLocked}
      t={t}
      submitFn={(updates) =>
        apiFetch('/api/system/config', {
          method: 'POST',
          body: JSON.stringify({ updates, persist_in_vault: true, apply_runtime: true }),
        })
      }
      onSaved={() => {
        void qc.invalidateQueries({ queryKey: ['system-config'] })
        void qc.invalidateQueries({ queryKey: ['app-name'] })
      }}
    />
  )
}
