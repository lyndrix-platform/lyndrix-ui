import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import GlassSurface from '../components/GlassSurface'
import { getMe } from '../lib/auth'
import { apiFetch } from '../lib/api'
import WelcomeSection from '../components/dashboard/WelcomeSection'
import PluginLaunchpad from '../components/dashboard/PluginLaunchpad'
import type { PluginOut, HealthResponse, VaultStatusResponse } from '../lib/types'

export default function DashboardPage() {
  const { t } = useTranslation('ui')

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

  const vaultOk = !!vaultStatus && vaultStatus.connected && !vaultStatus.sealed

  // Aggregate health is "unknown" unless a plugin implements health(), so treat
  // unknown/ok as healthy and only flag actual error/degraded states.
  const coreState: 'up' | 'down' | 'paused' = !health
    ? 'down'
    : health.status === 'error'
      ? 'down'
      : health.status === 'degraded'
        ? 'paused'
        : 'up'

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 md:px-8 flex flex-col gap-9">
      {/* Welcome */}
      <WelcomeSection me={me} health={health} vaultStatus={vaultStatus} />

      {/* Platform stat tiles */}
      <section>
        <h2 className="lx-eyebrow mb-3">{t('dashboard.platform')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatTile
            icon="extension"
            label={t('dashboard.plugins_active')}
            value={`${activePlugins.length} / ${totalPlugins.length}`}
            state="up"
          />
          <StatTile
            icon="dns"
            label={t('dashboard.core')}
            value={health?.core_version ? `v${health.core_version}` : '—'}
            state={coreState}
          />
          <StatTile
            icon="lock"
            label={t('dashboard.vault')}
            value={vaultStatus?.ui_state ?? '—'}
            state={vaultOk ? 'up' : 'paused'}
          />
        </div>
      </section>

      {/* Core components, apps, tools & services — sectioned launchpad */}
      <PluginLaunchpad plugins={pluginList} />
    </div>
  )
}

function StatTile({
  icon,
  label,
  value,
  state,
}: {
  icon: string
  label: string
  value: string
  state: 'up' | 'down' | 'paused'
}) {
  const color = `var(--lx-state-${state})`
  return (
    <GlassSurface hover radius={16}>
      <div className="p-4 flex items-center gap-3.5">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
        >
          <span className="material-icons" style={{ fontSize: 20 }}>
            {icon}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-[var(--lx-text-muted)]">{label}</p>
          <p className="text-base font-semibold text-[var(--lx-text)] truncate leading-tight mt-0.5">
            {value}
          </p>
        </div>
      </div>
    </GlassSurface>
  )
}
