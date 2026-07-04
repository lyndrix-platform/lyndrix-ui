// Effective-access view (Identity & Permissions 2.0).
//
// The server derives everything (GET /api/me/access) — this module only
// caches and exposes it. NEVER re-implement permission matching client-side;
// enforcement lives in the backend, this just decides what to *render*.
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './api'

export interface PluginAccess {
  visible: boolean
  can_read: boolean
  can_write: boolean
  routes: string[]
}

export interface AccessView {
  status: string
  username: string
  groups: string[]
  is_superadmin: boolean
  permissions: string[]
  plugins: Record<string, PluginAccess>
}

export function getAccess(): Promise<AccessView> {
  return apiFetch<AccessView>('/api/me/access')
}

/** Query hook — one shared cache entry for the whole shell. */
export function useAccess() {
  return useQuery({
    queryKey: ['me-access'],
    queryFn: getAccess,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })
}

/** Permission check over a loaded access view (superadmin bypasses). */
export function can(access: AccessView | undefined, permission: string): boolean {
  if (!access) return false
  if (access.is_superadmin) return true
  if (access.permissions.includes(permission)) return true
  // Mirror of the server-side per-plugin fallback — display parity only.
  if (permission.startsWith('plugin:')) {
    if (permission.endsWith(':api:read') && access.permissions.includes('api:read')) return true
    if (permission.endsWith(':api:write') && access.permissions.includes('api:write')) return true
  }
  return false
}

/** Whether a plugin should appear at all (umbrella grant OR any route grant). */
export function pluginVisible(access: AccessView | undefined, pluginId: string): boolean {
  if (!access) return false
  if (access.is_superadmin) return true
  const p = access.plugins[pluginId]
  return !!p && (p.visible || p.routes.length > 0)
}

/** Whether a specific react route of a plugin may be opened. */
export function routeAllowed(
  access: AccessView | undefined,
  pluginId: string,
  path: string,
): boolean {
  if (!access) return false
  if (access.is_superadmin) return true
  const p = access.plugins[pluginId]
  return !!p && p.routes.includes(path)
}
