import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../../../lib/api'
import type { SystemInfoOut } from '../../../lib/types'
import { Card, SectionTitle } from '../shared'

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const parts = []
  if (d) parts.push(`${d}d`)
  if (h) parts.push(`${h}h`)
  parts.push(`${m}m`)
  return parts.join(' ')
}

function StatusBadge({ ok, label }: { ok: boolean | null; label: string }) {
  if (ok === null) return <span className="text-xs text-[var(--lx-text-muted)]">{label}: unbekannt</span>
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
        ok
          ? 'bg-[var(--lx-state-up)]/10 text-[var(--lx-state-up)]'
          : 'bg-[var(--lx-state-down)]/10 text-[var(--lx-state-down)]'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-[var(--lx-state-up)]' : 'bg-[var(--lx-state-down)]'}`} />
      {label}: {ok ? 'verbunden' : 'getrennt'}
    </span>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--lx-border-soft)] last:border-0">
      <span className="text-xs text-[var(--lx-text-muted)] uppercase tracking-wide">{label}</span>
      <span className="text-sm text-[var(--lx-text)] font-mono">{value}</span>
    </div>
  )
}

export default function InfoSection(_: {
  config: Record<string, unknown>
  envLocked: string[]
}) {
  const { data: info, isLoading } = useQuery({
    queryKey: ['system-info'],
    queryFn: () => apiFetch<SystemInfoOut>('/api/system/info'),
    refetchInterval: 30_000,
  })

  if (isLoading) {
    return (
      <div className="text-sm text-[var(--lx-text-muted)] p-2">Lade System-Informationen…</div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <SectionTitle>Versionen</SectionTitle>
        <InfoRow label="App Version" value={info?.app_version ?? '—'} />
        <InfoRow label="Core Version" value={info?.core_version ?? '—'} />
        <InfoRow label="API Version" value={info?.api_version ?? '—'} />
        <InfoRow label="Python" value={info?.python_version ?? '—'} />
        <InfoRow label="Plattform" value={info?.platform ?? '—'} />
      </Card>

      <Card>
        <SectionTitle>Laufzeit</SectionTitle>
        <InfoRow
          label="Uptime"
          value={info?.uptime_s !== undefined ? formatUptime(info.uptime_s) : '—'}
        />
        <div className="flex flex-wrap gap-2 mt-3">
          <StatusBadge ok={info?.vault_connected ?? null} label="Vault" />
          <StatusBadge ok={info?.db_connected ?? null} label="Datenbank" />
        </div>
      </Card>
    </div>
  )
}
