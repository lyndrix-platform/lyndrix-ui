import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getPluginSettings, updatePluginSettings } from '../lib/api'
import type { EditableSettingMeta, PluginSettingField } from '../lib/types'
import SettingsForm from './SettingsForm'

// Plugin setting fields share the generic form's metadata shape; map key→field.
function toMeta(f: PluginSettingField): EditableSettingMeta {
  return {
    field: f.key,
    label: f.label,
    kind: f.kind,
    options: f.options,
    category: f.category,
    description: f.description,
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
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['plugin-settings', pluginId],
    queryFn: () => getPluginSettings(pluginId),
  })

  const metas = data ? data.schema.map(toMeta) : []
  const config: Record<string, unknown> = data
    ? Object.fromEntries(
        data.schema.map((f) => [f.key, data.values[f.key] ?? f.default ?? '']),
      )
    : {}

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg mx-4 p-6 rounded-xl bg-[var(--lx-surface-glass)] backdrop-blur-[20px] border border-[var(--lx-glass-border)] shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-5 shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-[var(--lx-text)]">
              {pluginName} — Einstellungen
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
              Dieses Plugin hat keine konfigurierbaren Einstellungen.
            </p>
          )}

          {data && data.schema.length > 0 && (
            <SettingsForm
              metas={metas}
              config={config}
              submitFn={(updates) => updatePluginSettings(pluginId, updates)}
              onSaved={() =>
                void qc.invalidateQueries({ queryKey: ['plugin-settings', pluginId] })
              }
            />
          )}
        </div>
      </div>
    </div>
  )
}
