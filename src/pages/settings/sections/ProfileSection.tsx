import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Copy, Check, Trash2 } from 'lucide-react'
import { apiFetch } from '../../../lib/api'
import type { ApiKeyOut, UserOut } from '../../../lib/types'
import { Card, Field, SectionTitle, SaveButton, StatusMsg, inputCls } from '../shared'

interface MeResponse extends UserOut {
  method: string
  is_system: boolean
}

export default function ProfileSection(_: {
  config: Record<string, unknown>
  envLocked: string[]
}) {
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

  // ── Profile form ─────────────────────────────────────────────────────────────

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
      setProfileStatus({ ok: true, msg: 'Profil gespeichert.' })
      qc.invalidateQueries({ queryKey: ['me'] })
    },
    onError: (e) =>
      setProfileStatus({ ok: false, msg: e instanceof Error ? e.message : 'Fehler' }),
  })

  // ── Password form ─────────────────────────────────────────────────────────────

  const [pwForm, setPwForm] = useState({ password: '', confirm: '' })
  const [pwStatus, setPwStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  const pwMut = useMutation({
    mutationFn: () => {
      if (pwForm.password !== pwForm.confirm) throw new Error('Passwörter stimmen nicht überein.')
      if (pwForm.password.length < 8) throw new Error('Mindestens 8 Zeichen.')
      return apiFetch(`/api/users/${me!.username}`, {
        method: 'PATCH',
        body: JSON.stringify({ password: pwForm.password }),
      })
    },
    onSuccess: () => {
      setPwStatus({ ok: true, msg: 'Passwort geändert.' })
      setPwForm({ password: '', confirm: '' })
    },
    onError: (e) => setPwStatus({ ok: false, msg: e instanceof Error ? e.message : 'Fehler' }),
  })

  // ── API keys ──────────────────────────────────────────────────────────────────

  const [newKeyLabel, setNewKeyLabel] = useState('')
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const createKeyMut = useMutation({
    mutationFn: () =>
      apiFetch<{ raw_key: string }>(`/api/users/${me!.username}/api-keys`, {
        method: 'POST',
        body: JSON.stringify({ label: newKeyLabel || 'Manuell erstellt', scopes: [] }),
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
        <SectionTitle>Profil</SectionTitle>
        <p className="text-xs text-[var(--lx-text-muted)] mb-3">
          Angemeldet als <span className="text-[var(--lx-text)] font-medium">{me?.username}</span>
        </p>
        <div className="flex flex-col gap-3">
          <Field label="Anzeigename">
            <input
              className={inputCls}
              value={profileForm.full_name}
              onChange={(e) => setProfileForm((f) => ({ ...f, full_name: e.target.value }))}
            />
          </Field>
          <Field label="E-Mail">
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
        <SectionTitle>Passwort ändern</SectionTitle>
        <div className="flex flex-col gap-3">
          <Field label="Neues Passwort">
            <input
              type="password"
              className={inputCls}
              value={pwForm.password}
              onChange={(e) => setPwForm((f) => ({ ...f, password: e.target.value }))}
            />
          </Field>
          <Field label="Passwort bestätigen">
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

      {/* ── API Keys ── */}
      <Card>
        <SectionTitle>API-Schlüssel</SectionTitle>

        {createdToken && (
          <div className="mb-4 p-3 rounded-md bg-[var(--lx-state-up)]/10 border border-[var(--lx-state-up)]/30">
            <p className="text-xs text-[var(--lx-state-up)] mb-1 font-medium">
              Schlüssel einmalig sichtbar — jetzt kopieren!
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
              Schließen
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2 mb-4">
          {(keys ?? []).length === 0 && (
            <p className="text-xs text-[var(--lx-text-muted)]">Keine API-Schlüssel vorhanden.</p>
          )}
          {(keys ?? []).map((k) => (
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
                title="Schlüssel widerrufen"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            className={`${inputCls} flex-1`}
            placeholder="Bezeichnung (optional)"
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
            Erstellen
          </button>
        </div>
      </Card>
    </div>
  )
}
