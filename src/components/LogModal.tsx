// Live log tail — one source (plugin OR core module) and/or one cluster instance.
//
// Two stores behind GET /api/logs:
//   • memory  (no `instance`): this instance's RAM ring buffer. Behind a load
//     balancer "this instance" is whichever pod answered — fine in single mode.
//   • db      (`instance=<id|all>`): the shared cluster_logs table every instance
//     ships its lines to. Shows ONE instance's log, or all merged, from any pod,
//     and survives pod restarts. Default in a cluster (more than one instance).
// Polls while open (1 s memory / 2 s db) and pauses while the tab is hidden.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { X, Pause, Play, Server } from 'lucide-react'
import { apiFetch } from '../lib/api'

interface LogLine {
  source: string
  level: string
  message: string
  instance?: string
  ts?: string | null
  id?: number
}

interface LogInstancesOut {
  self: string
  enabled: boolean
  instances: { instance_id: string; alive: boolean; lines: number; last_ts: string | null }[]
}

const LEVEL_COLOR: Record<string, string> = {
  DEBUG: 'var(--lx-text-muted)',
  INFO: 'var(--lx-log-fg)',
  WARNING: 'var(--lx-state-paused)',
  ERROR: 'var(--lx-state-down)',
  CRITICAL: 'var(--lx-state-down)',
}

const LOCAL = '__local__'
const ALL = 'all'

export default function LogModal({
  source,
  instance,
  title,
  onClose,
}: {
  /** Exact logger name — use PluginOut.log_source, never re-derive it. Omit for every source. */
  source?: string
  /** Preselect an instance id (Cluster page) — defaults to "all" in a cluster, local memory otherwise. */
  instance?: string
  title: string
  onClose: () => void
}) {
  const { t } = useTranslation('ui')
  const [live, setLive] = useState(true)
  const [selected, setSelected] = useState<string | null>(instance ?? null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const instancesQ = useQuery({
    queryKey: ['logs', 'instances'],
    queryFn: () => apiFetch<LogInstancesOut>('/api/logs/instances'),
    staleTime: 15_000,
  })
  const knownInstances = instancesQ.data?.instances ?? []
  const storeEnabled = instancesQ.data?.enabled ?? false

  // Default: "all instances" once more than one instance ever shipped logs
  // (cluster), otherwise the local ring buffer (single node, zero latency).
  const effective = useMemo(() => {
    if (selected) return selected
    if (storeEnabled && knownInstances.length > 1) return ALL
    return LOCAL
  }, [selected, storeEnabled, knownInstances.length])

  const params = new URLSearchParams()
  if (source) params.set('source', source)
  params.set('limit', '300')
  if (effective !== LOCAL) params.set('instance', effective)

  const { data } = useQuery({
    queryKey: ['logs', source ?? '*', effective],
    queryFn: () => apiFetch<{ lines: LogLine[]; store: string; answered_by?: string }>(`/api/logs?${params.toString()}`),
    refetchInterval: live && !document.hidden ? (effective === LOCAL ? 1000 : 2000) : false,
  })
  const lines = data?.lines ?? []
  const showInstance = effective === ALL

  // Follow the tail while live.
  useEffect(() => {
    if (live && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines.length, live])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--lx-scrim)] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[min(56rem,calc(100vw-24px))] h-[min(75vh,calc(100dvh-24px))] flex flex-col rounded-lg border border-[var(--lx-glass-border)] shadow-[var(--lx-shadow-lg)]"
        style={{ background: 'var(--lx-surface-glass)', backdropFilter: 'blur(var(--lx-blur-md))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--lx-border-soft)]">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[var(--lx-text)] truncate">
              {t('logs.title', { defaultValue: 'Logs' })}: {title}
            </h2>
            <p className="text-[10px] text-[var(--lx-text-muted)] lx-mono truncate">
              {source ?? t('logs.all_sources', { defaultValue: 'all sources' })}
              {data?.answered_by && effective === LOCAL && ` · ${data.answered_by}`}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {(storeEnabled || knownInstances.length > 0) && (
              <label className="inline-flex items-center gap-1 text-[11px] text-[var(--lx-text-muted)]" title={t('logs.instance', { defaultValue: 'Instance' })}>
                <Server size={13} />
                <select
                  className="lx-input text-[11px] py-0.5 max-w-[14rem]"
                  value={effective}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  <option value={LOCAL}>{t('logs.local', { defaultValue: 'This instance (live)' })}</option>
                  <option value={ALL}>{t('logs.all_instances', { defaultValue: 'All instances' })}</option>
                  {knownInstances.map((i) => (
                    <option key={i.instance_id} value={i.instance_id}>
                      {i.instance_id}{i.alive ? '' : ` (${t('cluster.stale', { defaultValue: 'stale' })})`}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              onClick={() => setLive((v) => !v)}
              className="p-1.5 rounded text-[var(--lx-text-muted)] hover:text-[var(--lx-accent)]"
              title={live ? t('logs.pause', { defaultValue: 'Pause' }) : t('logs.resume', { defaultValue: 'Live' })}
            >
              {live ? <Pause size={15} /> : <Play size={15} />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded text-[var(--lx-text-muted)] hover:text-[var(--lx-text)]"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div
          ref={scrollRef}
          className="flex-1 overflow-auto px-4 py-3 lx-mono text-[11px] leading-relaxed"
          style={{ background: 'var(--lx-log-bg)' }}
        >
          {lines.length === 0 && (
            <p className="text-[var(--lx-text-muted)]">
              {effective === LOCAL
                ? t('logs.empty', { defaultValue: 'No log lines captured for this source yet.' })
                : t('logs.empty_store', { defaultValue: 'No stored log lines for this selection yet.' })}
            </p>
          )}
          {lines.map((l, i) => (
            <div key={l.id ?? i} className="whitespace-pre-wrap break-all" style={{ color: LEVEL_COLOR[l.level] ?? 'var(--lx-log-fg)' }}>
              {showInstance && l.instance && <span className="text-[var(--lx-text-muted)]">[{l.instance}] </span>}
              {l.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
