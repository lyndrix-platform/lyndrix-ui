// Right-hand drawer for one user: Profile · Groups · Permissions · API keys.
// All tabs stay mounted (hidden via CSS) so unsaved drafts survive a tab switch.
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { apiFetch } from '../../lib/api'
import { useAccess } from '../../lib/access'
import type { ApiKeyOut, UserOut } from '../../lib/types'
import { isSystemFlag, matchesQuery, type SystemFlag } from './permissionModel'
import { errorMessage, useGroups, userPermissionsKey } from './queries'
import {
  ActionButton,
  Avatar,
  Badge,
  ConfirmAction,
  SearchInput,
  StatusLine,
  inputCls,
  type Status,
} from './shared'
import UserPermissionsTab from './UserPermissionsTab'

type PanelTab = 'profile' | 'groups' | 'permissions' | 'api_keys'

export default function UserDetailPanel({ user, onClose }: { user: UserOut; onClose: () => void }) {
  const { t } = useTranslation('ui')
  const [tab, setTab] = useState<PanelTab>('profile')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const tabs: { id: PanelTab; label: string }[] = [
    { id: 'profile', label: t('users_page.tab_profile') },
    { id: 'groups', label: t('users_page.tab_user_groups') },
    { id: 'permissions', label: t('users_page.tab_permissions') },
    { id: 'api_keys', label: t('users_page.api_keys') },
  ]
  const flags = user.roles.filter(isSystemFlag)

  return (
    <div className="fixed inset-0 z-40 flex" role="dialog" aria-modal="true">
      <div className="flex-1 bg-[var(--lx-scrim)]" onClick={onClose} />
      <aside className="w-full max-w-2xl h-full bg-[var(--lx-surface-glass)] backdrop-blur-[var(--lx-blur-md)] backdrop-saturate-150 border-l border-[var(--lx-border-soft)] flex flex-col">
        <header className="px-6 pt-4 shrink-0">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={user.username} size="lg" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--lx-text)] truncate">{user.full_name || user.username}</p>
                <p className="text-xs text-[var(--lx-text-muted)] truncate">
                  @{user.username}
                  {user.email ? ` · ${user.email}` : ''}
                </p>
              </div>
              {flags.map((f) => (
                <Badge key={f} label={t(`users_page.flag_${f}`)} />
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="text-[var(--lx-text-muted)] hover:text-[var(--lx-text)] text-xl leading-none"
            >
              ✕
            </button>
          </div>
          <nav className="lx-tabs">
            {tabs.map((tb) => (
              <button
                key={tb.id}
                type="button"
                onClick={() => setTab(tb.id)}
                className={`lx-tab ${tab === tb.id ? 'lx-tab--active' : ''}`}
              >
                {tb.label}
              </button>
            ))}
          </nav>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className={tab === 'profile' ? '' : 'hidden'}>
            <ProfileTab user={user} onDeleted={onClose} />
          </div>
          <div className={tab === 'groups' ? '' : 'hidden'}>
            <UserGroupsTab user={user} />
          </div>
          <div className={tab === 'permissions' ? '' : 'hidden'}>
            <UserPermissionsTab username={user.username} />
          </div>
          <div className={tab === 'api_keys' ? '' : 'hidden'}>
            <ApiKeysTab username={user.username} />
          </div>
        </div>
      </aside>
    </div>
  )
}

// ── Profile ───────────────────────────────────────────────────────────────────

function ProfileTab({ user, onDeleted }: { user: UserOut; onDeleted: () => void }) {
  const { t } = useTranslation('ui')
  const qc = useQueryClient()
  const { data: access } = useAccess()
  // superadmin/bot are platform flags, not assignable roles: the backend 403s
  // any `roles` change from a non-superadmin, so only a superadmin sees them.
  const isSuperadmin = access?.is_superadmin ?? false
  const initialFlags = user.roles.filter(isSystemFlag)
  const [form, setForm] = useState({ full_name: user.full_name ?? '', email: user.email ?? '', password: '' })
  const [flags, setFlags] = useState<SystemFlag[]>(initialFlags)
  const [status, setStatus] = useState<Status>(null)

  const flagsChanged = flags.length !== initialFlags.length || flags.some((f) => !initialFlags.includes(f))

  const patchMut = useMutation({
    mutationFn: () => {
      const updates: Record<string, unknown> = { full_name: form.full_name, email: form.email }
      if (form.password) updates.password = form.password
      // Send `roles` only when a superadmin changed a flag (a plain self-edit
      // must not trip the 403 guard) and keep any registry role ids the user
      // carries in `roles` — only the two flags are edited here.
      if (isSuperadmin && flagsChanged) {
        updates.roles = [...user.roles.filter((r) => !isSystemFlag(r)), ...flags]
      }
      return apiFetch(`/api/users/${encodeURIComponent(user.username)}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
    },
    onSuccess: () => {
      setStatus({ ok: true, msg: t('users_page.user_saved') })
      setForm((f) => ({ ...f, password: '' }))
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: userPermissionsKey(user.username) })
    },
    onError: (e) => setStatus({ ok: false, msg: errorMessage(e, t('common.error')) }),
  })

  const deleteMut = useMutation({
    mutationFn: () => apiFetch(`/api/users/${encodeURIComponent(user.username)}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      onDeleted()
    },
    onError: (e) => setStatus({ ok: false, msg: errorMessage(e, t('common.error')) }),
  })

  const fields: { label: string; key: keyof typeof form; type?: string; span?: boolean }[] = [
    { label: t('users_page.field_full_name'), key: 'full_name' },
    { label: t('users_page.field_email'), key: 'email' },
    { label: t('users_page.field_new_password'), key: 'password', type: 'password', span: true },
  ]

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="lx-section-title mb-3">{t('users_page.edit_profile')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fields.map(({ label, key, type, span }) => (
            <div key={key} className={`flex flex-col gap-1 ${span ? 'sm:col-span-2' : ''}`}>
              <label className="lx-label">{label}</label>
              <input
                className={inputCls}
                type={type ?? 'text'}
                value={form[key]}
                autoComplete={type === 'password' ? 'new-password' : undefined}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={type === 'password' ? t('users_page.pw_no_change') : ''}
              />
            </div>
          ))}
        </div>
      </section>

      {isSuperadmin && (
        <section className="rounded-lg border border-[var(--lx-border-soft)] bg-[var(--lx-elevated-glass)] px-4 py-3">
          <p className="lx-label">{t('users_page.system_flags_label')}</p>
          <p className="text-[11px] text-[var(--lx-text-muted)] mb-2">{t('users_page.system_flags_hint')}</p>
          <div className="flex flex-wrap gap-4">
            {(['superadmin', 'bot'] as SystemFlag[]).map((flag) => (
              <label key={flag} className="flex items-center gap-2 text-xs text-[var(--lx-text)]">
                <input
                  type="checkbox"
                  className="accent-[var(--lx-accent)]"
                  checked={flags.includes(flag)}
                  onChange={() =>
                    setFlags((f) => (f.includes(flag) ? f.filter((x) => x !== flag) : [...f, flag]))
                  }
                />
                {t(`users_page.flag_${flag}`)}
              </label>
            ))}
          </div>
        </section>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => patchMut.mutate()}
          disabled={patchMut.isPending}
          className="lx-btn lx-btn--primary"
        >
          {patchMut.isPending ? t('common.saving') : t('common.save')}
        </button>
        <StatusLine status={status} />
      </div>

      <section className="pt-4 border-t border-[var(--lx-border-soft)]">
        <p className="lx-eyebrow mb-2">{t('users_page.danger_zone')}</p>
        <ConfirmAction
          label={t('users_page.delete_user')}
          question={t('users_page.delete_confirm')}
          onConfirm={() => deleteMut.mutate()}
          pending={deleteMut.isPending}
        />
      </section>
    </div>
  )
}

// ── Groups (membership of this user) ──────────────────────────────────────────

function UserGroupsTab({ user }: { user: UserOut }) {
  const { t } = useTranslation('ui')
  const qc = useQueryClient()
  const { data: allGroups } = useGroups()
  const [sel, setSel] = useState<string[]>(user.groups ?? [])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<Status>(null)

  const dirty = useMemo(
    () => sel.length !== user.groups.length || sel.some((g) => !user.groups.includes(g)),
    [sel, user.groups],
  )

  const patchMut = useMutation({
    mutationFn: () =>
      apiFetch(`/api/users/${encodeURIComponent(user.username)}`, {
        method: 'PATCH',
        body: JSON.stringify({ groups: sel }),
      }),
    onSuccess: () => {
      setStatus({ ok: true, msg: t('users_page.groups_saved') })
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: userPermissionsKey(user.username) })
      qc.invalidateQueries({ queryKey: ['me-access'] })
    },
    onError: (e) => setStatus({ ok: false, msg: errorMessage(e, t('common.error')) }),
  })

  const q = search.trim().toLowerCase()
  const visible = (allGroups ?? []).filter((g) => matchesQuery(q, g.name, g.description))

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="lx-section-title">{t('users_page.field_groups')}</h3>
        <p className="text-[11px] text-[var(--lx-text-muted)] mt-0.5">{t('users_page.group_membership_hint')}</p>
      </div>
      <SearchInput value={search} onChange={setSearch} placeholder={t('users_page.search_group')} />

      <div className="flex flex-col gap-1.5">
        {visible.map((g) => {
          const member = sel.includes(g.name)
          return (
            <label
              key={g.id}
              className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border bg-[var(--lx-elevated-glass)] cursor-pointer transition-colors ${
                member ? 'border-[var(--lx-accent)]' : 'border-[var(--lx-border-soft)] hover:border-[var(--lx-accent)]'
              }`}
            >
              <input
                type="checkbox"
                className="accent-[var(--lx-accent)] mt-0.5"
                checked={member}
                onChange={() => setSel((s) => (member ? s.filter((n) => n !== g.name) : [...s, g.name]))}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--lx-text)]">{g.name}</p>
                {g.description && <p className="text-xs text-[var(--lx-text-muted)] mt-0.5">{g.description}</p>}
                <p className="text-[10px] text-[var(--lx-text-muted)] mt-1">
                  {t('users_page.role_count', { count: g.roles.length })} ·{' '}
                  {t('users_page.perm_count', { count: g.permissions.length })}
                </p>
              </div>
            </label>
          )
        })}
        {(allGroups ?? []).length === 0 && (
          <p className="text-xs text-[var(--lx-text-muted)]">{t('users_page.no_groups')}</p>
        )}
        {(allGroups ?? []).length > 0 && visible.length === 0 && (
          <p className="text-xs text-[var(--lx-text-muted)]">{t('users_page.no_groups_found')}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => patchMut.mutate()}
          disabled={!dirty || patchMut.isPending}
          className="lx-btn lx-btn--primary lx-btn--sm disabled:opacity-40"
        >
          {patchMut.isPending ? t('common.saving') : t('common.save')}
        </button>
        {dirty && (
          <>
            <button
              type="button"
              onClick={() => setSel(user.groups ?? [])}
              className="text-xs text-[var(--lx-text-muted)] hover:text-[var(--lx-text)]"
            >
              {t('users_page.discard_changes')}
            </button>
            <span className="text-[10px] text-[var(--lx-state-paused)]">{t('users_page.unsaved_changes')}</span>
          </>
        )}
        <StatusLine status={status} />
      </div>
    </div>
  )
}

// ── API keys ──────────────────────────────────────────────────────────────────

function ApiKeysTab({ username }: { username: string }) {
  const { t } = useTranslation('ui')
  const qc = useQueryClient()
  const [newKeyLabel, setNewKeyLabel] = useState('')
  const [newKeyResult, setNewKeyResult] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>(null)
  const keysKey = ['api-keys', username]

  const { data: apiKeys } = useQuery({
    queryKey: keysKey,
    queryFn: () =>
      apiFetch<{ api_keys: ApiKeyOut[] }>(`/api/users/${encodeURIComponent(username)}/api-keys`).then(
        (r) => r.api_keys,
      ),
  })

  const createMut = useMutation({
    mutationFn: () =>
      apiFetch<{ token: string }>(`/api/users/${encodeURIComponent(username)}/api-keys`, {
        method: 'POST',
        body: JSON.stringify({ label: newKeyLabel }),
      }),
    onSuccess: (data) => {
      setNewKeyResult(data.token)
      setNewKeyLabel('')
      setStatus(null)
      qc.invalidateQueries({ queryKey: keysKey })
    },
    onError: (e) => setStatus({ ok: false, msg: errorMessage(e, t('common.error')) }),
  })

  const revokeMut = useMutation({
    mutationFn: (keyId: string) =>
      apiFetch(`/api/users/${encodeURIComponent(username)}/api-keys/${keyId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keysKey }),
    onError: (e) => setStatus({ ok: false, msg: errorMessage(e, t('common.error')) }),
  })

  return (
    <div className="flex flex-col gap-4">
      <h3 className="lx-section-title">{t('users_page.api_keys')}</h3>
      {newKeyResult && (
        <div className="p-3 rounded-md border border-[var(--lx-state-up)] text-xs">
          <p className="text-[var(--lx-state-up)] mb-1 font-medium">{t('users_page.key_once_visible')}</p>
          <code className="text-[var(--lx-text)] break-all">{newKeyResult}</code>
        </div>
      )}
      <div className="flex flex-col gap-1">
        {(apiKeys ?? []).map((k) => (
          <div
            key={k.id}
            className="flex items-center justify-between gap-3 px-3 py-2 rounded-md border border-[var(--lx-border-soft)] bg-[var(--lx-elevated-glass)] text-xs"
          >
            <div className="min-w-0">
              <p className="text-[var(--lx-text)] truncate">{k.label}</p>
              <p className="font-mono text-[10px] text-[var(--lx-text-muted)]">
                {k.prefix}… · {new Date(k.created_at).toLocaleDateString()}
              </p>
            </div>
            <ActionButton small label={t('users_page.revoke')} danger onClick={() => revokeMut.mutate(k.id)} />
          </div>
        ))}
        {(apiKeys ?? []).length === 0 && (
          <p className="text-xs text-[var(--lx-text-muted)]">{t('users_page.no_api_keys')}</p>
        )}
      </div>
      <div className="flex gap-2">
        <input
          className={`${inputCls} flex-1 text-xs py-1`}
          placeholder={t('users_page.key_label_placeholder')}
          value={newKeyLabel}
          onChange={(e) => setNewKeyLabel(e.target.value)}
        />
        <button
          type="button"
          onClick={() => createMut.mutate()}
          disabled={!newKeyLabel || createMut.isPending}
          className="lx-btn lx-btn--primary lx-btn--sm shrink-0"
        >
          {t('users_page.create')}
        </button>
      </div>
      <StatusLine status={status} />
    </div>
  )
}
