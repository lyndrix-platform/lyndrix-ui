import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CircleCheck,
  CircleMinus,
  CircleQuestionMark,
  CircleX,
  Clock,
  Crown,
  Database,
  HardDrive,
  KeyRound,
  LoaderCircle,
  Network,
  Puzzle,
  Server,
  ShieldCheck,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import LyndrixLogo from './LyndrixLogo'
import type { BootServiceOut, BootServiceStatus, BootStatus } from '../lib/types'

/**
 * Full-screen boot screen: which core dependencies are already online and which
 * are still coming (single instance) — plus the cluster dependencies in cluster
 * mode. Driven entirely by GET /api/boot; labels/details are translated here by
 * id so the backend stays string-free. While the core itself is unreachable the
 * last snapshot is only used for the *shape* of the list — every row is shown
 * as "unknown", never as a stale "online". Swap the icon maps below to brand
 * SVGs if wanted — nothing else depends on them.
 */

type RowStatus = BootServiceStatus | 'unknown'

const SERVICE_ICONS: Record<string, LucideIcon> = {
  vault: KeyRound,
  database: Database,
  iam: ShieldCheck,
  modules: Puzzle,
  coordinator: Network,
  leader: Crown,
  peers: Server,
  storage: HardDrive,
}

const STATUS_META: Record<RowStatus, { icon: LucideIcon; tone: string; spin?: boolean }> = {
  online: { icon: CircleCheck, tone: 'var(--lx-state-up)' },
  pending: { icon: LoaderCircle, tone: 'var(--lx-accent)', spin: true },
  waiting: { icon: Clock, tone: 'var(--lx-text-muted)' },
  action: { icon: TriangleAlert, tone: 'var(--lx-state-paused)' },
  failed: { icon: CircleX, tone: 'var(--lx-state-down)' },
  unavailable: { icon: CircleMinus, tone: 'var(--lx-text-muted)' },
  unknown: { icon: CircleQuestionMark, tone: 'var(--lx-state-unknown, var(--lx-text-muted))' },
}

function ServiceRow({ svc, unknown }: { svc: BootServiceOut; unknown: boolean }) {
  const { t } = useTranslation('ui')
  const Icon = SERVICE_ICONS[svc.id] ?? Puzzle
  const status: RowStatus = unknown ? 'unknown' : svc.status
  const meta = STATUS_META[status] ?? STATUS_META.waiting
  const StatusIcon = meta.icon
  const dimmed = status === 'waiting' || status === 'unavailable' || status === 'unknown'

  let detail: string | null = null
  if (unknown) {
    detail = t('boot.detail.unknown')
  } else if (svc.detail) {
    // "waiting_for" names another service — translate that name too.
    const params: Record<string, string | number> = { ...svc.detail_params }
    if (svc.detail === 'waiting_for' && typeof params.service === 'string') {
      params.service = t(`boot.service.${params.service}`, { defaultValue: params.service })
    }
    detail = t(`boot.detail.${svc.detail}`, { ...params, defaultValue: svc.detail })
  }

  return (
    <li
      className="flex items-center gap-3 rounded-lg px-3 py-2"
      style={{ background: 'var(--lx-elevated)', opacity: dimmed ? 0.6 : 1 }}
      data-status={status}
    >
      <Icon className="w-5 h-5 shrink-0" style={{ color: 'var(--lx-text-muted)' }} aria-hidden />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-[var(--lx-text)] truncate">
            {t(`boot.service.${svc.id}`, { defaultValue: svc.id })}
          </span>
          {!unknown && svc.progress && svc.progress.total > 0 && (
            <span className="text-[11px] font-mono text-[var(--lx-text-muted)]">
              {svc.progress.done}/{svc.progress.total}
            </span>
          )}
        </div>
        {detail && <p className="text-xs text-[var(--lx-text-muted)] truncate">{detail}</p>}
      </div>
      <span
        className="flex items-center gap-1.5 text-[11px] font-semibold shrink-0"
        style={{ color: meta.tone }}
        title={t(`boot.status.${status}`, { defaultValue: status })}
      >
        <StatusIcon className={`w-4 h-4 ${meta.spin ? 'animate-spin' : ''}`} aria-hidden />
        <span className="hidden sm:inline">{t(`boot.status.${status}`, { defaultValue: status })}</span>
      </span>
    </li>
  )
}

