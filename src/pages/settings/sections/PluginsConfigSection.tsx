import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../../../lib/api'
import { Card, Field, SectionTitle, SaveButton, StatusMsg, inputCls } from '../shared'

export default function PluginsConfigSection({
  config,
  envLocked,
}: {
  config: Record<string, unknown>
  envLocked: string[]
}) {
  const qc = useQueryClient()
  const [desired, setDesired] = useState(String(config.LYNDRIX_PLUGINS_DESIRED ?? ''))
  const [autoUpdate, setAutoUpdate] = useState(Boolean(config.LYNDRIX_PLUGINS_AUTO_UPDATE))
  const [collectionUrl, setCollectionUrl] = useState(
    String(config.LYNDRIX_PLUGIN_COLLECTION_URL ?? ''),
  )
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  const locked = (key: string) => envLocked.includes(key)

  const mut = useMutation({
    mutationFn: () =>
      apiFetch('/api/system/config', {
        method: 'POST',
        body: JSON.stringify({
          updates: {
            LYNDRIX_PLUGINS_DESIRED: desired,
            LYNDRIX_PLUGINS_AUTO_UPDATE: autoUpdate,
            LYNDRIX_PLUGIN_COLLECTION_URL: collectionUrl,
          },
          persist_in_vault: true,
          apply_runtime: true,
        }),
      }),
    onSuccess: () => {
      setStatus({ ok: true, msg: 'Plugin-Konfiguration gespeichert.' })
      qc.invalidateQueries({ queryKey: ['system-config'] })
    },
    onError: (e) => setStatus({ ok: false, msg: e instanceof Error ? e.message : 'Fehler' }),
  })

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <SectionTitle>Gewünschte Plugins</SectionTitle>
        <div className="flex flex-col gap-3">
          <Field
            label="LYNDRIX_PLUGINS_DESIRED"
            hint='Kommagetrennte Specs: "https://github.com/…@1.0.0,…@latest"'
            locked={locked('LYNDRIX_PLUGINS_DESIRED')}
          >
            <textarea
              className={`${inputCls} min-h-[80px] resize-y font-mono text-xs`}
              value={desired}
              disabled={locked('LYNDRIX_PLUGINS_DESIRED')}
              onChange={(e) => setDesired(e.target.value)}
            />
          </Field>

          <label
            className={`flex items-center gap-2.5 text-sm cursor-pointer ${
              locked('LYNDRIX_PLUGINS_AUTO_UPDATE')
                ? 'text-[var(--lx-text-muted)] opacity-60'
                : 'text-[var(--lx-text)]'
            }`}
          >
            <input
              type="checkbox"
              checked={autoUpdate}
              disabled={locked('LYNDRIX_PLUGINS_AUTO_UPDATE')}
              className="accent-[var(--lx-accent)]"
              onChange={(e) => setAutoUpdate(e.target.checked)}
            />
            Auto-Update für „latest"-Plugins beim Neustart
          </label>

          <Field label="Collection URL" hint="GitHub-Repo der Plugin-Sammlung" locked={locked('LYNDRIX_PLUGIN_COLLECTION_URL')}>
            <input
              className={inputCls}
              value={collectionUrl}
              disabled={locked('LYNDRIX_PLUGIN_COLLECTION_URL')}
              onChange={(e) => setCollectionUrl(e.target.value)}
            />
          </Field>
        </div>
        {status && <StatusMsg ok={status.ok} msg={status.msg} />}
        <SaveButton onClick={() => mut.mutate()} loading={mut.isPending} />
      </Card>
    </div>
  )
}
