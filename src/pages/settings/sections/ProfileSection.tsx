import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Copy, Check, Trash2, MonitorSmartphone, LogOut } from 'lucide-react'
import { apiFetch, getToken } from '../../../lib/api'
import { preferencesClient } from '../../../lib/preferences'
import type { ApiKeyOut, UserOut } from '../../../lib/types'
import { Card, Field, SectionTitle, SaveButton, StatusMsg, inputCls } from '../shared'

interface SubscribableEndpoint {
  plugin_id: string
  plugin_name: string
  endpoint_name: string
  description: string
  key: string
}

/** Personal notification mutes — a display preference stored in the account
 *  preferences doc (notifications.muted_endpoints), NOT a security boundary.
 *  Only endpoints the caller may actually see are offered. */
function MutedNotificationsCard() {
  const { t } = useTranslation('ui')
  const qc = useQueryClient()

  const { data: subs } = useQuery({
    queryKey: ['notif-subscribable'],
    queryFn: () =>
      apiFetch<{ endpoints: SubscribableEndpoint[] }>('/api/notifications/subscribable').then(
        (r) => r.endpoints,
      ),
    staleTime: 60_000,
  })
  const { data: prefs } = useQuery({
    queryKey: ['me-preferences'],
    queryFn: () => preferencesClient.getPreferences(true),
  })
  const muted = new Set<string>(
    (((prefs as Record<string, any>)?.preferences?.notifications?.muted_endpoints ??
      (prefs as Record<string, any>)?.notifications?.muted_endpoints) as string[] | undefined) ?? [],
  )

  const saveMut = useMutation({
    mutationFn: (next: string[]) =>
      preferencesClient.setPath('notifications.muted_endpoints', next),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['me-preferences'] })
      void qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  function toggle(key: string) {
    const next = new Set(muted)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    saveMut.mutate([...next].sort())
  }

  if (!subs || subs.length === 0) return null

  return (
    <Card>
      <SectionTitle>{t('profile_section.mutes_title')}</SectionTitle>
      <p className="text-xs text-[var(--lx-text-muted)] mb-3">{t('profile_section.mutes_hint')}</p>
      <div className="flex flex-col gap-1.5">
        {subs.map((s) => (
          <label
            key={s.key}
            className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-[var(--lx-elevated)] border border-[var(--lx-border-soft)] cursor-pointer"
          >
            <input
              type="checkbox"
              checked={muted.has(s.key)}
              disabled={saveMut.isPending}
              onChange={() => toggle(s.key)}
              className="accent-[var(--lx-accent)] shrink-0"
            />
            <div className="min-w-0">
              <span className="text-xs text-[var(--lx-text)] lx-mono">
                {s.plugin_name} / {s.endpoint_name}
              </span>
              {s.description && (
                <p className="text-[10px] text-[var(--lx-text-muted)] truncate">{s.description}</p>
              )}
            </div>
          </label>
        ))}
      </div>
    </Card>
  )
}

/** Session tokens are UserApiKey rows minted at login; they are recognisable
 *  by their 'web-session' label prefix (both the legacy `web-session-<ts>` and
 *  the current `web-session · Browser on OS · <ts>` format). */
const isSessionKey = (k: ApiKeyOut) => k.label.startsWith('web-session')

const fmtDate = (iso: string | null) => {
  if (!iso) return null
  const d = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString()
}

interface MeResponse extends UserOut {
  method: string
  is_system: boolean
}

