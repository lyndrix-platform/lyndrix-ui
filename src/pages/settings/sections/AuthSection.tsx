import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { apiFetch } from '../../../lib/api'
import { Card, Field, SectionTitle, SaveButton, StatusMsg, inputCls } from '../shared'

interface AuthField {
  vault_key: string
  label: string
  hint: string
  env_var: string
  sensitive: boolean
  is_bool: boolean
  source: 'env' | 'vault' | 'default'
  is_env_locked: boolean
  configured: boolean
  current_value: string
}

interface AuthConfigOut {
  status: string
  fields: AuthField[]
}

function AuthFieldInput({
  field,
  value,
  onChange,
}: {
  field: AuthField
  value: string | undefined
  onChange: (v: string) => void
}) {
  const { t } = useTranslation('ui')
  const locked = field.is_env_locked
  const shown = locked
    ? field.sensitive ? '' : field.current_value
    : value ?? (field.sensitive ? '' : field.current_value)

  return (
    <Field
      label={field.label}
      hint={field.hint}
      locked={locked}
      envVar={field.env_var}
      envValue={locked ? (field.sensitive ? '***' : field.current_value) : undefined}
    >
      {field.is_bool ? (
        <select
          className={inputCls}
          value={value ?? (field.current_value || 'true')}
          disabled={locked}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="true">{t('common.on')}</option>
          <option value="false">{t('common.off')}</option>
        </select>
      ) : (
        <input
          className={inputCls}
          type={field.sensitive ? 'password' : 'text'}
          value={shown}
          disabled={locked}
          placeholder={field.sensitive && field.configured ? t('common.sensitive_set') : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  )
}

export default function AuthSection(_: { config: Record<string, unknown>; envLocked: string[] }) {
  const { t } = useTranslation('ui')
  const qc = useQueryClient()
  const [form, setForm] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['auth-config'],
    queryFn: () => apiFetch<AuthConfigOut>('/api/auth/config'),
  })

  const fields = data?.fields ?? []
  const byKey = (k: string) => fields.find((f) => f.vault_key === k)
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const chain = byKey('auth_providers')
  const providersStr = form.auth_providers ?? chain?.current_value ?? 'local'
  const providers = providersStr.split(',').map((s) => s.trim())

  const ldapFields = fields.filter((f) => f.vault_key.startsWith('ldap_'))
  const oidcFields = fields.filter((f) => f.vault_key.startsWith('oidc_'))

  const mut = useMutation({
    mutationFn: () => {
      const updates: Record<string, string> = {}
      for (const f of fields) {
        if (f.is_env_locked) continue
        const v = form[f.vault_key]
        if (v === undefined) continue
        if (f.sensitive && v.trim() === '') continue
        updates[f.vault_key] = v
      }
      return apiFetch('/api/auth/config', {
        method: 'PATCH',
        body: JSON.stringify({ updates }),
      })
    },
    onSuccess: () => {
      setStatus({ ok: true, msg: t('auth_section.saved') })
      setForm({})
      void qc.invalidateQueries({ queryKey: ['auth-config'] })
    },
    onError: (e) =>
      setStatus({ ok: false, msg: e instanceof Error ? e.message : t('common.error') }),
  })

  if (isLoading) return <p className="text-sm text-[var(--lx-text-muted)]">{t('common.loading')}</p>
  if (isError)
    return <StatusMsg ok={false} msg={(error as Error)?.message ?? t('common.error_loading')} />

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <SectionTitle>{t('auth_section.provider_order')}</SectionTitle>
        {chain && (
          <AuthFieldInput
            field={{ ...chain, label: t('auth_section.active_providers') }}
            value={form.auth_providers}
            onChange={(v) => set('auth_providers', v)}
          />
        )}
      </Card>

      {providers.includes('ldap') && ldapFields.length > 0 && (
        <Card>
          <SectionTitle>LDAP</SectionTitle>
          <div className="flex flex-col gap-3">
            {ldapFields.map((f) => (
              <AuthFieldInput
                key={f.vault_key}
                field={f}
                value={form[f.vault_key]}
                onChange={(v) => set(f.vault_key, v)}
              />
            ))}
          </div>
        </Card>
      )}

      {providers.includes('oidc') && oidcFields.length > 0 && (
        <Card>
          <SectionTitle>OIDC / OAuth2</SectionTitle>
          <div className="flex flex-col gap-3">
            {oidcFields.map((f) => (
              <AuthFieldInput
                key={f.vault_key}
                field={f}
                value={form[f.vault_key]}
                onChange={(v) => set(f.vault_key, v)}
              />
            ))}
          </div>
        </Card>
      )}

      {status && <StatusMsg ok={status.ok} msg={status.msg} />}
      <SaveButton onClick={() => mut.mutate()} loading={mut.isPending} />
    </div>
  )
}
