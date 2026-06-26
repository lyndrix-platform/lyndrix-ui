import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Lock } from 'lucide-react'
import { apiFetch } from '../../../lib/api'
import { Card, SectionTitle, StatusMsg, inputCls } from '../shared'

// ─── Types (mirror /api/notifications/*) ─────────────────────────────────────

interface NotifEndpoint {
  plugin_id: string
  plugin_name: string
  endpoint_name: string
  description: string
  active: boolean
  provider: string | null
  active_is_env_locked: boolean
  provider_is_env_locked: boolean
}

interface NotifProvider {
  provider_id: string
  display_name: string
  capabilities: string[]
}

interface ProviderConfigField {
  key: string
  label: string
  env_var: string
  sensitive: boolean
  placeholder: string
  is_env_locked: boolean
  current_value: string
  configured: boolean
}

// ─── Endpoint bindings ───────────────────────────────────────────────────────

function EndpointRow({ ep, providers }: { ep: NotifEndpoint; providers: NotifProvider[] }) {
  const qc = useQueryClient()
  const patch = useMutation({
    mutationFn: (body: { active?: boolean; provider?: string | null }) =>
      apiFetch(`/api/notifications/endpoints/${ep.plugin_id}/${ep.endpoint_name}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notif-endpoints'] }),
  })

  return (
    <div className="flex flex-wrap items-center gap-3 py-3 border-b border-[var(--lx-border-soft)] last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--lx-text)]">{ep.endpoint_name}</span>
          <span className="text-[10px] text-[var(--lx-text-muted)] font-mono">{ep.plugin_name}</span>
        </div>
        {ep.description && <p className="text-[11px] text-[var(--lx-text-muted)]">{ep.description}</p>}
      </div>

      {/* provider binding */}
      <label className="flex items-center gap-1.5 text-[11px] text-[var(--lx-text-muted)]">
        Provider
        <select
          className={inputCls}
          style={{ width: 150 }}
          value={ep.provider ?? ''}
          disabled={ep.provider_is_env_locked || patch.isPending}
          onChange={(e) => patch.mutate({ provider: e.target.value === '' ? null : e.target.value })}
        >
          <option value="">(Standard)</option>
          {providers.map((p) => (
            <option key={p.provider_id} value={p.provider_id}>{p.display_name}</option>
          ))}
        </select>
        {ep.provider_is_env_locked && <Lock size={11} className="text-amber-400" />}
      </label>

      {/* active toggle */}
      <label className="flex items-center gap-1.5 text-[11px] text-[var(--lx-text)]">
        <input
          type="checkbox"
          className="w-4 h-4 accent-[var(--lx-accent)]"
          checked={ep.active}
          disabled={ep.active_is_env_locked || patch.isPending}
          onChange={(e) => patch.mutate({ active: e.target.checked })}
        />
        aktiv
        {ep.active_is_env_locked && <Lock size={11} className="text-amber-400" />}
      </label>
    </div>
  )
}

// ─── Provider config (secrets masked, blank keeps existing) ──────────────────

function ProviderConfigCard({ provider }: { provider: NotifProvider }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  const { data } = useQuery({
    queryKey: ['notif-provider-config', provider.provider_id],
    queryFn: () =>
      apiFetch<{ fields: ProviderConfigField[] }>(
        `/api/notifications/providers/${provider.provider_id}/config`,
      ),
  })

  const fields = data?.fields ?? []
  const editable = fields.filter((f) => !f.is_env_locked)

  const save = useMutation({
    mutationFn: () => {
      const values: Record<string, string> = {}
      for (const f of editable) {
        const v = form[f.key]
        if (v === undefined) continue
        if (f.sensitive && v.trim() === '') continue // blank secret keeps existing
        values[f.key] = v
      }
      return apiFetch(`/api/notifications/providers/${provider.provider_id}/config`, {
        method: 'PATCH',
        body: JSON.stringify({ values }),
      })
    },
    onSuccess: () => {
      setStatus({ ok: true, msg: 'Provider-Konfiguration gespeichert.' })
      setForm({})
      void qc.invalidateQueries({ queryKey: ['notif-provider-config', provider.provider_id] })
    },
    onError: (e) => setStatus({ ok: false, msg: e instanceof Error ? e.message : 'Fehler' }),
  })

  if (fields.length === 0) return null

  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <span className="lx-section-title">{provider.display_name}</span>
        <span className="text-[10px] text-[var(--lx-text-muted)] font-mono">{provider.provider_id}</span>
      </div>
      <div className="flex flex-col gap-3">
        {fields.map((f) => (
          <div key={f.key} className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-[var(--lx-text-muted)]">
                {f.label}
                {f.sensitive && f.configured && <span className="text-[var(--lx-state-up)]"> ✓</span>}
              </label>
              {f.is_env_locked && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                  <Lock size={9} /> ENV
                </span>
              )}
            </div>
            <input
              className={inputCls}
              type={f.sensitive ? 'password' : 'text'}
              disabled={f.is_env_locked}
              placeholder={f.sensitive && f.configured ? '•••••••• (gesetzt — zum Ändern überschreiben)' : f.placeholder}
              value={
                f.is_env_locked
                  ? f.sensitive ? '' : f.current_value
                  : form[f.key] ?? (f.sensitive ? '' : f.current_value)
              }
              onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
            />
            {f.env_var && <p className="text-[10px] text-[var(--lx-text-muted)] font-mono">{f.env_var}</p>}
          </div>
        ))}
      </div>
      {status && <StatusMsg ok={status.ok} msg={status.msg} />}
      {editable.length > 0 && (
        <button onClick={() => save.mutate()} disabled={save.isPending} className="lx-btn lx-btn--primary mt-4">
          {save.isPending ? 'Speichern…' : 'Speichern'}
        </button>
      )}
    </Card>
  )
}

// ─── Section ─────────────────────────────────────────────────────────────────

export default function NotificationsSection(_: {
  config: Record<string, unknown>
  envLocked: string[]
}) {
  const endpointsQ = useQuery({
    queryKey: ['notif-endpoints'],
    queryFn: () => apiFetch<{ endpoints: NotifEndpoint[] }>('/api/notifications/endpoints'),
  })
  const providersQ = useQuery({
    queryKey: ['notif-providers'],
    queryFn: () =>
      apiFetch<{ providers: NotifProvider[]; global_default: string | null }>('/api/notifications/providers'),
  })

  const providers = providersQ.data?.providers ?? []
  const endpoints = endpointsQ.data?.endpoints ?? []

  if (endpointsQ.isLoading || providersQ.isLoading) {
    return <p className="text-sm text-[var(--lx-text-muted)]">Lade…</p>
  }
  if (endpointsQ.isError) {
    return <StatusMsg ok={false} msg={(endpointsQ.error as Error)?.message ?? 'Fehler beim Laden'} />
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <SectionTitle>Benachrichtigungs-Endpunkte</SectionTitle>
        <p className="text-[11px] text-[var(--lx-text-muted)] -mt-2 mb-2">
          Pro Endpunkt aktivieren/deaktivieren und einen Versand-Provider zuweisen (Standard = globaler Default).
        </p>
        {endpoints.length === 0 ? (
          <p className="text-sm text-[var(--lx-text-muted)]">Keine Endpunkte registriert.</p>
        ) : (
          <div className="flex flex-col">
            {endpoints.map((ep) => (
              <EndpointRow key={`${ep.plugin_id}/${ep.endpoint_name}`} ep={ep} providers={providers} />
            ))}
          </div>
        )}
      </Card>

      {providersQ.data?.global_default && (
        <p className="text-[11px] text-[var(--lx-text-muted)] px-1">
          Globaler Standard-Provider:{' '}
          <span className="font-mono text-[var(--lx-text)]">{providersQ.data.global_default}</span>
        </p>
      )}

      {providers.map((p) => (
        <ProviderConfigCard key={p.provider_id} provider={p} />
      ))}
    </div>
  )
}
