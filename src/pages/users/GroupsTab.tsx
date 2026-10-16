// "Groups & Permissions" tab: group list on the left, roles-first group editor
// on the right (roles → direct permissions → members).
import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { apiFetch } from '../../lib/api'
import type { GroupOut, PermissionDefOut, UserOut } from '../../lib/types'
import {
  buildImpliedBy,
  explainPermission,
  groupRolesByPlugin,
  heldPermissions,
  matchesQuery,
  type ExplainContext,
} from './permissionModel'
import { errorMessage, useCatalog, useGroups, useRoles, useUsers } from './queries'
import {
  Avatar,
  ConfirmAction,
  PermissionCategoryList,
  RoleCard,
  SearchInput,
  StatusLine,
  inputCls,
  type PermissionState,
  type Status,
} from './shared'

export default function GroupsTab() {
  const { t } = useTranslation('ui')
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')

  const { data: groups } = useGroups()
  // Derived from the list so the editor sees fresh data after every invalidation.
  const selected = groups?.find((g) => g.id === selectedId) ?? null

  const createGroupMut = useMutation({
    mutationFn: () =>
      apiFetch<{ group: GroupOut }>('/api/permissions/groups', {
        method: 'POST',
        body: JSON.stringify({ name: newGroupName }),
      }),
    onSuccess: (data) => {
      setCreating(false)
      setNewGroupName('')
      setSelectedId(data.group?.id ?? null)
      qc.invalidateQueries({ queryKey: ['groups'] })
    },
  })

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-1">
        <div className="flex items-center justify-between mb-2">
          <span className="lx-eyebrow">{t('users_page.groups_label')}</span>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="text-xs text-[var(--lx-accent)] hover:opacity-80"
          >
            {t('users_page.new_group')}
          </button>
        </div>

        {creating && (
          <div className="mb-2 flex gap-2">
            <input
              className={`${inputCls} text-xs py-1 flex-1`}
              placeholder={t('users_page.group_name_placeholder')}
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && newGroupName && createGroupMut.mutate()}
            />
            <button
              type="button"
              onClick={() => createGroupMut.mutate()}
              disabled={!newGroupName || createGroupMut.isPending}
              className="lx-btn lx-btn--primary lx-btn--sm shrink-0"
            >
              OK
            </button>
          </div>
        )}

        <div className="flex flex-col gap-1">
          {(groups ?? []).map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setSelectedId(g.id)}
              className={`px-3 py-2 rounded-md text-left transition-colors border ${
                selected?.id === g.id
                  ? 'border-[var(--lx-accent)] bg-[var(--lx-elevated-glass)] text-[var(--lx-accent)]'
                  : 'border-[var(--lx-border-soft)] bg-[var(--lx-elevated-glass)] text-[var(--lx-text)] hover:border-[var(--lx-accent)]'
              }`}
            >
              <p className="text-sm">{g.name}</p>
              <p className="text-[10px] text-[var(--lx-text-muted)]">
                {t('users_page.role_count', { count: g.roles.length })} ·{' '}
                {t('users_page.perm_count', { count: g.permissions.length })}
              </p>
            </button>
          ))}
          {(groups ?? []).length === 0 && (
            <p className="text-xs text-[var(--lx-text-muted)]">{t('users_page.no_groups')}</p>
          )}
        </div>
      </div>

      <div className="md:col-span-2">
        {selected ? (
          <GroupEditor key={selected.id} group={selected} onDeleted={() => setSelectedId(null)} />
        ) : (
          <div className="flex items-center justify-center h-32 text-sm text-[var(--lx-text-muted)]">
            {t('users_page.select_group')}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Group editor ──────────────────────────────────────────────────────────────

function GroupEditor({ group, onDeleted }: { group: GroupOut; onDeleted: () => void }) {
  const { t } = useTranslation('ui')
  const qc = useQueryClient()
  const [status, setStatus] = useState<Status>(null)
  const [query, setQuery] = useState('')
  const [hideIncluded, setHideIncluded] = useState(false)
  // Permission chips edit a LOCAL draft; nothing is persisted until Save.
  // Roles (and members) persist immediately, as before.
  const [draft, setDraft] = useState<string[] | null>(null)

  const { data: catalog } = useCatalog()
  const { data: roles } = useRoles()
  const { data: users } = useUsers()

  const perms = draft ?? group.permissions
  const dirty = !!draft && (draft.length !== group.permissions.length || draft.some((p) => !group.permissions.includes(p)))
  const memberCount = (users ?? []).filter((u) => u.groups.includes(group.name)).length

  const model = useMemo(() => {
    const rolesById = new Map((roles ?? []).map((r) => [r.id, r]))
    const labels = new Map((catalog?.permissions ?? []).map((p) => [p.id, p.label || p.id]))
    const labelOf = (id: string) => labels.get(id) ?? id
    const directGrants = new Set(perms)
    const ctx: ExplainContext = {
      rolesById,
      directRoles: group.roles,
      groups: [],
      impliedBy: buildImpliedBy(catalog?.implies),
      held: heldPermissions(perms, group.roles, [], rolesById),
      directGrants,
      effective: new Set<string>(),
      labelOf,
    }
    return { labelOf, directGrants, ctx }
  }, [catalog, roles, perms, group.roles])

  function invalidateAccess() {
    qc.invalidateQueries({ queryKey: ['groups'] })
    // Members' effective permissions and the current admin's own access may change.
    qc.invalidateQueries({ queryKey: ['user-permissions'] })
    qc.invalidateQueries({ queryKey: ['me-access'] })
  }

  const patchMut = useMutation({
    mutationFn: (permissions: string[]) =>
      apiFetch(`/api/permissions/groups/${group.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ permissions }),
      }),
    onSuccess: () => {
      setDraft(null)
      setStatus({ ok: true, msg: t('users_page.permissions_updated') })
      invalidateAccess()
    },
    onError: (e) => setStatus({ ok: false, msg: errorMessage(e, t('common.error')) }),
  })

  const roleMut = useMutation({
    mutationFn: ({ roleId, add }: { roleId: string; add: boolean }) =>
      apiFetch(`/api/permissions/groups/${group.id}/roles/${encodeURIComponent(roleId)}`, {
        method: add ? 'POST' : 'DELETE',
      }),
    onSuccess: () => {
      setStatus({ ok: true, msg: t('users_page.role_updated') })
      invalidateAccess()
    },
    onError: (e) => setStatus({ ok: false, msg: errorMessage(e, t('common.error')) }),
  })

  const deleteMut = useMutation({
    mutationFn: () => apiFetch(`/api/permissions/groups/${group.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] })
      qc.invalidateQueries({ queryKey: ['users'] })
      onDeleted()
    },
    onError: (e) => setStatus({ ok: false, msg: errorMessage(e, t('common.error')) }),
  })

  function togglePermission(permId: string) {
    setDraft(perms.includes(permId) ? perms.filter((p) => p !== permId) : [...perms, permId])
  }

  function stateOf(perm: PermissionDefOut): PermissionState {
    return { direct: model.directGrants.has(perm.id), origins: explainPermission(perm.id, model.ctx) }
  }

  function isHeldElsewhere(permId: string): boolean {
    return model.directGrants.has(permId) || explainPermission(permId, model.ctx).length > 0
  }

  const q = query.trim().toLowerCase()
  const rolesByPlugin = groupRolesByPlugin(
    (roles ?? []).filter((r) => matchesQuery(q, r.label, r.description, r.id, r.plugin_id)),
  )

  return (
    <div className="lx-card p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-[var(--lx-text)]">{group.name}</h3>
          {group.description && <p className="text-xs text-[var(--lx-text-muted)] mt-0.5">{group.description}</p>}
          <p className="text-[11px] text-[var(--lx-text-muted)] mt-1">
            {t('users_page.member_count', { count: memberCount })} ·{' '}
            {t('users_page.role_count', { count: group.roles.length })} ·{' '}
            {t('users_page.perm_count', { count: group.permissions.length })}
          </p>
        </div>
        <ConfirmAction
          label={t('users_page.delete')}
          question={t('users_page.delete_group_confirm', { name: group.name })}
          onConfirm={() => deleteMut.mutate()}
          pending={deleteMut.isPending}
        />
      </div>

      <div className="flex flex-col gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder={t('users_page.search_roles_perms')} />
        <StatusLine status={status} />
      </div>

      {/* Roles — persisted immediately */}
      <section>
        <h4 className="lx-section-title">{t('users_page.group_roles_label')}</h4>
        <p className="text-[11px] text-[var(--lx-text-muted)] mt-0.5 mb-3">{t('users_page.group_roles_hint')}</p>
        {(roles ?? []).length === 0 ? (
          <p className="text-xs text-[var(--lx-text-muted)]">{t('users_page.no_roles')}</p>
        ) : rolesByPlugin.length === 0 ? (
          <p className="text-xs text-[var(--lx-text-muted)]">{t('users_page.no_roles_found')}</p>
        ) : (
          <div className="flex flex-col gap-4">
            {rolesByPlugin.map(([pluginId, list]) => (
              <div key={pluginId}>
                <p className="lx-eyebrow mb-1.5 font-mono normal-case tracking-normal">{pluginId}</p>
                <div className="flex flex-col gap-1.5">
                  {list.map((role) => {
                    const active = group.roles.includes(role.id)
                    return (
                      <RoleCard
                        key={role.id}
                        role={role}
                        checked={active}
                        viaGroups={[]}
                        disabled={roleMut.isPending}
                        toggleTitle={t('users_page.assign_role_group')}
                        onToggle={() => roleMut.mutate({ roleId: role.id, add: !active })}
                        isHeld={isHeldElsewhere}
                        labelOf={model.labelOf}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Direct permissions — draft, persisted on Save */}
      <section>
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
          <div>
            <h4 className="lx-section-title">{t('users_page.group_direct_perms')}</h4>
            <p className="text-[11px] text-[var(--lx-text-muted)] mt-0.5">{t('users_page.group_direct_perms_hint')}</p>
          </div>
          <label className="flex items-center gap-2 text-xs text-[var(--lx-text-muted)] shrink-0 mt-0.5">
            <input
              type="checkbox"
              className="accent-[var(--lx-accent)]"
              checked={hideIncluded}
              onChange={(e) => setHideIncluded(e.target.checked)}
            />
            {t('users_page.hide_included')}
          </label>
        </div>
        <PermissionCategoryList
          perms={catalog?.permissions ?? []}
          query={query}
          hideIncluded={hideIncluded}
          stateOf={stateOf}
          onToggle={togglePermission}
          disabled={patchMut.isPending}
        />
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <button
            type="button"
            onClick={() => draft && patchMut.mutate(draft)}
            disabled={!dirty || patchMut.isPending}
            className="lx-btn lx-btn--primary lx-btn--sm disabled:opacity-40"
          >
            {patchMut.isPending ? t('common.saving') : t('common.save')}
          </button>
          {dirty && (
            <>
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="text-xs text-[var(--lx-text-muted)] hover:text-[var(--lx-text)]"
              >
                {t('users_page.discard_changes')}
              </button>
              <span className="text-[10px] text-[var(--lx-state-paused)]">{t('users_page.unsaved_changes')}</span>
            </>
          )}
        </div>
      </section>

      <GroupMembersSection group={group} users={users ?? []} />
    </div>
  )
}

// ── Members — persisted immediately ───────────────────────────────────────────

function GroupMembersSection({ group, users }: { group: GroupOut; users: UserOut[] }) {
  const { t } = useTranslation('ui')
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<Status>(null)

  const patchUser = useMutation({
    mutationFn: ({ username, groups }: { username: string; groups: string[] }) =>
      apiFetch(`/api/users/${encodeURIComponent(username)}`, {
        method: 'PATCH',
        body: JSON.stringify({ groups }),
      }),
    onSuccess: (_d, vars) => {
      setStatus(null)
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['user-permissions', vars.username] })
      qc.invalidateQueries({ queryKey: ['me-access'] })
    },
    onError: (e) => setStatus({ ok: false, msg: errorMessage(e, t('common.error')) }),
  })

  function toggle(u: UserOut) {
    const member = u.groups.includes(group.name)
    const groups = member ? u.groups.filter((n) => n !== group.name) : [...u.groups, group.name]
    patchUser.mutate({ username: u.username, groups })
  }

  const q = search.trim().toLowerCase()
  const filtered = users
    .filter((u) => matchesQuery(q, u.username, u.full_name))
    .sort((a, b) => Number(b.groups.includes(group.name)) - Number(a.groups.includes(group.name)))

  return (
    <section className="pt-4 border-t border-[var(--lx-border-soft)]">
      <h4 className="lx-section-title">{t('users_page.members')}</h4>
      <p className="text-[11px] text-[var(--lx-text-muted)] mt-0.5 mb-3">{t('users_page.members_hint')}</p>
      <SearchInput value={search} onChange={setSearch} placeholder={t('users_page.search_member')} className="mb-2" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {filtered.map((u) => {
          const member = u.groups.includes(group.name)
          return (
            <label
              key={u.username}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border bg-[var(--lx-elevated-glass)] cursor-pointer transition-colors ${
                member ? 'border-[var(--lx-accent)]' : 'border-[var(--lx-border-soft)] hover:border-[var(--lx-accent)]'
              } ${patchUser.isPending ? 'opacity-60' : ''}`}
            >
              <input
                type="checkbox"
                className="accent-[var(--lx-accent)]"
                checked={member}
                disabled={patchUser.isPending}
                onChange={() => toggle(u)}
              />
              <Avatar name={u.username} size="sm" />
              <div className="min-w-0">
                <p className="text-xs text-[var(--lx-text)] truncate">{u.full_name || u.username}</p>
                <p className="text-[10px] text-[var(--lx-text-muted)] truncate">@{u.username}</p>
              </div>
            </label>
          )
        })}
        {filtered.length === 0 && (
          <p className="text-xs text-[var(--lx-text-muted)]">{t('users_page.no_users_found')}</p>
        )}
      </div>
      <div className="mt-2">
        <StatusLine status={status} />
      </div>
    </section>
  )
}
