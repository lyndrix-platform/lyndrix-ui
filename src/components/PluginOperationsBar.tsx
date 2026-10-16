import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp, Loader2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { usePluginOperations } from '../lib/operations'
import type { PluginOperationOut } from '../lib/types'

/**
 * Progress of cluster-wide plugin operations (core 1.8): "Upgrade state_monitoring
 * → 1.6.1 · 3/6 instances" with the per-instance outcomes on demand. Shows the
 * running operations plus the most recent finished ones.
 */
function statusTone(status: string): string {
  if (status === 'done') return 'var(--lx-state-up)'
  if (status === 'running') return 'var(--lx-accent)'
  if (status === 'partial') return 'var(--lx-state-paused)'
  return 'var(--lx-state-down)'
}

function StatusIcon({ status }: { status: string }) {
  const color = statusTone(status)
  if (status === 'running') return <Loader2 size={14} className="animate-spin" style={{ color }} />
  if (status === 'done') return <CheckCircle2 size={14} style={{ color }} />
  if (status === 'partial') return <AlertTriangle size={14} style={{ color }} />
  return <XCircle size={14} style={{ color }} />
}

function OperationRow({ op }: { op: PluginOperationOut }) {
  const { t } = useTranslation('ui')
  const [open, setOpen] = useState(op.status === 'running')
  const pct = op.total > 0 ? Math.round((op.done / op.total) * 100) : 0
  const label = op.plugin_id ?? op.repo_name ?? '?'

  return (
    <div className="px-3 py-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 text-left"
      >
        <StatusIcon status={op.status} />
        <span className="text-xs font-medium text-[var(--lx-text)] truncate">
          {t(`operations.action_${op.action}`, { defaultValue: op.action })} {label}
          {op.version ? ` → ${op.version}` : ''}
        </span>
        <span className="ml-auto text-[11px] tabular-nums text-[var(--lx-text-muted)] shrink-0">
          {t('operations.instances', { done: op.done, total: op.total })}
        </span>
        <span className="text-[11px] shrink-0" style={{ color: statusTone(op.status) }}>
          {t(`operations.status_${op.status}`, { defaultValue: op.status })}
        </span>
        {open ? <ChevronUp size={14} className="opacity-60" /> : <ChevronDown size={14} className="opacity-60" />}
      </button>
      <div className="mt-1.5 h-1 rounded-full overflow-hidden bg-[var(--lx-border-soft)]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: statusTone(op.status) }}
        />
      </div>
      {open && (
        <ul className="mt-2 flex flex-col gap-1">
          {op.instances.map((i) => (
            <li key={i.instance_id} className="flex items-center gap-2 text-[11px]">
              <StatusIcon status={i.status === 'pending' ? 'running' : i.status === 'reverted' || i.status === 'skipped' ? 'partial' : i.status} />
              <span className="font-mono text-[var(--lx-text)] truncate">{i.instance_id}</span>
              <span className="text-[var(--lx-text-muted)]">
                {t(`operations.instance_${i.status}`, { defaultValue: i.status })}
              </span>
              {i.message && (
                <span className="text-[var(--lx-text-muted)] truncate" title={i.message}>
                  – {i.message}
                </span>
              )}
            </li>
          ))}
          {op.requested_by && (
            <li className="text-[10px] text-[var(--lx-text-muted)] mt-0.5">
              {t('operations.requested_by', { user: op.requested_by })}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

export default function PluginOperationsBar() {
  const { t } = useTranslation('ui')
  const { data: ops } = usePluginOperations({ limit: 8 })
  const running = (ops ?? []).filter((o) => o.status === 'running')
  const recent = (ops ?? []).filter((o) => o.status !== 'running').slice(0, 3)
  const [showRecent, setShowRecent] = useState(false)

  if (!ops || ops.length === 0) return null

  return (
    <section className="lx-card mb-6 divide-y divide-[var(--lx-border-soft)]">
      <div className="px-3 py-2 flex items-center justify-between">
        <p className="lx-eyebrow !mb-0">{t('operations.title')}</p>
        {recent.length > 0 && (
          <button
            type="button"
            onClick={() => setShowRecent((v) => !v)}
            className="text-[11px] text-[var(--lx-text-muted)] hover:text-[var(--lx-text)]"
          >
            {showRecent ? t('operations.hide_recent') : t('operations.show_recent', { count: recent.length })}
          </button>
        )}
      </div>
      {running.map((op) => <OperationRow key={op.id} op={op} />)}
      {running.length === 0 && !showRecent && (
        <p className="px-3 py-2 text-xs text-[var(--lx-text-muted)]">{t('operations.none_running')}</p>
      )}
      {showRecent && recent.map((op) => <OperationRow key={op.id} op={op} />)}
    </section>
  )
}
