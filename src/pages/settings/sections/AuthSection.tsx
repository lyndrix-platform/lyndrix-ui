import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../../../lib/api'
import { Card, Field, SectionTitle, SaveButton, StatusMsg, inputCls } from '../shared'

export default function AuthSection({
  config,
  envLocked,
}: {
  config: Record<string, unknown>
  envLocked: string[]
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    LYNDRIX_AUTH_PROVIDERS: String(config.LYNDRIX_AUTH_PROVIDERS ?? 'local'),
    LYNDRIX_LDAP_URL: String(config.LYNDRIX_LDAP_URL ?? ''),
    LYNDRIX_LDAP_BIND_DN: String(config.LYNDRIX_LDAP_BIND_DN ?? ''),
    LYNDRIX_LDAP_BASE_DN: String(config.LYNDRIX_LDAP_BASE_DN ?? ''),
    LYNDRIX_OIDC_ISSUER: String(config.LYNDRIX_OIDC_ISSUER ?? ''),
    LYNDRIX_OIDC_CLIENT_ID: String(config.LYNDRIX_OIDC_CLIENT_ID ?? ''),
  })
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  const locked = (key: string) => envLocked.includes(key)
  const providers = form.LYNDRIX_AUTH_PROVIDERS.split(',').map((s) => s.trim())

  const mut = useMutation({
    mutationFn: () => {
      const updates: Record<string, string> = {
        LYNDRIX_AUTH_PROVIDERS: form.LYNDRIX_AUTH_PROVIDERS,
      }
      if (providers.includes('ldap')) {
        if (form.LYNDRIX_LDAP_URL) updates.LYNDRIX_LDAP_URL = form.LYNDRIX_LDAP_URL
        if (form.LYNDRIX_LDAP_BIND_DN) updates.LYNDRIX_LDAP_BIND_DN = form.LYNDRIX_LDAP_BIND_DN
        if (form.LYNDRIX_LDAP_BASE_DN) updates.LYNDRIX_LDAP_BASE_DN = form.LYNDRIX_LDAP_BASE_DN
      }
      if (providers.includes('oidc')) {
        if (form.LYNDRIX_OIDC_ISSUER) updates.LYNDRIX_OIDC_ISSUER = form.LYNDRIX_OIDC_ISSUER
        if (form.LYNDRIX_OIDC_CLIENT_ID)
          updates.LYNDRIX_OIDC_CLIENT_ID = form.LYNDRIX_OIDC_CLIENT_ID
      }
      return apiFetch('/api/system/config', {
        method: 'POST',
        body: JSON.stringify({ updates, persist_in_vault: true, apply_runtime: true }),
      })
    },
    onSuccess: () => {
      setStatus({ ok: true, msg: 'Auth-Einstellungen gespeichert.' })
      qc.invalidateQueries({ queryKey: ['system-config'] })
    },
    onError: (e) => setStatus({ ok: false, msg: e instanceof Error ? e.message : 'Fehler' }),
  })

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <SectionTitle>Anbieter-Reihenfolge</SectionTitle>
        <Field
          label="Aktive Anbieter (kommagetrennt)"
          hint='Reihenfolge bestimmt die Priorität: z.B. "local,ldap,oidc"'
          locked={locked('LYNDRIX_AUTH_PROVIDERS')}
        >
          <input
            className={inputCls}
            value={form.LYNDRIX_AUTH_PROVIDERS}
            disabled={locked('LYNDRIX_AUTH_PROVIDERS')}
            onChange={(e) => setForm((f) => ({ ...f, LYNDRIX_AUTH_PROVIDERS: e.target.value }))}
          />
        </Field>
      </Card>

      {providers.includes('ldap') && (
        <Card>
          <SectionTitle>LDAP</SectionTitle>
          <div className="flex flex-col gap-3">
            <Field label="LDAP URL" locked={locked('LYNDRIX_LDAP_URL')}>
              <input
                className={inputCls}
                value={form.LYNDRIX_LDAP_URL}
                disabled={locked('LYNDRIX_LDAP_URL')}
                onChange={(e) => setForm((f) => ({ ...f, LYNDRIX_LDAP_URL: e.target.value }))}
              />
            </Field>
            <Field label="Bind DN" locked={locked('LYNDRIX_LDAP_BIND_DN')}>
              <input
                className={inputCls}
                value={form.LYNDRIX_LDAP_BIND_DN}
                disabled={locked('LYNDRIX_LDAP_BIND_DN')}
                onChange={(e) =>
                  setForm((f) => ({ ...f, LYNDRIX_LDAP_BIND_DN: e.target.value }))
                }
              />
            </Field>
            <Field label="Base DN" locked={locked('LYNDRIX_LDAP_BASE_DN')}>
              <input
                className={inputCls}
                value={form.LYNDRIX_LDAP_BASE_DN}
                disabled={locked('LYNDRIX_LDAP_BASE_DN')}
                onChange={(e) =>
                  setForm((f) => ({ ...f, LYNDRIX_LDAP_BASE_DN: e.target.value }))
                }
              />
            </Field>
            <p className="text-[10px] text-[var(--lx-text-muted)]">
              Bind-Passwort nur über Umgebungsvariable LYNDRIX_LDAP_BIND_PASSWORD setzbar.
            </p>
          </div>
        </Card>
      )}

      {providers.includes('oidc') && (
        <Card>
          <SectionTitle>OIDC / OAuth2</SectionTitle>
          <div className="flex flex-col gap-3">
            <Field label="Issuer URL" locked={locked('LYNDRIX_OIDC_ISSUER')}>
              <input
                className={inputCls}
                value={form.LYNDRIX_OIDC_ISSUER}
                disabled={locked('LYNDRIX_OIDC_ISSUER')}
                onChange={(e) =>
                  setForm((f) => ({ ...f, LYNDRIX_OIDC_ISSUER: e.target.value }))
                }
              />
            </Field>
            <Field label="Client ID" locked={locked('LYNDRIX_OIDC_CLIENT_ID')}>
              <input
                className={inputCls}
                value={form.LYNDRIX_OIDC_CLIENT_ID}
                disabled={locked('LYNDRIX_OIDC_CLIENT_ID')}
                onChange={(e) =>
                  setForm((f) => ({ ...f, LYNDRIX_OIDC_CLIENT_ID: e.target.value }))
                }
              />
            </Field>
            <p className="text-[10px] text-[var(--lx-text-muted)]">
              Client Secret nur über Umgebungsvariable LYNDRIX_OIDC_CLIENT_SECRET setzbar.
            </p>
          </div>
        </Card>
      )}

      {status && <StatusMsg ok={status.ok} msg={status.msg} />}
      <SaveButton onClick={() => mut.mutate()} loading={mut.isPending} />
    </div>
  )
}
