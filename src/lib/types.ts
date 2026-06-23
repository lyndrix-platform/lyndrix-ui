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
  id: string
  name: string
  description: string | null
  permissions: string[]
  ldap_mappings: string[]
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
}

export interface SystemConfigOut {
  status: string
  config: Record<string, unknown>
  env_locked: string[]
  editable_settings: EditableSettingMeta[]
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
  repo_url: string
  icon?: string
  version?: string
  author?: string
  tags?: string[]
}
