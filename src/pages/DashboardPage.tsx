import { useQuery } from '@tanstack/react-query'
import { getMe } from '../lib/auth'
import { apiFetch } from '../lib/api'
import WelcomeSection from '../components/dashboard/WelcomeSection'
import PluginLaunchpad from '../components/dashboard/PluginLaunchpad'
import type { PluginOut, HealthResponse, VaultStatusResponse } from '../lib/types'

export default function DashboardPage() {
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
  })

  const { data: plugins } = useQuery({
    queryKey: ['plugins'],
    queryFn: () => apiFetch<{ plugins: PluginOut[] }>('/api/plugins').then((r) => r.plugins),
  })

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: () => apiFetch<HealthResponse>('/api/health'),
    refetchInterval: 30_000,
  })

  const { data: vaultStatus } = useQuery({
    queryKey: ['vault-status'],
    queryFn: () => apiFetch<VaultStatusResponse>('/api/vault/status'),
    refetchInterval: 60_000,
  })

  const pluginList = plugins ?? []
  const activePlugins = pluginList.filter((p) => p.type === 'PLUGIN' && p.is_active)
  const totalPlugins = pluginList.filter((p) => p.type === 'PLUGIN')

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 md:px-8 flex flex-col gap-10">
      {/* Welcome */}
      <WelcomeSection me={me} health={health} vaultStatus={vaultStatus} />

      {/* Plugin Launchpad */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--lx-text-muted)] mb-3">
          Apps
        </h2>
        <PluginLaunchpad plugins={pluginList} />
      </section>

      {/* Compact platform facts */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--lx-text-muted)] mb-3">
          Plattform
        </h2>
        <div className="flex flex-wrap gap-6 text-sm text-[var(--lx-text-muted)]">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--lx-state-up)] inline-block" />
            {activePlugins.length} / {totalPlugins.length} Plugins aktiv
          </span>
          {health?.core_version && (
            <span className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full inline-block ${
                  health.status === 'ok'
                    ? 'bg-[var(--lx-state-up)]'
                    : 'bg-[var(--lx-state-down)]'
                }`}
              />
              Core v{health.core_version}
            </span>
          )}
          {vaultStatus && (
            <span className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full inline-block ${
                  vaultStatus.connected && !vaultStatus.sealed
                    ? 'bg-[var(--lx-state-up)]'
                    : 'bg-[var(--lx-state-paused)]'
                }`}
              />
              Vault {vaultStatus.ui_state}
            </span>
          )}
        </div>
      </section>
    </div>
  )
}
