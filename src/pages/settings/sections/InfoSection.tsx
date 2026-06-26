import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../../../lib/api'
import type { SystemInfoOut } from '../../../lib/types'
import { Card, SectionTitle, StatusMsg } from '../shared'

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

function RestartCard() {
  const [phase, setPhase] = useState<'idle' | 'confirm' | 'restarting' | 'error'>('idle')
  const [err, setErr] = useState<string | null>(null)

  async function doRestart() {
    setPhase('restarting')
    setErr(null)
    try {
      await apiFetch('/api/system/restart', { method: 'POST' })
    } catch {
      // The connection drops as the container goes down — expected, not a failure.
    }
    // Poll until the core answers again, then reload the page.
    const start = Date.now()
    const poll = async () => {
      try {
        await apiFetch<SystemInfoOut>('/api/system/info')
        window.location.reload()
      } catch {
        if (Date.now() - start > 120_000) {
          setPhase('error')
          setErr('Zeitüberschreitung beim Warten auf den Core. Bitte die Seite manuell neu laden.')
          return
        }
        setTimeout(poll, 2500)
      }
    }
    setTimeout(poll, 4000)
  }

  return (
    <Card>
      <SectionTitle>Wartung</SectionTitle>
      <p className="text-xs text-[var(--lx-text-muted)] mb-3">
        Startet den Core-Container neu — z. B. damit ein Plugin-Upgrade greift. Die Oberfläche
        verbindet sich nach dem Neustart automatisch wieder.
      </p>
      {phase === 'restarting' ? (
        <div className="flex items-center gap-2 text-sm text-[var(--lx-accent)]">
          <span className="lx-spinner" /> Core startet neu – bitte warten…
        </div>
      ) : phase === 'confirm' ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-[var(--lx-text)]">Core-Container wirklich neu starten?</span>
          <button className="lx-btn lx-btn--danger" onClick={doRestart}>Ja, neu starten</button>
          <button className="lx-btn lx-btn--ghost" onClick={() => setPhase('idle')}>Abbrechen</button>
        </div>
      ) : (
        <button className="lx-btn lx-btn--danger" onClick={() => setPhase('confirm')}>
          Core neu starten
        </button>
      )}
      {err && <StatusMsg ok={false} msg={err} />}
    </Card>
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

      <RestartCard />
    </div>
  )
}
