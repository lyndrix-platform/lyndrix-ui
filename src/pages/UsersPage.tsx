import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import type { UserOut, ApiKeyOut, GroupOut, PermissionDefOut } from '../lib/types'

// ── Shared primitives ─────────────────────────────────────────────────────────

const inputCls = 'lx-input'

function Card({ children }: { children: React.ReactNode }) {
  return <div className="lx-card p-6">{children}</div>
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="lx-section-title mb-4">{children}</h3>
}

function Badge({ label, color = 'accent' }: { label: string; color?: 'accent' | 'muted' | 'down' }) {
  const cls = { accent: 'lx-badge--accent', muted: 'lx-badge--muted', down: 'lx-badge--down' }[color]
  return <span className={`lx-badge ${cls}`}>{label}</span>
}

function ActionButton({
  onClick,
  label,
  danger,
  small,
}: {
  onClick: () => void
  label: string
  danger?: boolean
  small?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`lx-btn ${danger ? 'lx-btn--danger' : 'lx-btn--secondary'} ${small ? 'lx-btn--sm' : ''}`}
    >
      {label}
    </button>
  )
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <input
      className={`${inputCls} text-xs py-1.5 mb-3`}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

// ── Per-user direct permission grants ──────────────────────────────────────────

function UserPermissionsSection({ username }: { username: string }) {
  const qc = useQueryClient()
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)
  const [search, setSearch] = useState('')

  // Shared cache key with GroupsTab — the catalog is fetched once.
  const { data: catalog } = useQuery({
    queryKey: ['permissions-catalog'],
    queryFn: () =>
      apiFetch<{ permissions: PermissionDefOut[] }>('/api/permissions/catalog').then((r) => r.permissions),
  })

  const { data: perms } = useQuery({
    queryKey: ['user-permissions', username],
    queryFn: () =>
      apiFetch<{
        user: { extra_permissions: string[]; from_groups: string[]; roles: string[]; groups: string[] }
      }>(`/api/permissions/users/${username}`).then((r) => r.user),
  })

  const putMut = useMutation({
    mutationFn: (permissions: string[]) =>
      apiFetch(`/api/permissions/users/${username}/extra`, {
        method: 'PUT',
        body: JSON.stringify({ permissions }),
      }),
    onSuccess: () => {
      setStatus({ ok: true, msg: 'Berechtigungen aktualisiert.' })
      qc.invalidateQueries({ queryKey: ['user-permissions', username] })
      qc.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (e) => setStatus({ ok: false, msg: e instanceof Error ? e.message : 'Fehler' }),
  })

  const extra = perms?.extra_permissions ?? []
  const inherited = new Set(perms?.from_groups ?? [])

  function toggle(permId: string) {
    const next = extra.includes(permId) ? extra.filter((p) => p !== permId) : [...extra, permId]
    putMut.mutate(next)
  }

  const q = search.trim().toLowerCase()
  const byCategory = (catalog ?? [])
    .filter(
      (p) =>
        !q ||
        (p.label || '').toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q),
    )
    .reduce<Record<string, PermissionDefOut[]>>((acc, p) => {
      ;(acc[p.category || 'Allgemein'] ||= []).push(p)
      return acc
    }, {})

  return (
    <div>
      <SectionTitle>Direkte Berechtigungen</SectionTitle>
      <p className="text-[11px] text-[var(--lx-text-muted)] -mt-3 mb-3">
        Zusätzliche Rechte für diesen Benutzer. Aus Gruppen/Rollen geerbte Rechte sind gesperrt
        (mit „✓ via Gruppe" markiert) und werden im Gruppen-Tab verwaltet.
      </p>
      <SearchInput value={search} onChange={setSearch} placeholder="Berechtigung suchen…" />
      <div className="flex flex-col gap-4">
        {Object.entries(byCategory).map(([category, ps]) => (
          <div key={category}>
            <p className="lx-eyebrow mb-2">{category}</p>
            <div className="flex flex-wrap gap-2">
              {ps.map((perm) => {
                const direct = extra.includes(perm.id)
                const fromGroup = inherited.has(perm.id)
                return (
                  <button
                    key={perm.id}
                    disabled={fromGroup || putMut.isPending}
                    onClick={() => toggle(perm.id)}
                    title={fromGroup ? 'Über Gruppe/Rolle vererbt' : perm.description || perm.id}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${
                      fromGroup
                        ? 'border-[var(--lx-border-soft)] bg-[var(--lx-elevated)] text-[var(--lx-text-muted)] opacity-70 cursor-not-allowed'
                        : direct
                          ? 'border-[var(--lx-accent)] bg-[var(--lx-accent)]/10 text-[var(--lx-accent)]'
                          : 'border-[var(--lx-border-soft)] bg-[var(--lx-elevated)] text-[var(--lx-text-muted)]'
                    }`}
                  >
                    {perm.label || perm.id}
                    {fromGroup && <span className="ml-1 font-medium">✓ via Gruppe</span>}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        {Object.keys(byCategory).length === 0 && (
          <p className="text-xs text-[var(--lx-text-muted)]">Keine Berechtigungen gefunden.</p>
        )}
      </div>
      {status && (
        <p className={`mt-2 text-xs ${status.ok ? 'text-[var(--lx-state-up)]' : 'text-[var(--lx-state-down)]'}`}>
          {status.msg}
        </p>
      )}
    </div>
  )
}

// ── User detail panel ─────────────────────────────────────────────────────────

function UserDetailPanel({
  user,
  onClose,
}: {
  user: UserOut
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    full_name: user.full_name ?? '',
    email: user.email ?? '',
    password: '',
    roles: user.roles.join(', '),
  })
  const [groupSel, setGroupSel] = useState<string[]>(user.groups ?? [])
  const [groupSearch, setGroupSearch] = useState('')
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  const { data: allGroups } = useQuery({
    queryKey: ['groups'],
    queryFn: () => apiFetch<{ groups: GroupOut[] }>('/api/permissions/groups').then((r) => r.groups),
  })
  const [newKeyLabel, setNewKeyLabel] = useState('')
  const [newKeyResult, setNewKeyResult] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const { data: apiKeys } = useQuery({
    queryKey: ['api-keys', user.username],
    queryFn: () =>
      apiFetch<{ keys: ApiKeyOut[] }>(`/api/users/${user.username}/api-keys`).then(
        (r) => r.keys
      ),
  })

  const patchMut = useMutation({
    mutationFn: () => {
      const updates: Record<string, unknown> = {
        full_name: form.full_name,
        email: form.email,
        roles: form.roles.split(',').map((s) => s.trim()).filter(Boolean),
        groups: groupSel,
      }
      if (form.password) updates.password = form.password
      return apiFetch(`/api/users/${user.username}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
    },
    onSuccess: () => {
      setStatus({ ok: true, msg: 'Benutzer gespeichert.' })
      qc.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (e) => setStatus({ ok: false, msg: e instanceof Error ? e.message : 'Fehler' }),
  })

  const deleteUserMut = useMutation({
    mutationFn: () => apiFetch(`/api/users/${user.username}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      onClose()
    },
  })

  const createKeyMut = useMutation({
    mutationFn: () =>
      apiFetch<{ raw_key: string }>(`/api/users/${user.username}/api-keys`, {
        method: 'POST',
        body: JSON.stringify({ label: newKeyLabel }),
      }),
    onSuccess: (data) => {
      setNewKeyResult(data.raw_key)
      setNewKeyLabel('')
      qc.invalidateQueries({ queryKey: ['api-keys', user.username] })
    },
  })

  const revokeKeyMut = useMutation({
    mutationFn: (keyId: string) =>
      apiFetch(`/api/users/${user.username}/api-keys/${keyId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['api-keys', user.username] }),
  })

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-md bg-[var(--lx-surface)] border-l border-[var(--lx-border-soft)] overflow-y-auto flex flex-col">
        <div className="px-5 py-4 border-b border-[var(--lx-border-soft)] flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--lx-text)]">@{user.username}</p>
            <p className="text-xs text-[var(--lx-text-muted)]">{user.full_name}</p>
          </div>
          <button onClick={onClose} className="text-[var(--lx-text-muted)] hover:text-[var(--lx-text)] text-xl leading-none">✕</button>
        </div>

        <div className="flex-1 px-5 py-4 flex flex-col gap-5">
          {/* Edit form */}
          <div>
            <SectionTitle>Profil bearbeiten</SectionTitle>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Anzeigename', key: 'full_name' },
                { label: 'E-Mail', key: 'email' },
                { label: 'Neues Passwort', key: 'password', type: 'password' },
                { label: 'Rollen (kommagetrennt)', key: 'roles' },
              ].map(({ label, key, type }) => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="lx-label">{label}</label>
                  <input
                    className={inputCls}
                    type={type ?? 'text'}
                    value={(form as Record<string, string>)[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={type === 'password' ? 'Leer lassen = kein Änderung' : ''}
                  />
                </div>
              ))}
              <div className="flex flex-col gap-1">
                <label className="lx-label">Gruppen</label>
                <SearchInput value={groupSearch} onChange={setGroupSearch} placeholder="Gruppe suchen…" />
                <div className="flex flex-wrap gap-2">
                  {(allGroups ?? [])
                    .filter((g) => !groupSearch.trim() || g.name.toLowerCase().includes(groupSearch.trim().toLowerCase()))
                    .map((g) => {
                    const member = groupSel.includes(g.name)
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() =>
                          setGroupSel((s) => (member ? s.filter((n) => n !== g.name) : [...s, g.name]))
                        }
                        className={`px-2 py-1 text-xs rounded border transition-colors ${
                          member
                            ? 'border-[var(--lx-accent)] bg-[var(--lx-accent)]/10 text-[var(--lx-accent)]'
                            : 'border-[var(--lx-border-soft)] bg-[var(--lx-elevated)] text-[var(--lx-text-muted)]'
                        }`}
                      >
                        {g.name}
                      </button>
                    )
                  })}
                  {(allGroups ?? []).length === 0 && (
                    <span className="text-xs text-[var(--lx-text-muted)]">Keine Gruppen vorhanden.</span>
                  )}
                </div>
                <p className="text-[10px] text-[var(--lx-text-muted)]">
                  Mehrfachzuordnung möglich · mit „Speichern" übernehmen.
                </p>
              </div>
            </div>
            {status && (
              <p className={`mt-2 text-xs px-2 py-1.5 rounded-md ${status.ok ? 'text-[var(--lx-state-up)]' : 'text-[var(--lx-state-down)]'}`}>
                {status.msg}
              </p>
            )}
            <button onClick={() => patchMut.mutate()} disabled={patchMut.isPending} className="lx-btn lx-btn--primary mt-4">
              {patchMut.isPending ? 'Speichern…' : 'Speichern'}
            </button>
          </div>

          {/* Direct permission grants */}
          <UserPermissionsSection username={user.username} />

          {/* API Keys */}
          <div>
            <SectionTitle>API-Schlüssel</SectionTitle>
            {newKeyResult && (
              <div className="mb-2 p-2 rounded-md bg-[var(--lx-state-up)]/10 border border-[var(--lx-state-up)]/20 text-xs">
                <p className="text-[var(--lx-state-up)] mb-1 font-medium">Schlüssel (einmalig sichtbar):</p>
                <code className="text-[var(--lx-text)] break-all">{newKeyResult}</code>
              </div>
            )}
            <div className="flex flex-col gap-1 mb-2">
              {(apiKeys ?? []).map((k) => (
                <div key={k.id} className="flex items-center justify-between px-3 py-1.5 rounded-md bg-[var(--lx-elevated)] text-xs">
                  <div>
                    <span className="text-[var(--lx-text)]">{k.label}</span>
                    <span className="ml-2 text-[var(--lx-text-muted)]">{k.prefix}…</span>
                  </div>
                  <ActionButton small label="Widerrufen" danger onClick={() => revokeKeyMut.mutate(k.id)} />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input className={`${inputCls} flex-1 text-xs py-1`} placeholder="Label für neuen Schlüssel"
                value={newKeyLabel} onChange={(e) => setNewKeyLabel(e.target.value)} />
              <button
                onClick={() => createKeyMut.mutate()}
                disabled={!newKeyLabel || createKeyMut.isPending}
                className="lx-btn lx-btn--primary lx-btn--sm shrink-0"
              >
                Erstellen
              </button>
            </div>
          </div>

          {/* Delete user */}
          <div className="mt-auto pt-4 border-t border-[var(--lx-border-soft)]">
            {deleteConfirm ? (
              <div className="flex gap-2 items-center">
                <span className="text-xs text-[var(--lx-state-down)]">Benutzer wirklich löschen?</span>
                <ActionButton small label="Ja, löschen" danger onClick={() => deleteUserMut.mutate()} />
                <ActionButton small label="Abbrechen" onClick={() => setDeleteConfirm(false)} />
              </div>
            ) : (
              <ActionButton label="Benutzer löschen" danger onClick={() => setDeleteConfirm(true)} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Create user modal ─────────────────────────────────────────────────────────

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ username: '', password: '', full_name: '', email: '' })
  const [error, setError] = useState<string | null>(null)

  const mut = useMutation({
    mutationFn: () =>
      apiFetch('/api/users', { method: 'POST', body: JSON.stringify(form) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      onClose()
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Fehler'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-[var(--lx-surface)] rounded-lg border border-[var(--lx-border-soft)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-[var(--lx-text)]">Neuer Benutzer</h3>
          <button onClick={onClose} className="text-[var(--lx-text-muted)] hover:text-[var(--lx-text)]">✕</button>
        </div>
        <div className="flex flex-col gap-3">
          {[
            { label: 'Benutzername', key: 'username' },
            { label: 'Passwort', key: 'password', type: 'password' },
            { label: 'Anzeigename', key: 'full_name' },
            { label: 'E-Mail', key: 'email' },
          ].map(({ label, key, type }) => (
            <div key={key} className="flex flex-col gap-1">
              <label className="lx-label">{label}</label>
              <input className={inputCls} type={type ?? 'text'}
                value={(form as Record<string, string>)[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
            </div>
          ))}
          {error && <p className="text-xs text-[var(--lx-state-down)]">{error}</p>}
          <button
            onClick={() => mut.mutate()}
            disabled={!form.username || !form.password || mut.isPending}
            className="lx-btn lx-btn--primary lx-btn--block mt-2"
          >
            {mut.isPending ? 'Erstellen…' : 'Erstellen'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Group membership (manage which users belong to a group) ─────────────────────

function GroupMembersSection({ group }: { group: GroupOut }) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiFetch<{ users: UserOut[] }>('/api/users').then((r) => r.users),
  })

  // Membership lives on the user (user.groups by name), so toggling membership
  // PATCHes the user's group list — naturally supports multiple groups per user.
  const patchUser = useMutation({
    mutationFn: ({ username, groups }: { username: string; groups: string[] }) =>
      apiFetch(`/api/users/${username}`, { method: 'PATCH', body: JSON.stringify({ groups }) }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['user-permissions', vars.username] })
    },
  })

  function toggle(u: UserOut) {
    const member = u.groups.includes(group.name)
    const groups = member ? u.groups.filter((n) => n !== group.name) : [...u.groups, group.name]
    patchUser.mutate({ username: u.username, groups })
  }

  const q = search.trim().toLowerCase()
  const filtered = (users ?? []).filter(
    (u) => !q || u.username.toLowerCase().includes(q) || (u.full_name || '').toLowerCase().includes(q),
  )

  return (
    <div className="mt-6 pt-4 border-t border-[var(--lx-border-soft)]">
      <p className="lx-eyebrow mb-2">Mitglieder</p>
      <SearchInput value={search} onChange={setSearch} placeholder="Mitglied suchen…" />
      <div className="flex flex-wrap gap-2">
        {filtered.map((u) => {
          const member = u.groups.includes(group.name)
          return (
            <button
              key={u.username}
              type="button"
              disabled={patchUser.isPending}
              onClick={() => toggle(u)}
              title={`@${u.username}`}
              className={`px-2 py-1 text-xs rounded border transition-colors ${
                member
                  ? 'border-[var(--lx-accent)] bg-[var(--lx-accent)]/10 text-[var(--lx-accent)]'
                  : 'border-[var(--lx-border-soft)] bg-[var(--lx-elevated)] text-[var(--lx-text-muted)]'
              }`}
            >
              {u.full_name || u.username}
            </button>
          )
        })}
        {filtered.length === 0 && (
          <span className="text-xs text-[var(--lx-text-muted)]">Keine Benutzer gefunden.</span>
        )}
      </div>
    </div>
  )
}

// ── Groups tab ────────────────────────────────────────────────────────────────

function GroupsTab() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<GroupOut | null>(null)
  const [creating, setCreating] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [permSearch, setPermSearch] = useState('')

  const { data: groups } = useQuery({
    queryKey: ['groups'],
    queryFn: () =>
      apiFetch<{ groups: GroupOut[] }>('/api/permissions/groups').then((r) => r.groups),
  })

  // NB: /catalog returns permission *definitions* (objects), not bare strings.
  const { data: catalog } = useQuery({
    queryKey: ['permissions-catalog'],
    queryFn: () =>
      apiFetch<{ permissions: PermissionDefOut[] }>('/api/permissions/catalog').then((r) => r.permissions),
  })

  const createGroupMut = useMutation({
    mutationFn: () =>
      apiFetch('/api/permissions/groups', {
        method: 'POST',
        body: JSON.stringify({ name: newGroupName }),
      }),
    onSuccess: () => {
      setCreating(false)
      setNewGroupName('')
      qc.invalidateQueries({ queryKey: ['groups'] })
    },
  })

  const deleteGroupMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/permissions/groups/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setSelected(null)
      qc.invalidateQueries({ queryKey: ['groups'] })
    },
  })

  const patchGroupMut = useMutation({
    mutationFn: ({ id, permissions }: { id: number; permissions: string[] }) =>
      apiFetch(`/api/permissions/groups/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ permissions }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  })

  function togglePermission(group: GroupOut, perm: string) {
    const perms = group.permissions.includes(perm)
      ? group.permissions.filter((p) => p !== perm)
      : [...group.permissions, perm]
    patchGroupMut.mutate({ id: group.id, permissions: perms })
    setSelected((prev) => prev ? { ...prev, permissions: perms } : prev)
  }

  const permQuery = permSearch.trim().toLowerCase()
  const groupDetailByCat = (catalog ?? [])
    .filter(
      (p) =>
        !permQuery ||
        (p.label || '').toLowerCase().includes(permQuery) ||
        p.id.toLowerCase().includes(permQuery) ||
        (p.category || '').toLowerCase().includes(permQuery),
    )
    .reduce<Record<string, PermissionDefOut[]>>((acc, p) => {
      ;(acc[p.category || 'Allgemein'] ||= []).push(p)
      return acc
    }, {})

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Group list */}
      <div className="md:col-span-1">
        <div className="flex items-center justify-between mb-2">
          <span className="lx-eyebrow">Gruppen</span>
          <button
            onClick={() => setCreating(true)}
            className="text-xs text-[var(--lx-accent)] hover:opacity-80"
          >
            + Neu
          </button>
        </div>

        {creating && (
          <div className="mb-2 flex gap-2">
            <input className={`${inputCls} text-xs py-1 flex-1`} placeholder="Gruppenname"
              value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} />
            <button onClick={() => createGroupMut.mutate()} disabled={!newGroupName}
              className="lx-btn lx-btn--primary lx-btn--sm shrink-0">
              OK
            </button>
          </div>
        )}

        <div className="flex flex-col gap-1">
          {(groups ?? []).map((g) => (
            <button
              key={g.id}
              onClick={() => setSelected(g)}
              className={`px-3 py-2 rounded-md text-sm text-left transition-colors border ${
                selected?.id === g.id
                  ? 'border-[var(--lx-accent)] bg-[var(--lx-accent)]/5 text-[var(--lx-accent)]'
                  : 'border-[var(--lx-border-soft)] bg-[var(--lx-elevated)] text-[var(--lx-text)] hover:border-[var(--lx-accent)]/30'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>

      {/* Group detail */}
      <div className="md:col-span-2">
        {selected ? (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <SectionTitle>Berechtigungen: {selected.name}</SectionTitle>
              <ActionButton small label="Löschen" danger onClick={() => deleteGroupMut.mutate(selected.id)} />
            </div>
            <SearchInput value={permSearch} onChange={setPermSearch} placeholder="Berechtigung suchen…" />
            <div className="flex flex-col gap-4">
              {Object.entries(groupDetailByCat).map(([category, perms]) => (
                <div key={category}>
                  <p className="lx-eyebrow mb-2">{category}</p>
                  <div className="flex flex-wrap gap-2">
                    {perms.map((perm) => {
                      const active = selected.permissions.includes(perm.id)
                      return (
                        <button
                          key={perm.id}
                          onClick={() => togglePermission(selected, perm.id)}
                          title={perm.description || perm.id}
                          className={`px-2 py-1 text-xs rounded border transition-colors ${
                            active
                              ? 'border-[var(--lx-accent)] bg-[var(--lx-accent)]/10 text-[var(--lx-accent)]'
                              : 'border-[var(--lx-border-soft)] bg-[var(--lx-elevated)] text-[var(--lx-text-muted)]'
                          }`}
                        >
                          {perm.label || perm.id}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
              {Object.keys(groupDetailByCat).length === 0 && (
                <p className="text-xs text-[var(--lx-text-muted)]">Keine Berechtigungen gefunden.</p>
              )}
            </div>
            <GroupMembersSection group={selected} />
          </Card>
        ) : (
          <div className="flex items-center justify-center h-32 text-sm text-[var(--lx-text-muted)]">
            Gruppe auswählen
          </div>
        )}
      </div>
    </div>
  )
}

// ── Users tab ─────────────────────────────────────────────────────────────────

function UsersTab() {
  const [selectedUser, setSelectedUser] = useState<UserOut | null>(null)
  const [creating, setCreating] = useState(false)

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiFetch<{ users: UserOut[] }>('/api/users').then((r) => r.users),
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="lx-eyebrow">
          {users?.length ?? 0} Benutzer
        </span>
        <button onClick={() => setCreating(true)} className="lx-btn lx-btn--primary lx-btn--sm">
          <span className="material-icons" style={{ fontSize: 16 }}>add</span>
          Benutzer erstellen
        </button>
      </div>

      <div className="flex flex-col gap-1">
        {(users ?? []).map((u) => (
          <div
            key={u.username}
            onClick={() => setSelectedUser(u)}
            className="flex items-center justify-between px-4 py-3 rounded-md bg-[var(--lx-surface)] border border-[var(--lx-border-soft)] hover:border-[var(--lx-accent)]/30 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-[var(--lx-elevated)] flex items-center justify-center text-xs font-medium text-[var(--lx-accent)]">
                {u.username[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--lx-text)]">
                  {u.full_name || u.username}
                </p>
                <p className="text-xs text-[var(--lx-text-muted)]">@{u.username}</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              {u.roles.map((r) => (
                <Badge key={r} label={r} color={r === 'admin' || r === 'superadmin' ? 'accent' : 'muted'} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {selectedUser && (
        <UserDetailPanel user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
      {creating && <CreateUserModal onClose={() => setCreating(false)} />}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const TABS = ['Benutzer', 'Gruppen & Rechte'] as const
type Tab = (typeof TABS)[number]

export default function UsersPage() {
  const [tab, setTab] = useState<Tab>('Benutzer')

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 md:px-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--lx-text)] tracking-tight">Benutzerverwaltung</h1>
        <p className="text-sm text-[var(--lx-text-muted)] mt-1">Benutzer, Gruppen und Berechtigungen</p>
      </div>

      <div className="lx-tabs mb-6">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`lx-tab ${tab === t ? 'lx-tab--active' : ''}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Benutzer' && <UsersTab />}
      {tab === 'Gruppen & Rechte' && <GroupsTab />}
    </div>
  )
}
