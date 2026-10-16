// Pure permission-model helpers for the user/group editors (no React, no I/O).
//
// Everything here only EXPLAINS what the server already decided — it never
// grants anything client-side. The server's `effective_permissions` is the
// truth; these helpers attach a human-readable origin ("via role X", "via
// group G", "included in permission P") so the editors can show what is
// already covered before the admin selects something redundant.
import type { GroupOut, PermissionDefOut } from '../../lib/types'

export interface RoleDefOut {
  id: string
  label: string
  plugin_id: string
  permissions: string[]
  auto_map_groups: string[]
  description: string
}

/** One group of a user with the roles/permissions it carries
 *  (`groups_detail` in GET /api/permissions/users/{u}; derived from the group
 *  list on cores that do not send it yet). */
export interface GroupDetail {
  name: string
  roles: string[]
  permissions: string[]
}

export interface UserPermissionsOut {
  username: string
  /** System flags (superadmin/bot) and — on newer cores — registry role ids. */
  roles: string[]
  groups: string[]
  extra_permissions: string[]
  from_groups: string[]
  effective_permissions: string[]
  /** Registry role ids assigned directly to the user (newer cores). */
  assigned_roles?: string[]
  groups_detail?: GroupDetail[]
}

export interface PermissionCatalogOut {
  permissions: PermissionDefOut[]
  /** key permission → permissions automatically included when the key is held. */
  implies?: Record<string, string[]>
}

export const SYSTEM_FLAGS = ['superadmin', 'bot'] as const
export type SystemFlag = (typeof SYSTEM_FLAGS)[number]

export function isSystemFlag(id: string): id is SystemFlag {
  return (SYSTEM_FLAGS as readonly string[]).includes(id)
}

/** Why a subject (user or group) holds a permission without a direct grant. */
export type Origin =
  | { kind: 'role'; roleId: string; roleLabel: string; group?: string }
  | { kind: 'group'; group: string }
  | { kind: 'implied'; by: string; byLabel: string }
  | { kind: 'inherited' }

export interface ExplainContext {
  rolesById: Map<string, RoleDefOut>
  /** Role ids assigned directly to the subject. */
  directRoles: string[]
  /** Groups the subject belongs to (users only — empty for a group). */
  groups: GroupDetail[]
  /** permission → key permissions that imply it (reverse of catalog.implies). */
  impliedBy: Map<string, string[]>
  /** Every permission the subject holds (for the implied-by check). */
  held: Set<string>
  /** Permissions granted directly to the subject — never explained as inherited. */
  directGrants: Set<string>
  /** Server-reported effective set — explains leftovers on older cores. */
  effective: Set<string>
  labelOf: (id: string) => string
}

/** Reverse `catalog.implies` into permission → [keys that imply it]. */
export function buildImpliedBy(implies: Record<string, string[]> | undefined): Map<string, string[]> {
  const out = new Map<string, string[]>()
  if (!implies) return out
  for (const [key, targets] of Object.entries(implies)) {
    for (const target of targets ?? []) {
      if (target === key) continue
      const list = out.get(target) ?? []
      if (!list.includes(key)) list.push(key)
      out.set(target, list)
    }
  }
  return out
}

/** Groups of a user with their roles/permissions — server detail when present,
 *  otherwise joined client-side from the group list (same data, older core). */
export function groupsDetailFor(
  perms: UserPermissionsOut | undefined,
  allGroups: GroupOut[] | undefined,
): GroupDetail[] {
  if (!perms) return []
  if (perms.groups_detail) return perms.groups_detail
  const byName = new Map((allGroups ?? []).map((g) => [g.name, g]))
  return perms.groups.map((name) => {
    const g = byName.get(name)
    return { name, roles: g?.roles ?? [], permissions: g?.permissions ?? [] }
  })
}

/** Registry roles assigned directly to a user. Newer cores send
 *  `assigned_roles`; older ones may carry role ids inside `roles`. */
export function directRolesFor(perms: UserPermissionsOut | undefined, roleIds: Set<string>): string[] {
  if (!perms) return []
  if (perms.assigned_roles) return perms.assigned_roles
  return perms.roles.filter((r) => roleIds.has(r))
}

