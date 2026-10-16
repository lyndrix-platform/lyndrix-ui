import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Settings } from 'lucide-react'
import { apiFetch } from '../lib/api'
import { can, useAccess } from '../lib/access'
import PluginSettingsModal from './PluginSettingsModal'
import type { PluginOut } from '../lib/types'

/**
 * Header action: the settings gear for the plugin whose page is open.
 *
 * Standard entry point for every plugin with `settings_schema` (opens the core
 * settings dialog) or `settings_ui_route` (navigates to the plugin's own
 * settings page). Rendered only on `/apps/<plugin>/…` routes for callers who
 * may manage plugins; plugins that ship their own button keep it.
 */
export default function PluginSettingsAction() {
  const { t } = useTranslation('ui')
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const { data: access } = useAccess()

  const { data: plugins } = useQuery({
    queryKey: ['plugins'],
    queryFn: () => apiFetch<{ plugins: PluginOut[] }>('/api/plugins').then((r) => r.plugins),
  })

  const match = /^\/apps\/([^/]+)/.exec(location.pathname)
  if (!match || !plugins || !can(access, 'feature:plugins.manage')) return null
  const safeId = match[1]
  const plugin = plugins.find((p) => p.id.replace(/\./g, '-') === safeId)
  if (!plugin) return null
  const hasSchema = (plugin.settings_schema?.length ?? 0) > 0
  if (!hasSchema && !plugin.settings_ui_route) return null
  // Already on the plugin's own settings page: nothing to open.
  if (plugin.settings_ui_route && location.pathname === `/apps/${safeId}${plugin.settings_ui_route}`) return null

  function openSettings() {
    if (plugin!.settings_ui_route) {
      navigate(`/apps/${safeId}${plugin!.settings_ui_route}`)
    } else {
      setOpen(true)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openSettings}
        className="lx-icon-btn"
        title={t('shell.plugin_settings', { name: plugin.name })}
        aria-label={t('shell.plugin_settings', { name: plugin.name })}
      >
        <Settings size={18} />
      </button>
      {open && (
        <PluginSettingsModal pluginId={plugin.id} pluginName={plugin.name} onClose={() => setOpen(false)} />
      )}
    </>
  )
}
