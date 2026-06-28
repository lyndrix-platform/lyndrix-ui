export interface PluginRoute {
  path: string
  label: string
  icon: string
  sidebar_visible: boolean
}

export interface PluginSettingField {
  key: string
  label: string
  kind: 'str' | 'bool' | 'int' | 'select'
  options: string[]
  description: string
  category: string
  default: string | null
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
}

export interface HealthResponse {
  status: string
  core_version: string
  api_version: string
  plugins: Record<string, { status: string; latency_ms?: number }>
}

export interface VaultStatusResponse {
  status: string
  initialized: boolean
  sealed: boolean
  connected: boolean
  ui_state: string
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
}

// /api/permissions/catalog returns permission *definitions* (objects), not bare ids.
export interface PermissionDefOut {
  id: string
  label: string
  category: string
  description: string
  icon: string
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