/** Union of everything a subject holds: effective set, direct grants, the
 *  permissions of its direct roles, and its groups' permissions and roles. */
export function heldPermissions(
  base: Iterable<string>,
  directRoles: string[],
  groups: GroupDetail[],
  rolesById: Map<string, RoleDefOut>,
): Set<string> {
  const held = new Set(base)
  const addRole = (id: string) => rolesById.get(id)?.permissions.forEach((p) => held.add(p))
  directRoles.forEach(addRole)
  for (const g of groups) {
    g.permissions.forEach((p) => held.add(p))
    g.roles.forEach(addRole)
  }
  return held
}

/** Every non-direct source through which the subject holds `permId`.
 *  Order: direct roles → group permissions → group roles → implied → inherited. */
export function explainPermission(permId: string, ctx: ExplainContext): Origin[] {
  const origins: Origin[] = []
  for (const roleId of ctx.directRoles) {
    const role = ctx.rolesById.get(roleId)
    if (role?.permissions.includes(permId)) {
      origins.push({ kind: 'role', roleId, roleLabel: role.label })
    }
  }
  for (const g of ctx.groups) {
    if (g.permissions.includes(permId)) origins.push({ kind: 'group', group: g.name })
    for (const roleId of g.roles) {
      const role = ctx.rolesById.get(roleId)
      if (role?.permissions.includes(permId)) {
        origins.push({ kind: 'role', roleId, roleLabel: role.label, group: g.name })
      }
    }
  }
  for (const key of ctx.impliedBy.get(permId) ?? []) {
    if (ctx.held.has(key)) origins.push({ kind: 'implied', by: key, byLabel: ctx.labelOf(key) })
  }
  if (origins.length === 0 && ctx.effective.has(permId) && !ctx.directGrants.has(permId)) {
    origins.push({ kind: 'inherited' })
  }
  return origins
}

export interface RoleOrigin {
  direct: boolean
  viaGroups: string[]
}

export function roleOrigin(roleId: string, directRoles: string[], groups: GroupDetail[]): RoleOrigin {
  return {
    direct: directRoles.includes(roleId),
    viaGroups: groups.filter((g) => g.roles.includes(roleId)).map((g) => g.name),
  }
}

/** Case-insensitive substring match over several optional fields. */
export function matchesQuery(q: string, ...fields: (string | null | undefined)[]): boolean {
  if (!q) return true
  return fields.some((f) => (f ?? '').toLowerCase().includes(q))
}

/** Display order of catalog categories; unknown ones follow alphabetically. */
const CATEGORY_ORDER = ['plugin', 'feature', 'api', 'route']

/** Catalog grouped by category, categories in display order, core (plugin-less)
 *  permissions before plugin ones, then by label. */
export function groupByCategory(perms: PermissionDefOut[]): [string, PermissionDefOut[]][] {
  const buckets = new Map<string, PermissionDefOut[]>()
  for (const p of perms) {
    const key = p.category || 'other'
    const list = buckets.get(key) ?? []
    list.push(p)
    buckets.set(key, list)
  }
  const rank = (c: string) => {
    const i = CATEGORY_ORDER.indexOf(c)
    return i === -1 ? CATEGORY_ORDER.length : i
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([cat, list]) => [
      cat,
      [...list].sort(
        (a, b) =>
          Number(!!a.plugin_id) - Number(!!b.plugin_id) ||
          (a.label || a.id).localeCompare(b.label || b.id),
      ),
    ])
}

/** Roles grouped by owning plugin, plugins alphabetically, roles by label. */
export function groupRolesByPlugin(roles: RoleDefOut[]): [string, RoleDefOut[]][] {
  const buckets = new Map<string, RoleDefOut[]>()
  for (const r of roles) {
    const list = buckets.get(r.plugin_id) ?? []
    list.push(r)
    buckets.set(r.plugin_id, list)
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([plugin, list]) => [plugin, [...list].sort((a, b) => a.label.localeCompare(b.label))])
}
