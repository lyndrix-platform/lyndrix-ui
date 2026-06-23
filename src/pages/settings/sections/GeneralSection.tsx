import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../../../lib/api'
import type { SystemConfigOut } from '../../../lib/types'
import { Card, Field, SectionTitle, SaveButton, StatusMsg, inputCls } from '../shared'

export default function GeneralSection({
  config,
  envLocked,
}: {
  config: Record<string, unknown>
  envLocked: string[]
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    APP_NAME: String(config.APP_NAME ?? ''),
    APP_TITLE: String(config.APP_TITLE ?? ''),
    LOG_LEVEL: String(config.LOG_LEVEL ?? 'INFO'),
    DEFAULT_LOCALE: String(config.DEFAULT_LOCALE ?? 'de'),
  })
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  const locked = (key: string) => envLocked.includes(key)

  const mut = useMutation({
    mutationFn: () =>
      apiFetch('/api/system/config', {
        method: 'POST',
        body: JSON.stringify({ updates: form, persist_in_vault: true, apply_runtime: true }),
      }),
    onSuccess: () => {
      setStatus({ ok: true, msg: 'Einstellungen gespeichert.' })
      qc.invalidateQueries({ queryKey: ['system-config'] })
    },
    onError: (e) => setStatus({ ok: false, msg: e instanceof Error ? e.message : 'Fehler' }),
  })

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <SectionTitle>Anwendung</SectionTitle>
        <div className="flex flex-col gap-3">
          <Field label="App Name" locked={locked('APP_NAME')}>
            <input
              className={inputCls}
              value={form.APP_NAME}
              disabled={locked('APP_NAME')}
              onChange={(e) => setForm((f) => ({ ...f, APP_NAME: e.target.value }))}
            />
          </Field>
          <Field label="App Titel" locked={locked('APP_TITLE')}>
            <input
              className={inputCls}
              value={form.APP_TITLE}
              disabled={locked('APP_TITLE')}
              onChange={(e) => setForm((f) => ({ ...f, APP_TITLE: e.target.value }))}
            />
          </Field>
          <Field label="Log Level" locked={locked('LOG_LEVEL')}>
            <select
              className={inputCls}
              value={form.LOG_LEVEL}
              disabled={locked('LOG_LEVEL')}
              onChange={(e) => setForm((f) => ({ ...f, LOG_LEVEL: e.target.value }))}
            >
              {['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'].map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Standard-Sprache" locked={locked('DEFAULT_LOCALE')}>
            <select
              className={inputCls}
              value={form.DEFAULT_LOCALE}
              disabled={locked('DEFAULT_LOCALE')}
              onChange={(e) => setForm((f) => ({ ...f, DEFAULT_LOCALE: e.target.value }))}
            >
              {['de', 'en'].map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {status && <StatusMsg ok={status.ok} msg={status.msg} />}
        <SaveButton onClick={() => mut.mutate()} loading={mut.isPending} />
      </Card>
    </div>
  )
}

// Re-export the type so SettingsPage can use a typed query
export type { SystemConfigOut }
