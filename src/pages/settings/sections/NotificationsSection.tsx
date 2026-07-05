// Notification routing (Routing v2). Two cards:
//   1. Providers — every registered gateway adapter with its generic
//      ProviderConfigField form (always visible, no bucket selection).
//   2. Endpoint routing — one row per declared endpoint: active toggle,
//      MULTI-SELECT provider chips (fan-out; replaces the old 1:1 dnd bucket
//      model) and a visibility (required-permission) select.
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Lock, ChevronDown } from 'lucide-react'
import { apiFetch } from '../../../lib/api'
import type { PermissionDefOut } from '../../../lib/types'
import { Card, SectionTitle, StatusMsg, EnvBadge, EnvHint, inputCls } from '../shared'

interface NotifEndpoint {
  plugin_id: string
  plugin_name: string
  endpoint_name: string
  description: string
  active: boolean
  providers: string[]
  required_permission: string | null
  active_is_env_locked: boolean
  provider_is_env_locked: boolean
  permission_is_env_locked: boolean
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

const epId = (ep: NotifEndpoint) => `${ep.plugin_id}/${ep.endpoint_name}`

function ProviderConfigPanel({ provider }: { provider: NotifProvider }) {
  const { t } = useTranslation('ui')
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
        if (f.sensitive && v.trim() === '') continue
        values[f.key] = v
      }
      return apiFetch(`/api/notifications/providers/${provider.provider_id}/config`, {
        method: 'PATCH',
        body: JSON.stringify({ values }),
      })
    },
    onSuccess: () => {
      setStatus({ ok: true, msg: t('notif_section.saved') })
      setForm({})
      void qc.invalidateQueries({ queryKey: ['notif-provider-config', provider.provider_id] })
    },
    onError: (e) =>
      setStatus({ ok: false, msg: e instanceof Error ? e.message : t('common.error') }),
  })

  if (fields.length === 0)
    return <p className="text-[11px] text-[var(--lx-text-muted)]">{t('notif_section.no_config')}</p>

  return (
    <div className="flex flex-col gap-3 pt-1">
      {fields.map((f) => (
        <div key={f.key} className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-[var(--lx-text-muted)]">
              {f.label}
              {f.sensitive && f.configured && <span className="text-[var(--lx-state-up)]"> ✓</span>}
            </label>
            {f.is_env_locked && <EnvBadge />}
          </div>
          <input
            className={inputCls}
            type={f.sensitive ? 'password' : 'text'}
            disabled={f.is_env_locked}
            placeholder={
              f.sensitive && f.configured ? t('common.sensitive_set') : f.placeholder
            }
            value={
              f.is_env_locked
                ? f.sensitive ? '' : f.current_value
                : form[f.key] ?? (f.sensitive ? '' : f.current_value)
            }
            onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
          />
          {f.is_env_locked ? (
            <EnvHint envVar={f.env_var} envValue={f.sensitive ? '***' : f.current_value} />
          ) : (
            f.env_var && (
              <p className="text-[10px] text-[var(--lx-text-muted)] font-mono">{f.env_var}</p>
            )
          )}
        </div>
      ))}
      {status && <StatusMsg ok={status.ok} msg={status.msg} />}
      {editable.length > 0 && (
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="lx-btn lx-btn--primary lx-btn--sm self-start"
        >
          {save.isPending ? t('common.saving') : t('common.save')}
        </button>
      )}
    </div>
  )
}

