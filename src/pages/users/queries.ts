// Shared TanStack Query hooks for the user-management page. One cache entry per
// resource, reused by every tab/editor; mutations invalidate by these keys.
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../../lib/api'
import type { GroupOut, UserOut } from '../../lib/types'
import type { PermissionCatalogOut, RoleDefOut, UserPermissionsOut } from './permissionModel'

export const usersKey = ['users'] as const
export const groupsKey = ['groups'] as const
export const rolesKey = ['permission-roles'] as const
// Sub-key of the shared ['permissions-catalog'] entry (which other pages read as
// a bare permission array) so a prefix invalidation refreshes both shapes.
export const catalogKey = ['permissions-catalog', 'full'] as const
export const userPermissionsKey = (username: string) => ['user-permissions', username] as const

export function useUsers() {
  return useQuery({
    queryKey: usersKey,
    queryFn: () => apiFetch<{ users: UserOut[] }>('/api/users').then((r) => r.users),
  })
}

export function useGroups() {
  return useQuery({
    queryKey: groupsKey,
    queryFn: () => apiFetch<{ groups: GroupOut[] }>('/api/permissions/groups').then((r) => r.groups),
  })
}

export function useRoles() {
  return useQuery({
    queryKey: rolesKey,
    queryFn: () => apiFetch<{ roles: RoleDefOut[] }>('/api/permissions/roles').then((r) => r.roles),
    staleTime: 60_000,
  })
}

export function useCatalog() {
  return useQuery({
    queryKey: catalogKey,
    queryFn: () => apiFetch<PermissionCatalogOut>('/api/permissions/catalog'),
    staleTime: 60_000,
  })
}

export function useUserPermissions(username: string) {
  return useQuery({
    queryKey: userPermissionsKey(username),
    queryFn: () =>
      apiFetch<{ user: UserPermissionsOut }>(`/api/permissions/users/${encodeURIComponent(username)}`).then(
        (r) => r.user,
      ),
  })
}

export function errorMessage(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback
}
