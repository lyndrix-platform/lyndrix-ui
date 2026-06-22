import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getMe, logout } from '../lib/auth'
import { apiFetch } from '../lib/api'
import { LogOut, Plug, Activity } from 'lucide-react'

interface PluginEntry {
  id: string
  name: string
  version: string
  type: string
  is_active: boolean
  status: string
}

export default function DashboardPage() {
  const navigate = useNavigate()

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
  })

  const { data: plugins, isLoading: pluginsLoading } = useQuery({
    queryKey: ['plugins'],
    queryFn: () => apiFetch<{ plugins: PluginEntry[] }>('/api/plugins'),
    select: (d) => d.plugins,
  })

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: () => apiFetch<{ status: string; core_version: string }>('/api/health'),
    refetchInterval: 30_000,
  })

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[var(--lx-bg)] text-[var(--lx-text)]">
      <header className="border-b border-[var(--lx-border-soft)] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold tracking-tight text-[var(--lx-accent)]">
            Lyndrix
          </span>
          {health && (
            <span className="text-xs px-2 py-0.5 rounded-full border border-[var(--lx-border-soft)] text-[var(--lx-text-muted)]">
              v{health.core_version}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[var(--lx-text-muted)]">{me?.username}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-[var(--lx-text-muted)] hover:text-[var(--lx-text)] transition-colors"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={<Activity size={16} />}
            label="Core status"
            value={health?.status ?? '…'}
            accent={health?.status === 'ok'}
          />
          <StatCard
            icon={<Plug size={16} />}
            label="Plugins loaded"
            value={plugins ? String(plugins.filter((p) => p.type === 'PLUGIN').length) : '…'}
          />
          <StatCard
            icon={<Plug size={16} />}
            label="Plugins active"
            value={plugins ? String(plugins.filter((p) => p.is_active && p.type === 'PLUGIN').length) : '…'}
            accent
          />
        </div>

        <section>
          <h2 className="text-sm font-medium uppercase tracking-widest text-[var(--lx-text-muted)] mb-3">
            Modules
          </h2>
          {pluginsLoading ? (
            <p className="text-sm text-[var(--lx-text-muted)]">Loading…</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {plugins?.map((p) => (
                <div
                  key={p.id}
                  className="p-4 rounded-lg border border-[var(--lx-border-soft)] bg-[var(--lx-surface)] flex items-start justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-[var(--lx-text-muted)] mt-0.5">
                      {p.id} · v{p.version}
                    </p>
                  </div>
                  <span
                    className={`mt-0.5 text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      p.is_active
                        ? 'bg-[var(--lx-accent)]/10 text-[var(--lx-accent)]'
                        : 'bg-[var(--lx-border-soft)] text-[var(--lx-text-muted)]'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="p-4 rounded-lg border border-[var(--lx-border-soft)] bg-[var(--lx-surface)]">
      <div className="flex items-center gap-2 text-[var(--lx-text-muted)] mb-2">
        {icon}
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <p
        className={`text-2xl font-semibold ${
          accent ? 'text-[var(--lx-accent)]' : 'text-[var(--lx-text)]'
        }`}
      >
        {value}
      </p>
    </div>
  )
}