/** Seconds since `active` last became true (0 while inactive). */
function useElapsedWhile(active: boolean): number {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    if (!active) {
      setSeconds(0)
      return
    }
    const started = Date.now()
    const id = setInterval(() => setSeconds(Math.round((Date.now() - started) / 1000)), 1000)
    return () => clearInterval(id)
  }, [active])
  return seconds
}

export default function BootScreen({
  status,
  unreachable,
}: {
  /** Last known snapshot (may be stale while the core is unreachable). */
  status: BootStatus | null
  /** True while GET /api/boot fails — core down, restarting, or proxy 502. */
  unreachable: boolean
}) {
  const { t } = useTranslation('ui')
  const waitingSeconds = useElapsedWhile(unreachable)

  const failed = !!status?.failed && !unreachable
  const title = unreachable
    ? t('boot.title_unreachable')
    : failed
      ? t('boot.title_failed')
      : t('boot.title')
  const subtitle = unreachable ? t('boot.unreachable') : failed ? t('boot.subtitle_failed') : t('boot.subtitle')

  const online = unreachable ? 0 : (status?.summary.online ?? 0)
  const total = status?.summary.total ?? 0
  const pct = total > 0 ? Math.round((online / total) * 100) : 0
  const vaultAction =
    !unreachable && status?.vault_ui_state === 'needs_init'
      ? { to: '/vault-setup', label: t('boot.open_vault_setup') }
      : !unreachable && status?.vault_ui_state === 'needs_unseal'
        ? { to: '/vault-unseal', label: t('boot.open_vault_unseal') }
        : null

  return (
    <div className="fixed inset-0 overflow-auto bg-[var(--lx-bg)] text-[var(--lx-text)]" role="status" aria-live="polite">
      <div className="min-h-full grid place-items-center px-4 py-10">
        <div
          className="w-full max-w-md rounded-2xl border p-6 flex flex-col gap-5"
          style={{ borderColor: 'var(--lx-border-soft)', background: 'var(--lx-surface)', boxShadow: 'var(--lx-glow)' }}
        >
          <header className="flex items-center gap-4">
            <LyndrixLogo size={36} />
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold leading-tight flex items-center gap-2">
                {title}
                {unreachable && (
                  <LoaderCircle className="w-4 h-4 animate-spin shrink-0" style={{ color: 'var(--lx-accent)' }} aria-hidden />
                )}
              </h1>
              <p className="text-xs text-[var(--lx-text-muted)]">{subtitle}</p>
            </div>
            {status && (
              <span
                className="text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 shrink-0"
                style={{
                  color: status.mode === 'cluster' ? 'var(--lx-accent-3)' : 'var(--lx-text-muted)',
                  border: '1px solid var(--lx-border-soft)',
                }}
              >
                {status.mode === 'cluster' ? t('boot.mode_cluster') : t('boot.mode_single')}
              </span>
            )}
          </header>

          {status && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] text-[var(--lx-text-muted)]">
                <span>
                  {unreachable
                    ? t('boot.phase.unreachable')
                    : t(`boot.phase.${status.phase}`, { defaultValue: status.phase })}
                </span>
                <span className="font-mono">
                  {unreachable
                    ? `${t('boot.summary_unknown')} · ${t('boot.elapsed', { seconds: waitingSeconds })}`
                    : `${t('boot.summary', { online, total })} · ${t('boot.elapsed', { seconds: Math.round(status.elapsed_s) })}`}
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--lx-border-soft)' }}>
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${pct}%`, background: failed ? 'var(--lx-state-down)' : 'var(--lx-accent)' }}
                />
              </div>
            </div>
          )}

          {status ? (
            <ul className="flex flex-col gap-1.5">
              {status.services.map((svc) => (
                <ServiceRow key={svc.id} svc={svc} unknown={unreachable} />
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-3 py-6 justify-center">
              <LoaderCircle className="w-5 h-5 animate-spin" style={{ color: 'var(--lx-accent)' }} aria-hidden />
              {unreachable && (
                <span className="text-xs font-mono text-[var(--lx-text-muted)]">
                  {t('boot.elapsed', { seconds: waitingSeconds })}
                </span>
              )}
            </div>
          )}

          {vaultAction && (
            <Link to={vaultAction.to} className="lx-btn lx-btn--secondary self-start">
              {vaultAction.label}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
