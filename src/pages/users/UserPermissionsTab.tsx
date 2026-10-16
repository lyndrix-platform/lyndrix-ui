// "Permissions" tab of the user panel — roles first, single permissions below.
//
// Roles are assigned directly on the user (POST/DELETE
// /api/permissions/users/{u}/roles/{role}) or arrive through a group; single
// permissions are the user's direct grants (PUT /extra). Everything the user
// already holds through a role, a group or an implying permission is rendered
// as "included" and cannot be selected a second time.
import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { apiFetch } from '../../lib/api'
import type { PermissionDefOut } from '../../lib/types'
import {
  buildImpliedBy,
  directRolesFor,
  explainPermission,
  groupRolesByPlugin,
  groupsDetailFor,
  heldPermissions,
  matchesQuery,
  roleOrigin,
  type ExplainContext,
  type UserPermissionsOut,
} from './permissionModel'
import { errorMessage, useCatalog, useGroups, useRoles, useUserPermissions, userPermissionsKey } from './queries'
import { PermissionCategoryList, RoleCard, SearchInput, StatusLine, type PermissionState, type Status } from './shared'

export default function UserPermissionsTab({ username }: { username: string }) {
  const { t } = useTranslation('ui')
  const qc = useQueryClient()
  const [status, setStatus] = useState<Status>(null)
  const [query, setQuery] = useState('')
  const [hideIncluded, setHideIncluded] = useState(false)

  const { data: catalog } = useCatalog()
  const { data: roles } = useRoles()
  const { data: allGroups } = useGroups()
  const { data: perms, isLoading } = useUserPermissions(username)
  const permsKey = userPermissionsKey(username)

  const model = useMemo(() => {
    const rolesById = new Map((roles ?? []).map((r) => [r.id, r]))
    const directRoles = directRolesFor(perms, new Set(rolesById.keys()))
    const groups = groupsDetailFor(perms, allGroups)
    const labels = new Map((catalog?.permissions ?? []).map((p) => [p.id, p.label || p.id]))
    const labelOf = (id: string) => labels.get(id) ?? id
    const effective = new Set(perms?.effective_permissions ?? [])
    const directGrants = new Set(perms?.extra_permissions ?? [])
    const held = heldPermissions([...effective, ...directGrants], directRoles, groups, rolesById)
    const ctx: ExplainContext = {
      rolesById,
      directRoles,
      groups,
      impliedBy: buildImpliedBy(catalog?.implies),
      held,
      directGrants,
      effective,
      labelOf,
    }
    return { directRoles, groups, labelOf, directGrants, effectiveCount: effective.size, ctx }
  }, [catalog, roles, allGroups, perms])

  // Direct grants — optimistic so the "included" markers of implied permissions
  // follow the toggle immediately; the server answer settles the cache.
  const putMut = useMutation({
    mutationFn: (permissions: string[]) =>
      apiFetch(`/api/permissions/users/${encodeURIComponent(username)}/extra`, {
        method: 'PUT',
        body: JSON.stringify({ permissions }),
      }),
    onMutate: async (permissions) => {
      await qc.cancelQueries({ queryKey: permsKey })
      const prev = qc.getQueryData<UserPermissionsOut>(permsKey)
      if (prev) qc.setQueryData<UserPermissionsOut>(permsKey, { ...prev, extra_permissions: permissions })
      return { prev }
    },
    onSuccess: () => setStatus({ ok: true, msg: t('users_page.permissions_updated') }),
    onError: (e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(permsKey, ctx.prev)
      setStatus({ ok: false, msg: errorMessage(e, t('common.error')) })
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: permsKey })
      qc.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const roleMut = useMutation({
    mutationFn: ({ roleId, add }: { roleId: string; add: boolean }) =>
      apiFetch(`/api/permissions/users/${encodeURIComponent(username)}/roles/${encodeURIComponent(roleId)}`, {
        method: add ? 'POST' : 'DELETE',
      }),
    onMutate: async ({ roleId, add }) => {
      await qc.cancelQueries({ queryKey: permsKey })
      const prev = qc.getQueryData<UserPermissionsOut>(permsKey)
      if (prev) {
        const current = model.directRoles
        const next = add ? [...current, roleId] : current.filter((r) => r !== roleId)
        qc.setQueryData<UserPermissionsOut>(permsKey, { ...prev, assigned_roles: next })
      }
      return { prev }
    },
    onSuccess: () => setStatus({ ok: true, msg: t('users_page.role_updated') }),
    onError: (e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(permsKey, ctx.prev)
      setStatus({ ok: false, msg: errorMessage(e, t('common.error')) })
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: permsKey })
      qc.invalidateQueries({ queryKey: ['users'] })
      // Changing a user's roles can touch the current admin's own access.
      qc.invalidateQueries({ queryKey: ['me-access'] })
    },
  })

  const pending = putMut.isPending || roleMut.isPending

  function togglePermission(permId: string) {
    const extra = [...model.directGrants]
    putMut.mutate(extra.includes(permId) ? extra.filter((p) => p !== permId) : [...extra, permId])
  }

  function stateOf(perm: PermissionDefOut): PermissionState {
    return { direct: model.directGrants.has(perm.id), origins: explainPermission(perm.id, model.ctx) }
  }

  /** Already covered without the role in question (direct grant or any origin). */
  function isHeldElsewhere(permId: string): boolean {
    return model.directGrants.has(permId) || explainPermission(permId, model.ctx).length > 0
  }

  const q = query.trim().toLowerCase()
  const visibleRoles = (roles ?? []).filter((r) => matchesQuery(q, r.label, r.description, r.id, r.plugin_id))
  const rolesByPlugin = groupRolesByPlugin(visibleRoles)
  const activeRoles = (roles ?? []).filter((r) => {
    const o = roleOrigin(r.id, model.directRoles, model.groups)
    return o.direct || o.viaGroups.length > 0
  }).length

  if (isLoading || !perms) {
    return <p className="text-xs text-[var(--lx-text-muted)]">{t('common.loading')}</p>
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Summary + search */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--lx-text-muted)]">
          <span>{t('users_page.effective_count', { count: model.effectiveCount })}</span>
          <span>·</span>
          <span>{t('users_page.direct_count', { count: model.directGrants.size })}</span>
          <span>·</span>
          <span>{t('users_page.role_count', { count: activeRoles })}</span>
        </div>
        <SearchInput value={query} onChange={setQuery} placeholder={t('users_page.search_roles_perms')} />
        <StatusLine status={status} />
      </div>

      {/* Roles */}
      <section>
        <h3 className="lx-section-title">{t('users_page.roles_title')}</h3>
        <p className="text-[11px] text-[var(--lx-text-muted)] mt-0.5 mb-3">{t('users_page.roles_first_hint')}</p>
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
                    const origin = roleOrigin(role.id, model.directRoles, model.groups)
                    return (
                      <RoleCard
                        key={role.id}
                        role={role}
                        checked={origin.direct}
                        viaGroups={origin.viaGroups}
                        disabled={pending}
                        toggleTitle={t('users_page.assign_role_user')}
                        onToggle={() => roleMut.mutate({ roleId: role.id, add: !origin.direct })}
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

      {/* Additional single permissions */}
      <section>
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
          <div>
            <h3 className="lx-section-title">{t('users_page.additional_perms')}</h3>
            <p className="text-[11px] text-[var(--lx-text-muted)] mt-0.5">{t('users_page.additional_perms_hint')}</p>
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
          disabled={pending}
        />
      </section>
    </div>
  )
}
