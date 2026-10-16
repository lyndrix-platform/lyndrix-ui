import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './api'
import { can, useAccess } from './access'
import type { PluginOut } from './types'

export interface PluginSettingsTarget {
  plugin: PluginOut
  /** Navigate to the plugin's own settings route (when it has one). */
  route: string | null
  /** The core settings dialog applies (settings_schema present, no own route). */
  dialog: boolean
}

/**
 * The plugin whose page is currently open and that has settings the caller may
 * manage — the target of the "Plugin settings" entry in the profile menu.
 * `null` on non-plugin pages, for plugins without settings, for callers without
 * `feature:plugins.manage`, and while the plugin's own settings page is open.
 */
export function usePluginSettingsTarget(): { target: PluginSettingsTarget | null; open: (onDialog: () => void) => void } {
  const location = useLocation()
  const navigate = useNavigate()
  const { data: access } = useAccess()
  const { data: plugins } = useQuery({
    queryKey: ['plugins'],
    queryFn: () => apiFetch<{ plugins: PluginOut[] }>('/api/plugins').then((r) => r.plugins),
  })

  const match = /^\/apps\/([^/]+)/.exec(location.pathname)
  let target: PluginSettingsTarget | null = null
  if (match && plugins && can(access, 'feature:plugins.manage')) {
    const safeId = match[1]
    const plugin = plugins.find((p) => p.id.replace(/\./g, '-') === safeId)
    if (plugin) {
      const hasSchema = (plugin.settings_schema?.length ?? 0) > 0
      const route = plugin.settings_ui_route ? `/apps/${safeId}${plugin.settings_ui_route}` : null
      const onOwnSettingsPage = route !== null && location.pathname === route
      if ((hasSchema || route) && !onOwnSettingsPage) {
        target = { plugin, route, dialog: !route && hasSchema }
      }
    }
  }

  function open(onDialog: () => void) {
    if (!target) return
    if (target.route) navigate(target.route)
    else onDialog()
  }

  return { target, open }
}
