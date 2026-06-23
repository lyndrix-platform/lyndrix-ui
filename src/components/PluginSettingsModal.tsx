import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPluginSettings, updatePluginSettings } from '../lib/api'
import { Card, Field, SaveButton, StatusMsg, inputCls } from '../pages/settings/shared'
import type { PluginSettingField } from '../lib/types'

function renderField(
  field: PluginSettingField,
  value: unknown,
  onChange: (v: unknown) => void,
) {
  if (field.kind === 'bool') {
    return (
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-[var(--lx-accent)]"
      />
    )
  }
  if (field.kind === 'select') {
    return (
      <select
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      >
        {field.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    )
  }
  return (
    <input
      type={field.kind === 'int' ? 'number' : 'text'}
      value={String(value ?? '')}
      onChange={(e) =>
        onChange(field.kind === 'int' ? Number(e.target.value) : e.target.value)
      }
      className={inputCls}
    />
  )
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
  const [formValues, setFormValues] = useState<Record<string, unknown>>({})
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['plugin-settings', pluginId],
    queryFn: () => getPluginSettings(pluginId),
  })

  useEffect(() => {
    if (data) {
      const initial: Record<string, unknown> = {}
      for (const field of data.schema) {
        initial[field.key] = data.values[field.key] ?? field.default ?? ''
      }
      setFormValues(initial)
    }
  }, [data])

  const mut = useMutation({
    mutationFn: () => updatePluginSettings(pluginId, formValues),
    onSuccess: () => {
      setStatus({ ok: true, msg: 'Einstellungen gespeichert.' })
      void qc.invalidateQueries({ queryKey: ['plugin-settings', pluginId] })
    },
    onError: (e) =>
      setStatus({ ok: false, msg: e instanceof Error ? e.message : 'Fehler beim Speichern.' }),
  })

  const categories = data ? [...new Set(data.schema.map((f) => f.category))] : []

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg mx-4 p-6 rounded-xl bg-[var(--lx-surface)] border border-[var(--lx-border-soft)] shadow-xl max-h-[80vh] flex flex-col">
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
            <div className="flex flex-col gap-4">
              {categories.map((cat) => (
                <Card key={cat}>
                  {categories.length > 1 && (
                    <h4 className="text-xs uppercase tracking-widest text-[var(--lx-text-muted)] font-medium mb-3">
                      {cat}
                    </h4>
                  )}
                  <div className="flex flex-col gap-3">
                    {data.schema
                      .filter((f) => f.category === cat)
                      .map((field) => (
                        <Field
                          key={field.key}
                          label={field.label}
                          hint={field.description || undefined}
                        >
                          {renderField(field, formValues[field.key], (v) =>
                            setFormValues((prev) => ({ ...prev, [field.key]: v })),
                          )}
                        </Field>
                      ))}
                  </div>
                </Card>
              ))}

              {status && <StatusMsg ok={status.ok} msg={status.msg} />}
              <div className="flex justify-end">
                <SaveButton onClick={() => mut.mutate()} loading={mut.isPending} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
