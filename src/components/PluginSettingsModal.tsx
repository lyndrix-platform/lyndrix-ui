import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getPluginSettings, updatePluginSettings } from '../lib/api'
import type { EditableSettingMeta, PluginSettingField } from '../lib/types'
import SettingsForm from './SettingsForm'
import PluginActionsPanel from './PluginActionsPanel'

// Plugin setting fields share the generic form's metadata shape; map key→field.
// Action fields are buttons, not values — they are rendered by PluginActionsPanel.
function toMeta(f: PluginSettingField): EditableSettingMeta {
  return {
    field: f.key,
    label: f.label,
    kind: (f.kind === 'action' || f.kind === 'secret' ? 'str' : f.kind) as EditableSettingMeta['kind'],
    options: f.options,
    category: f.category,
    description: f.description,
    sensitive: f.kind === 'secret',
  }
}

export default function PluginSettingsModal({
  pluginId,
  pluginName,
  onClose,
}: {
  pluginId: string
  pluginName: string
  onClose: () => void
}) {
  const { t } = useTranslation('ui')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['plugin-settings', pluginId],
    queryFn: () => getPluginSettings(pluginId),
  })

  const valueFields = data ? data.schema.filter((f) => f.kind !== 'action') : []
  const actionFields = data ? data.schema.filter((f) => f.kind === 'action') : []
  const metas = valueFields.map(toMeta)
  const config: Record<string, unknown> = Object.fromEntries(
    valueFields.map((f) => [f.key, data?.values[f.key] ?? f.default ?? '']),
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--lx-scrim)] backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg mx-4 p-6 rounded-xl bg-[var(--lx-surface-glass)] backdrop-blur-[20px] border border-[var(--lx-glass-border)] shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-5 shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-[var(--lx-text)]">
              {t('plugin_settings.title', { name: pluginName })}
            </h3>
            <p className="text-xs text-[var(--lx-text-muted)] mt-0.5 font-mono">{pluginId}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--lx-text-muted)] hover:text-[var(--lx-text)] text-xl leading-none p-1 transition-colors"
          >
            &times;
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {isLoading && (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-[var(--lx-accent)] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {data && data.schema.length === 0 && (
            <p className="text-sm text-[var(--lx-text-muted)] py-4 text-center">
              {t('plugin_settings.none')}
            </p>
          )}

          {data && valueFields.length > 0 && (
            <SettingsForm
              metas={metas}
              config={config}
              submitFn={(updates) => updatePluginSettings(pluginId, updates)}
              onSaved={() =>
                void qc.invalidateQueries({ queryKey: ['plugin-settings', pluginId] })
              }
            />
          )}

          {data && <PluginActionsPanel pluginId={pluginId} actions={actionFields} />}
        </div>
      </div>
    </div>
  )
}
