import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Check,
  CheckCircle,
  Info,
  X,
} from 'lucide-react'
import {
  clearAllNotifications,
  dismissNotification,
  getNotifications,
  markNotificationRead,
  type NotificationItem,
} from '../lib/api'
import { useSSE } from '../lib/useSSE'
import { toast } from '../lib/toast'

function severityIcon(type: string) {
  switch (type) {
    case 'positive':
      return CheckCircle
    case 'negative':
      return AlertCircle
    case 'warning':
      return AlertTriangle
    default:
      return Info
  }
}

function severityColor(type: string): string {
  switch (type) {
    case 'positive':
      return 'var(--lx-state-up)'
    case 'negative':
      return 'var(--lx-state-down)'
    case 'warning':
      return 'var(--lx-state-paused)'
    default:
      return 'var(--lx-accent)'
  }
}

function formatRelative(ts: number): string {
  // Backend timestamps are epoch seconds (time.time()).
  const seconds = Math.max(0, Math.floor(Date.now() / 1000 - ts))
  if (seconds < 60) return 'gerade eben'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `vor ${minutes} Min.`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `vor ${hours} Std.`
  const days = Math.floor(hours / 24)
  return `vor ${days} Tag${days === 1 ? '' : 'en'}`
}

export default function NotificationBell() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
  })

  useSSE((topic, payload) => {
    if (topic === 'notification:new') {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      const p = payload as { title?: string } | null
      if (p?.title) toast.info(p.title)
    }
  })

  // Close on click outside.
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const items: NotificationItem[] = data?.notifications ?? []
  const unread = data?.unread ?? 0

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['notifications'] })
  }

  async function handleRead(id: string) {
    await markNotificationRead(id)
    invalidate()
  }

  async function handleDismiss(id: string) {
    await dismissNotification(id)
    invalidate()
  }

  async function handleClearAll() {
    await clearAllNotifications()
    invalidate()
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="lx-icon-btn relative"
        title="Benachrichtigungen"
        aria-label="Benachrichtigungen"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-semibold flex items-center justify-center"
            style={{ background: 'var(--lx-accent)', color: 'var(--lx-bg)' }}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="lx-card absolute right-0 mt-2 w-80 z-50 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--lx-border-soft)]">
            <span className="text-sm font-semibold text-[var(--lx-text)]">
              Benachrichtigungen
            </span>
            {items.length > 0 && (
              <button
                type="button"
                className="text-xs text-[var(--lx-text-muted)] hover:text-[var(--lx-state-down)] transition-colors"
                onClick={handleClearAll}
              >
                Alle löschen
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-[var(--lx-text-muted)]">
                Keine Benachrichtigungen
              </div>
            ) : (
              items.map((n) => {
                const Icon = severityIcon(n.type)
                return (
                  <div
                    key={n.id}
                    className="group flex items-start gap-2.5 px-3 py-2.5 border-b border-[var(--lx-border-soft)] last:border-b-0 hover:bg-[var(--lx-elevated)]/50 transition-colors"
                  >
                    <Icon
                      size={16}
                      className="mt-0.5 shrink-0"
                      style={{ color: severityColor(n.type) }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {!n.read && (
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: 'var(--lx-accent)' }}
                          />
                        )}
                        <p
                          className={[
                            'text-xs truncate',
                            n.read
                              ? 'text-[var(--lx-text-muted)]'
                              : 'text-[var(--lx-text)] font-medium',
                          ].join(' ')}
                        >
                          {n.title}
                        </p>
                      </div>
                      <p className="text-[11px] text-[var(--lx-text-muted)] mt-0.5 line-clamp-2 break-words">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-[var(--lx-text-muted)] mt-1">
                        {formatRelative(n.timestamp)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!n.read && (
                        <button
                          type="button"
                          className="text-[var(--lx-text-muted)] hover:text-[var(--lx-state-up)] transition-colors"
                          title="Als gelesen markieren"
                          onClick={() => handleRead(n.id)}
                        >
                          <Check size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        className="text-[var(--lx-text-muted)] hover:text-[var(--lx-state-down)] transition-colors"
                        title="Entfernen"
                        onClick={() => handleDismiss(n.id)}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