function ProviderCard({ provider }: { provider: NotifProvider }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-md border border-[var(--lx-border-soft)] bg-[var(--lx-elevated)] px-3 py-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-left"
      >
        <div>
          <span className="text-sm text-[var(--lx-text)]">{provider.display_name}</span>
          <span className="ml-2 text-[10px] text-[var(--lx-text-muted)] lx-mono">
            {provider.provider_id}
          </span>
        </div>
        <ChevronDown
          size={14}
          className={`text-[var(--lx-text-muted)] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <ProviderConfigPanel provider={provider} />}
    </div>
  )
}

function EndpointRow({
  ep,
  providers,
  permissions,
}: {
  ep: NotifEndpoint
  providers: NotifProvider[]
  permissions: PermissionDefOut[]
}) {
  const { t } = useTranslation('ui')
  const qc = useQueryClient()

  const patch = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/api/notifications/endpoints/${ep.plugin_id}/${ep.endpoint_name}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['notif-endpoints'] }),
  })

  function toggleProvider(pid: string) {
    const next = ep.providers.includes(pid)
      ? ep.providers.filter((p) => p !== pid)
      : [...ep.providers, pid]
    patch.mutate({ providers: next })
  }

  // Sentinels: '__none__' -> explicit no-restriction (""), '__default__' -> reset (null).
  const permValue = ep.required_permission ?? '__none__'

  return (
    <div className="px-3 py-2.5 rounded-md bg-[var(--lx-surface)] border border-[var(--lx-border-soft)]">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <span className="text-xs font-semibold text-[var(--lx-text)] lx-mono">
            {ep.endpoint_name}
          </span>
          {ep.description && (
            <p className="text-[10px] text-[var(--lx-text-muted)] truncate">{ep.description}</p>
          )}
        </div>
        <label className="flex items-center gap-1.5 text-[11px] text-[var(--lx-text-muted)] shrink-0">
          <input
            type="checkbox"
            checked={ep.active}
            disabled={ep.active_is_env_locked || patch.isPending}
            onChange={(e) => patch.mutate({ active: e.target.checked })}
            className="accent-[var(--lx-accent)]"
          />
          {t('notif_section.active')}
          {ep.active_is_env_locked && <Lock size={11} />}
        </label>
      </div>

      {/* Provider fan-out chips */}
      <div className="flex items-center gap-1.5 flex-wrap mt-2">
        <span className="text-[10px] text-[var(--lx-text-muted)]">
          {t('notif_section.providers_label')}
        </span>
        {providers.map((p) => {
          const on = ep.providers.includes(p.provider_id)
          return (
            <button
              key={p.provider_id}
              disabled={ep.provider_is_env_locked || patch.isPending}
              onClick={() => toggleProvider(p.provider_id)}
              className={`px-2 py-0.5 text-[11px] rounded border transition-colors disabled:opacity-50 ${
                on
                  ? 'border-[var(--lx-accent)] bg-[var(--lx-accent)]/10 text-[var(--lx-accent)]'
                  : 'border-[var(--lx-border-soft)] bg-[var(--lx-elevated-glass)] text-[var(--lx-text-muted)]'
              }`}
            >
              {p.display_name}
            </button>
          )
        })}
        {ep.provider_is_env_locked && <Lock size={11} className="text-[var(--lx-text-muted)]" />}
      </div>

      {/* Visibility (audience) gate */}
      <div className="flex items-center gap-2 mt-2">
        <span className="text-[10px] text-[var(--lx-text-muted)] shrink-0">
          {t('notif_section.visibility_label')}
        </span>
        <select
          value={permValue}
          disabled={ep.permission_is_env_locked || patch.isPending}
          onChange={(e) => {
            const v = e.target.value
            patch.mutate({ required_permission: v === '__none__' ? '' : v })
          }}
          className={`${inputCls} !w-auto max-w-72 text-[11px] !py-1`}
        >
          <option value="__none__">{t('notif_section.visibility_all')}</option>
          {permissions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label || p.id}
            </option>
          ))}
        </select>
        {ep.permission_is_env_locked && <Lock size={11} className="text-[var(--lx-text-muted)]" />}
      </div>
    </div>
  )
}

export default function NotificationsSection(_: {
  config: Record<string, unknown>
  envLocked: string[]
}) {
  const { t } = useTranslation('ui')

  const { data: epData } = useQuery({
    queryKey: ['notif-endpoints'],
    queryFn: () => apiFetch<{ endpoints: NotifEndpoint[] }>('/api/notifications/endpoints'),
  })
  const { data: provData } = useQuery({
    queryKey: ['notif-providers'],
    queryFn: () =>
      apiFetch<{ providers: NotifProvider[]; global_default: string | null }>(
        '/api/notifications/providers',
      ),
  })
  const { data: catalog } = useQuery({
    queryKey: ['permissions-catalog'],
    queryFn: () =>
      apiFetch<{ permissions: PermissionDefOut[] }>('/api/permissions/catalog').then(
        (r) => r.permissions,
      ),
    staleTime: 60_000,
  })

  const providers = provData?.providers ?? []
  const endpoints = epData?.endpoints ?? []
  const permissions = catalog ?? []

  // Group endpoint rows per plugin (mirrors the NiceGUI page's grouping).
  const byPlugin = endpoints.reduce<Record<string, NotifEndpoint[]>>((acc, ep) => {
    ;(acc[ep.plugin_name] ||= []).push(ep)
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <SectionTitle>{t('notif_section.providers_title')}</SectionTitle>
        <p className="text-xs text-[var(--lx-text-muted)] mb-3">
          {t('notif_section.providers_hint')}
        </p>
        <div className="flex flex-col gap-2">
          {providers.map((p) => (
            <ProviderCard key={p.provider_id} provider={p} />
          ))}
          {providers.length === 0 && (
            <p className="text-xs text-[var(--lx-text-muted)]">{t('notif_section.no_providers')}</p>
          )}
        </div>
      </Card>

      <Card>
        <SectionTitle>{t('notif_section.routing_title')}</SectionTitle>
        <p className="text-xs text-[var(--lx-text-muted)] mb-3">
          {t('notif_section.routing_hint')}
        </p>
        <div className="flex flex-col gap-4">
          {Object.entries(byPlugin).map(([pluginName, eps]) => (
            <div key={pluginName}>
              <p className="lx-eyebrow mb-2">{pluginName}</p>
              <div className="flex flex-col gap-1.5">
                {eps.map((ep) => (
                  <EndpointRow
                    key={epId(ep)}
                    ep={ep}
                    providers={providers}
                    permissions={permissions}
                  />
                ))}
              </div>
            </div>
          ))}
          {endpoints.length === 0 && (
            <p className="text-xs text-[var(--lx-text-muted)]">{t('notif_section.no_endpoints')}</p>
          )}
        </div>
      </Card>
    </div>
  )
}
