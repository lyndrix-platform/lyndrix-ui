import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const valueFields = data ? data.schema.filter((f) => f.kind !== 'action') : []
  const actionFields = data ? data.schema.filter((f) => f.kind === 'action') : []
  const metas = valueFields.map(toMeta)
  const config: Record<string, unknown> = Object.fromEntries(
    valueFields.map((f) => [f.key, data?.values[f.key] ?? f.default ?? '']),
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--lx-scrim)] backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={t('plugin_settings.title', { name: pluginName })}
    >
      {/* min-h-0 on the scroll area is what keeps a long schema inside the dialog
          instead of pushing the header out of the viewport. */}
      <div className="w-full max-w-2xl rounded-xl bg-[var(--lx-surface-glass)] backdrop-blur-[20px] border border-[var(--lx-glass-border)] shadow-2xl max-h-[88vh] flex flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[var(--lx-border-soft)] shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-[var(--lx-text)] truncate">
              {t('plugin_settings.title', { name: pluginName })}
            </h3>
            <p className="text-xs text-[var(--lx-text-muted)] mt-0.5">
              {t('plugin_settings.subtitle')} <span className="font-mono">{pluginId}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="lx-icon-btn shrink-0"
            aria-label={t('common.close')}
            title={t('common.close')}
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 px-6 py-5">
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
