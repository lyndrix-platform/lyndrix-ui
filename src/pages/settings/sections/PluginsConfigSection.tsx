import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { apiFetch } from '../../../lib/api'
import type { MarketplacePlugin } from '../../../lib/types'
import type { SettingsSectionProps } from '../registry'
import EditableSettingsForm from '../EditableSettingsForm'
import { Card, SectionTitle, inputCls } from '../shared'

// Client mirror of the backend spec regex (config.py): url[@version] per
// comma-separated entry.
const SPEC_RE = /^(https?:\/\/[^@]+?)(?:@([^/@]+))?$/

interface DesiredSpec {
  url: string
  version: string // 'latest' when unpinned
}

function parseDesired(raw: string): DesiredSpec[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = SPEC_RE.exec(s)
      return m ? { url: m[1], version: m[2] || 'latest' } : { url: s, version: 'latest' }
    })
}

function serializeDesired(specs: DesiredSpec[]): string {
  return specs
    .map((s) => (s.version && s.version !== 'latest' ? `${s.url}@${s.version}` : s.url))
    .join(',')
}

/** Checkbox/version picker over the marketplace catalog that reads and writes
 *  the same LYNDRIX_PLUGINS_DESIRED comma string as the raw field below. */
function DesiredPluginsPicker({
  currentRaw,
  locked,
}: {
  currentRaw: string
  locked: boolean
}) {
  const { t } = useTranslation('ui')
  const qc = useQueryClient()
  const [saved, setSaved] = useState(false)

  const { data: marketplace } = useQuery({
    queryKey: ['marketplace'],
    queryFn: () =>
      apiFetch<{ plugins: MarketplacePlugin[] }>('/api/plugins/marketplace').then(
        (r) => r.plugins,
      ),
    staleTime: 60_000,
  })

  const specs = useMemo(() => parseDesired(currentRaw), [currentRaw])
  const specByUrl = useMemo(() => {
    const m = new Map<string, DesiredSpec>()
    for (const s of specs) m.set(s.url, s)
    return m
  }, [specs])

  const saveMut = useMutation({
    mutationFn: (next: DesiredSpec[]) =>
      apiFetch('/api/system/config', {
        method: 'POST',
        body: JSON.stringify({
          updates: { LYNDRIX_PLUGINS_DESIRED: serializeDesired(next) },
          persist_in_vault: true,
          apply_runtime: true,
        }),
      }),
    onSuccess: () => {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      void qc.invalidateQueries({ queryKey: ['system-config'] })
    },
  })

  function toggle(mp: MarketplacePlugin) {
    const url = mp.repo_url
    const next = specByUrl.has(url)
      ? specs.filter((s) => s.url !== url)
      : [...specs, { url, version: 'latest' }]
    saveMut.mutate(next)
  }

  function setVersion(url: string, version: string) {
    saveMut.mutate(specs.map((s) => (s.url === url ? { ...s, version } : s)))
  }

  if (!marketplace || marketplace.length === 0) return null

  return (
    <Card>
      <SectionTitle>{t('plugins_config.picker_title')}</SectionTitle>
      <p className="text-xs text-[var(--lx-text-muted)] mb-3">
        {t('plugins_config.picker_hint')}
      </p>
      <div className="flex flex-col gap-1.5">
        {marketplace.map((mp) => {
          const spec = specByUrl.get(mp.repo_url)
          const versions = ['latest', ...(mp.versions ?? []).filter((v) => v !== 'latest')]
          return (
            <div
              key={mp.repo_url}
              className="flex items-center gap-3 px-3 py-2 rounded-md bg-[var(--lx-elevated)] border border-[var(--lx-border-soft)]"
            >
              <input
                type="checkbox"
                checked={!!spec}
                disabled={locked || saveMut.isPending}
                onChange={() => toggle(mp)}
                className="accent-[var(--lx-accent)] shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-[var(--lx-text)] truncate">{mp.name}</div>
                <div className="text-[10px] text-[var(--lx-text-muted)] lx-mono truncate">
                  {mp.repo_url}
                </div>
              </div>
              {spec && (
                <select
                  value={spec.version}
                  disabled={locked || saveMut.isPending}
                  onChange={(e) => setVersion(spec.url, e.target.value)}
                  className={`${inputCls} !w-32 shrink-0 text-xs !py-1`}
                >
                  {versions.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )
        })}
      </div>
      {saved && (
        <p className="text-xs text-[var(--lx-state-up)] mt-2">{t('plugins_config.picker_saved')}</p>
      )}
      {locked && (
        <p className="text-[10px] text-[var(--lx-text-muted)] mt-2">
          {t('plugins_config.picker_locked')}
        </p>
      )}
    </Card>
  )
}

// Plugin reconciliation config. Driven by the API's `editable_settings`
// metadata (category "Plugins") — no hardcoded field list or env-var names.
// The picker above writes the SAME comma string as the raw field; keying the
// form on the current value re-mounts it with fresh server state after a
// picker mutation invalidates the config query.
export default function PluginsConfigSection({ config, envLocked, editableSettings }: SettingsSectionProps) {
  const metas = editableSettings.filter((m) => m.category === 'Plugins')
  const desiredRaw = String(config.LYNDRIX_PLUGINS_DESIRED ?? '')
  return (
    <div className="flex flex-col gap-4">
      <DesiredPluginsPicker
        currentRaw={desiredRaw}
        locked={envLocked.includes('LYNDRIX_PLUGINS_DESIRED')}
      />
      <EditableSettingsForm key={desiredRaw} metas={metas} config={config} envLocked={envLocked} />
    </div>
  )
}
