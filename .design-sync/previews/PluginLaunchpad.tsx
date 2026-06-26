import { PluginLaunchpad } from 'lyndrix-ui'
import type { PluginOut } from 'lyndrix-ui'

const plugins: PluginOut[] = [
  { id: '1', name: 'Server Manager', version: '0.4.0', description: 'Manage servers', type: 'PLUGIN', is_active: true, repo_url: null, ui_route: '/apps/servers', icon: 'dns', status: 'active' },
  { id: '2', name: 'Discord Notifier', version: '0.2.1', description: null, type: 'PLUGIN', is_active: true, repo_url: null, ui_route: '/apps/discord', icon: 'discord', status: 'active' },
  { id: '3', name: 'IAC SSoT', version: '0.1.0', description: null, type: 'PLUGIN', is_active: false, repo_url: null, ui_route: null, icon: 'iac', status: 'stopped' },
  { id: '4', name: 'Monitor', version: '0.3.0', description: null, type: 'PLUGIN', is_active: true, repo_url: null, ui_route: '/apps/monitor', icon: 'monitor_heart', status: 'active' },
  { id: '5', name: 'Backup', version: '0.1.2', description: null, type: 'PLUGIN', is_active: false, repo_url: null, ui_route: null, icon: 'server', status: 'installed' },
]

export const WithPlugins = () => (
  <div className="p-6 bg-[var(--lx-bg)]">
    <PluginLaunchpad plugins={plugins} />
  </div>
)

export const Empty = () => (
  <div className="p-6 bg-[var(--lx-bg)]">
    <PluginLaunchpad plugins={[]} />
  </div>
)