export default function ProfileSection(_: {
  config: Record<string, unknown>
  envLocked: string[]
}) {
  const { t } = useTranslation('ui')
  const qc = useQueryClient()

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiFetch<MeResponse>('/api/auth/me'),
  })

  const { data: keys } = useQuery({
    queryKey: ['profile-api-keys', me?.username],
    queryFn: () =>
      apiFetch<{ api_keys: ApiKeyOut[] }>(`/api/users/${me!.username}/api-keys`).then(
        (r) => r.api_keys,
      ),
    enabled: !!me?.username,
  })

  // ── Profile form ──────────────────────────────────────────────────────────

  const [profileForm, setProfileForm] = useState({ full_name: '', email: '' })
  const [profileStatus, setProfileStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  const profileInitialized = useRef(false)
  useEffect(() => {
    if (me && !profileInitialized.current) {
      profileInitialized.current = true
      setProfileForm({ full_name: me.full_name ?? '', email: me.email ?? '' })
    }
  }, [me])

  const profileMut = useMutation({
    mutationFn: () =>
      apiFetch(`/api/users/${me!.username}`, {
        method: 'PATCH',
        body: JSON.stringify(profileForm),
      }),
    onSuccess: () => {
      setProfileStatus({ ok: true, msg: t('profile_section.saved') })
      qc.invalidateQueries({ queryKey: ['me'] })
    },
    onError: (e) =>
      setProfileStatus({ ok: false, msg: e instanceof Error ? e.message : t('common.error') }),
  })

  // ── Password form ─────────────────────────────────────────────────────────

  const [pwForm, setPwForm] = useState({ current: '', password: '', confirm: '' })
  const [pwStatus, setPwStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  const pwMut = useMutation({
    mutationFn: () => {
      if (pwForm.password !== pwForm.confirm)
        throw new Error(t('profile_section.pw_mismatch'))
      if (pwForm.password.length < 8)
        throw new Error(t('profile_section.pw_too_short'))
      return apiFetch(`/api/users/${encodeURIComponent(me!.username)}/password`, {
        method: 'POST',
        body: JSON.stringify({
          current_password: pwForm.current,
          new_password: pwForm.password,
        }),
      })
    },
    onSuccess: () => {
      setPwStatus({ ok: true, msg: t('profile_section.pw_changed') })
      setPwForm({ current: '', password: '', confirm: '' })
    },
    onError: (e) =>
      setPwStatus({ ok: false, msg: e instanceof Error ? e.message : t('common.error') }),
  })

  // ── API keys ──────────────────────────────────────────────────────────────

  const [newKeyLabel, setNewKeyLabel] = useState('')
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const createKeyMut = useMutation({
    mutationFn: () =>
      apiFetch<{ raw_key: string }>(`/api/users/${me!.username}/api-keys`, {
        method: 'POST',
        body: JSON.stringify({
          label: newKeyLabel || t('profile_section.key_default_label'),
          scopes: [],
        }),
      }),
    onSuccess: (data) => {
      setCreatedToken(data.raw_key)
      setNewKeyLabel('')
      qc.invalidateQueries({ queryKey: ['profile-api-keys', me?.username] })
    },
  })

  const revokeKeyMut = useMutation({
    mutationFn: (keyId: string) =>
      apiFetch(`/api/users/${me!.username}/api-keys/${keyId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile-api-keys', me?.username] }),
  })

  // ── Sessions ──────────────────────────────────────────────────────────────
  // Web logins mint UserApiKey rows; split them off the real API keys and
  // identify the CURRENT session by matching the stored token against the
  // key's visible prefix.
  const token = getToken()
  const sessions = (keys ?? []).filter(isSessionKey)
  const apiKeys = (keys ?? []).filter((k) => !isSessionKey(k))
  const isCurrent = (k: ApiKeyOut) => !!token && !!k.prefix && token.startsWith(k.prefix)

  const revokeOthersMut = useMutation({
    mutationFn: async () => {
      const others = sessions.filter((s) => !isCurrent(s))
      for (const s of others) {
        await apiFetch(`/api/users/${me!.username}/api-keys/${s.id}`, { method: 'DELETE' })
      }
      return others.length
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile-api-keys', me?.username] }),
  })

  function copyToken() {
    if (!createdToken) return
    navigator.clipboard.writeText(createdToken).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Profile ── */}
      <Card>
        <SectionTitle>{t('profile_section.title')}</SectionTitle>
        <p className="text-xs text-[var(--lx-text-muted)] mb-3">
          {t('profile_section.logged_in_as')}{' '}
          <span className="text-[var(--lx-text)] font-medium">{me?.username}</span>
        </p>
        <div className="flex flex-col gap-3">
          <Field label={t('profile_section.display_name')}>
            <input
              className={inputCls}
              value={profileForm.full_name}
              onChange={(e) => setProfileForm((f) => ({ ...f, full_name: e.target.value }))}
            />
          </Field>
          <Field label={t('profile_section.email')}>
            <input
              type="email"
              className={inputCls}
              value={profileForm.email}
              onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
            />
          </Field>
        </div>
        {profileStatus && <StatusMsg ok={profileStatus.ok} msg={profileStatus.msg} />}
        <SaveButton onClick={() => profileMut.mutate()} loading={profileMut.isPending} />
      </Card>

      {/* ── Password ── */}
      <Card>
        <SectionTitle>{t('profile_section.pw_title')}</SectionTitle>
        <div className="flex flex-col gap-3">
          <Field label={t('profile_section.pw_current')}>
            <input
              type="password"
              autoComplete="current-password"
              className={inputCls}
              value={pwForm.current}
              onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
            />
          </Field>
          <Field label={t('profile_section.pw_new')}>
            <input
              type="password"
              autoComplete="new-password"
              className={inputCls}
              value={pwForm.password}
              onChange={(e) => setPwForm((f) => ({ ...f, password: e.target.value }))}
            />
          </Field>
          <Field label={t('profile_section.pw_confirm')}>
            <input
              type="password"
              className={inputCls}
              value={pwForm.confirm}
              onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
            />
          </Field>
        </div>
        {pwStatus && <StatusMsg ok={pwStatus.ok} msg={pwStatus.msg} />}
        <SaveButton onClick={() => pwMut.mutate()} loading={pwMut.isPending} />
      </Card>

      {/* ── Muted notifications ── */}
      <MutedNotificationsCard />

      {/* ── Active Sessions ── */}
      <Card>
        <SectionTitle>{t('profile_section.sessions_title')}</SectionTitle>
        <div className="flex flex-col gap-2 mb-3">
          {sessions.length === 0 && (
            <p className="text-xs text-[var(--lx-text-muted)]">
              {t('profile_section.no_sessions')}
            </p>
          )}
          {sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between px-3 py-2 rounded-md bg-[var(--lx-elevated)] border border-[var(--lx-border-soft)] text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <MonitorSmartphone size={15} className="shrink-0 text-[var(--lx-text-muted)]" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--lx-text)] font-medium truncate">
                      {s.label.replace(/^web-session(\s*·\s*|-)?/, '') || t('profile_section.session_generic')}
                    </span>
                    {isCurrent(s) && (
                      <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--lx-state-up)]/15 text-[var(--lx-state-up)]">
                        {t('profile_section.session_current')}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[var(--lx-text-muted)]">
                    {fmtDate(s.created_at)}
                    {s.last_used_at && ` · ${t('profile_section.session_last_used')} ${fmtDate(s.last_used_at)}`}
                  </div>
                </div>
              </div>
              {!isCurrent(s) && (
                <button
                  onClick={() => revokeKeyMut.mutate(s.id)}
                  className="p-1 shrink-0 text-[var(--lx-text-muted)] hover:text-[var(--lx-state-down)]"
                  title={t('profile_section.session_revoke')}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
        {sessions.some((s) => !isCurrent(s)) && (
          <button
            onClick={() => revokeOthersMut.mutate()}
            disabled={revokeOthersMut.isPending}
            className="lx-btn lx-btn--secondary lx-btn--sm inline-flex items-center gap-1.5"
          >
            <LogOut size={13} />
            {t('profile_section.sessions_revoke_others')}
          </button>
        )}
      </Card>

      {/* ── API Keys ── */}
      <Card>
        <SectionTitle>{t('profile_section.keys_title')}</SectionTitle>

        {createdToken && (
          <div className="mb-4 p-3 rounded-md bg-[var(--lx-state-up)]/10 border border-[var(--lx-state-up)]/30">
            <p className="text-xs text-[var(--lx-state-up)] mb-1 font-medium">
              {t('profile_section.key_once_visible')}
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono text-[var(--lx-text)] break-all">
                {createdToken}
              </code>
              <button
                onClick={copyToken}
                className="shrink-0 p-1.5 rounded text-[var(--lx-text-muted)] hover:text-[var(--lx-accent)]"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <button
              onClick={() => setCreatedToken(null)}
              className="mt-2 text-[10px] text-[var(--lx-text-muted)] hover:text-[var(--lx-text)]"
            >
              {t('common.close')}
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2 mb-4">
          {apiKeys.length === 0 && (
            <p className="text-xs text-[var(--lx-text-muted)]">{t('profile_section.no_keys')}</p>
          )}
          {apiKeys.map((k) => (
            <div
              key={k.id}
              className="flex items-center justify-between px-3 py-2 rounded-md bg-[var(--lx-elevated)] border border-[var(--lx-border-soft)] text-sm"
            >
              <div>
                <span className="text-[var(--lx-text)] font-medium">{k.label}</span>
                <span className="ml-2 text-xs text-[var(--lx-text-muted)] font-mono">{k.prefix}…</span>
              </div>
              <button
                onClick={() => revokeKeyMut.mutate(k.id)}
                className="p-1 text-[var(--lx-text-muted)] hover:text-[var(--lx-state-down)]"
                title={t('profile_section.revoke_key')}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            className={`${inputCls} flex-1`}
            placeholder={t('profile_section.key_label_placeholder')}
            value={newKeyLabel}
            onChange={(e) => setNewKeyLabel(e.target.value)}
          />
          <button
            onClick={() => createKeyMut.mutate()}
            disabled={createKeyMut.isPending}
            className="px-3 py-1.5 rounded-md text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
            style={{
              background: 'linear-gradient(135deg, var(--lx-accent), var(--lx-accent-2))',
              color: 'var(--lx-bg)',
            }}
          >
            {t('profile_section.create_key')}
          </button>
        </div>
      </Card>
    </div>
  )
}
