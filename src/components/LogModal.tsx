// Live log tail for one source (plugin OR core module) — WS-2.C.
//
// Polls GET /api/logs?source=… once per second while open (the ring buffer is
// tiny and RAM-resident; a full re-fetch is cheaper than SSE-broadcasting every
// log line to every connected tab). Pauses while the browser tab is hidden.
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { X, Pause, Play } from 'lucide-react'
import { apiFetch } from '../lib/api'

interface LogLine {
  source: string
  level: string
  message: string
}

const LEVEL_COLOR: Record<string, string> = {
  DEBUG: 'var(--lx-text-muted)',
  INFO: 'var(--lx-log-fg)',
  WARNING: 'var(--lx-state-paused)',
  ERROR: 'var(--lx-state-down)',
  CRITICAL: 'var(--lx-state-down)',
}

export default function LogModal({
  source,
  title,
  onClose,
}: {
  /** Exact logger name — use PluginOut.log_source, never re-derive it. */
  source: string
  title: string
  onClose: () => void
}) {
  const { t } = useTranslation('ui')
  const [live, setLive] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  const { data } = useQuery({
    queryKey: ['logs', source],
    queryFn: () =>
      apiFetch<{ lines: LogLine[] }>(
        `/api/logs?source=${encodeURIComponent(source)}&limit=300`,
      ),
    refetchInterval: live && !document.hidden ? 1000 : false,
  })
  const lines = data?.lines ?? []

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
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--lx-border-soft)]">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[var(--lx-text)] truncate">
              {t('logs.title', { defaultValue: 'Logs' })}: {title}
            </h2>
            <p className="text-[10px] text-[var(--lx-text-muted)] lx-mono truncate">{source}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
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
              {t('logs.empty', { defaultValue: 'No log lines captured for this source yet.' })}
            </p>
          )}
          {lines.map((l, i) => (
            <div key={i} className="whitespace-pre-wrap break-all" style={{ color: LEVEL_COLOR[l.level] ?? 'var(--lx-log-fg)' }}>
              {l.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
