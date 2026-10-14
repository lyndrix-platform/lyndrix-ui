export interface PluginRoute {
  path: string
  label: string
  icon: string
  sidebar_visible: boolean
}

export interface PluginSettingField {
  key: string
  label: string
  /** 'action' (core API ≥ 1.6) renders a button that calls the plugin route in `action`. */
  kind: 'str' | 'bool' | 'int' | 'select' | 'secret' | 'action'
  options: string[]
  description: string
  category: string
  default: string | null
  action?: string | null
  method?: 'POST' | 'PUT' | 'DELETE' | string
  confirm?: boolean
  danger?: boolean
}

/** Runtime status a plugin reports via ctx.set_status() (core API ≥ 1.5).
 *  `blocking` only applies to starting/maintenance: the core then answers the
 *  plugin's API with 503 + Retry-After and the shell shows a warm-up panel. */
export interface PluginRuntime {
  phase: 'starting' | 'ready' | 'degraded' | 'maintenance'
  message: string | null
  progress: { done: number; total: number } | null
  blocking: boolean
  since: string | null
  updated_at: string | null
  retry_after: number | null
}

export interface PluginOut {
  id: string
  name: string
  version: string
  description: string | null
  type: string
  is_active: boolean
  repo_url: string | null
  ui_route: string | null
  icon: string | null
  status: string
  error_message: string | null
  react_ui: boolean
  react_routes: PluginRoute[]
  settings_schema: PluginSettingField[]
  settings_ui_route: string | null
  latest_version?: string | null
  update_available?: boolean
  log_source?: string
  runtime?: PluginRuntime | null
  /** any | singleton | pinned:<role> (core API ≥ 1.7); status 'remote' = pinned elsewhere */
  placement?: string
}

export interface HealthResponse {
  status: string
  core_version: string
  api_version: string
  plugins: Record<string, { status: string; latency_ms?: number; runtime?: PluginRuntime | null }>
}

export interface VaultStatusResponse {
  status: string
  initialized: boolean
  sealed: boolean
  connected: boolean
  ui_state: string
}

/** One core dependency as reported by GET /api/boot (public, polled during boot). */
export type BootServiceStatus = 'online' | 'pending' | 'waiting' | 'action' | 'failed' | 'unavailable'

export interface BootServiceOut {
  /** vault | database | iam | modules | coordinator | leader | peers | storage */
  id: string
  status: BootServiceStatus
  /** i18n key suffix under boot.detail.* (null = no detail) */
  detail: string | null
  detail_params: Record<string, string | number>
  progress: { done: number; total: number } | null
  since: string | null
}

export interface BootStatus {
  phase: 'waiting_core' | 'loading_modules' | 'ready' | 'failed' | string
  is_booting: boolean
  ready: boolean
  failed: boolean
  mode: 'single' | 'cluster'
  vault_ui_state: string
  started_at: string
  elapsed_s: number
  summary: { online: number; total: number }
  services: BootServiceOut[]
}

export interface UserOut {
  username: string
  full_name: string | null
  email: string | null
  roles: string[]
  groups: string[]
  extra_permissions: string[]
}

export interface ApiKeyOut {
  id: string
  label: string
  prefix: string
  created_at: string
  last_used_at: string | null
  revoked: boolean
  scopes: string[]
}

export interface GroupOut {
  id: number
  name: string
  description: string | null
  permissions: string[]
  ldap_mappings: string[]
  // Identity 2.0: registered role ids assigned to this group. Roles expand to
  // permissions live at resolution time (see get_effective_permissions) rather
  // than being melted into `permissions` on assignment.
  roles: string[]
}

// /api/permissions/catalog returns permission *definitions* (objects), not bare ids.
export interface PermissionDefOut {
  id: string
  label: string
  category: string
  description: string
  icon: string
  plugin_id?: string | null
}

export interface ThemeOut {
  id: string
  name?: string
}

export interface EditableSettingMeta {
  field: string
  label: string
  kind: 'str' | 'bool' | 'int' | 'select'
  options: string[]
  category: string
  // Optional, self-describing metadata. The backend may omit these on older
  // builds; the UI falls back to i18n / the field name when absent.
  description?: string
  sensitive?: boolean
  env_var?: string
  multiline?: boolean
  // i18next keys (ns:key form) into the core-served `settings` namespace.
  // Present on newer cores; the UI falls back to a convention key, then the
  // literal label/description, when absent.
  label_key?: string
  description_key?: string
  category_key?: string
}

export interface SystemConfigOut {
  status: string
  // env_locked / editable_settings live inside config (the public snapshot).
  config: Record<string, unknown>
}

export interface SystemInfoOut {
  app_version: string
  core_version: string
  api_version: string
  python_version: string
  platform: string
  uptime_s: number
  vault_connected: boolean
  db_connected: boolean | null
  cluster_mode?: 'single' | 'cluster'
  instance_id?: string
  roles?: string[]
  is_leader?: boolean
}

// ─── Cluster (GET /api/cluster, core API ≥ 1.7) ──────────────────────────────

export interface ClusterInstanceOut {
  instance_id: string
  hostname: string | null
  roles: string[]
  core_version: string | null
  api_version: string | null
  started_at: string | null
  heartbeat_at: string | null
  age_s: number
  alive: boolean
  is_self: boolean
  meta: Record<string, unknown>
}

export interface ClusterLeaseOut {
  name: string
  holder: string | null
  acquired_at: string | null
  expires_at: string | null
  remaining_s: number
  expired: boolean
}

export type ClusterCheckStatus = 'ok' | 'warn' | 'fail' | 'skip'

export interface ClusterCheckOut {
  id: string
  status: ClusterCheckStatus
  message: string
  hint: string | null
}

export interface ClusterPlacementOut {
  plugin_id: string
  name: string
  placement: string
  role: string | null
  status: string | null
  lease: string | null
  held_here: boolean
}

export interface ClusterStatus {
  mode: 'single' | 'cluster'
  driver: string
  instance: {
    id: string
    hostname: string
    roles: string[]
    is_leader: boolean
    ready: boolean
    reasons: string[]
    draining: boolean
    started_at: string
    uptime_s: number
  }
  leader: { id: string | null; is_self: boolean }
  coordinator: {
    started: boolean
    error: string | null
    ttl_s: number
    heartbeat_s: number
    poll_ms: number
    bridge: { attached: boolean; published: number; relayed: number }
    server?: Record<string, unknown>
  }
  instances: ClusterInstanceOut[]
  alive: number
  leases: { held: string[]; wanted: string[] }
  preflight: {
    ok: number
    warn: number
    fail: number
    skip: number
    checked_at: string | null
    checks: ClusterCheckOut[]
  }
  settings: { drain_seconds: number; trusted_proxies: string; forwarded_for_seen: boolean }
  lease_table: ClusterLeaseOut[]
  placements: ClusterPlacementOut[]
}

export interface MarketplacePlugin {
  id?: string
  name: string
  description?: string
  repo_url: string   // canonical URL — matches PluginOut.repo_url used to detect installed state
  url?: string       // html_url alias sent by the backend (same value)
  clone_url?: string
  icon?: string
  version?: string
  versions?: string[]
  author?: string
  tags?: string[]
  topics?: string[]
  stars?: number
  archived?: boolean
  repo_safe?: string
  repo_aliases?: string[]
  metadata_source?: 'collection' | 'custom'
  custom_id?: number
  provider?: string
}
