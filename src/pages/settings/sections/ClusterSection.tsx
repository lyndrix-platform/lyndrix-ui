import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Crown, RefreshCw, ShieldCheck, Server, Network, Puzzle, Unlock } from 'lucide-react'
import { getClusterStatus, releaseClusterLease, runClusterPreflight } from '../../../lib/api'
import type { ClusterCheckStatus, ClusterStatus } from '../../../lib/types'
import { Card, SectionTitle, StatusMsg } from '../shared'
import { useAccess, can } from '../../../lib/access'
import { useSSE } from '../../../lib/useSSE'

// ─── small presentational helpers ────────────────────────────────────────────

function Pill({ tone, children, title }: { tone: 'up' | 'down' | 'muted' | 'accent' | 'warn'; children: React.ReactNode; title?: string }) {
  const cls =
    tone === 'up'
      ? 'bg-[var(--lx-state-up)]/10 text-[var(--lx-state-up)]'
      : tone === 'down'
        ? 'bg-[var(--lx-state-down)]/10 text-[var(--lx-state-down)]'
        : tone === 'warn'
          ? 'bg-[var(--lx-warning)]/10 text-[var(--lx-warning)]'
          : tone === 'accent'
            ? 'bg-[var(--lx-accent)]/10 text-[var(--lx-accent)]'
            : 'bg-[var(--lx-elevated)] text-[var(--lx-text-muted)]'
  return (
    <span title={title} className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap ${cls}`}>
      {children}
    </span>
  )
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 border-b border-[var(--lx-border-soft)] last:border-0">
      <span className="text-xs text-[var(--lx-text-muted)] uppercase tracking-wide shrink-0">{label}</span>
      <span className="text-sm text-[var(--lx-text)] font-mono text-right break-all">{value}</span>
    </div>
  )
}

function checkTone(status: ClusterCheckStatus): 'up' | 'down' | 'warn' | 'muted' {
  return status === 'ok' ? 'up' : status === 'fail' ? 'down' : status === 'warn' ? 'warn' : 'muted'
}

function formatAge(seconds: number): string {
  if (!Number.isFinite(seconds)) return '—'
  if (seconds < 90) return `${Math.round(seconds)} s`
  if (seconds < 5400) return `${Math.round(seconds / 60)} min`
  return `${Math.round(seconds / 3600)} h`
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const parts: string[] = []
  if (d) parts.push(`${d}d`)
  if (h) parts.push(`${h}h`)
  parts.push(`${m}m`)
  return parts.join(' ')
}

// ─── section ─────────────────────────────────────────────────────────────────

export default function ClusterSection(_: { config: Record<string, unknown>; envLocked: string[] }) {
  const { t } = useTranslation('ui')
  const qc = useQueryClient()
  const { data: access } = useAccess()
  const canAdmin = can(access, 'admin:write')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [confirmRelease, setConfirmRelease] = useState<string | null>(null)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['cluster'],
    queryFn: getClusterStatus,
    refetchInterval: 15_000,
  })

  // Leader changes, lease hand-overs, membership and preflight results are
  // pushed over SSE — refresh instead of waiting for the next poll.
  useSSE((topic) => {
    if (topic.startsWith('cluster:') || topic === 'system:draining') void refetch()
  }, true)

  const preflight = useMutation({
    mutationFn: runClusterPreflight,
    onSuccess: (r) => {
      setMsg({ ok: r.fail === 0, text: t('cluster.preflight_done', { ok: r.ok, warn: r.warn, fail: r.fail }) })
      void qc.invalidateQueries({ queryKey: ['cluster'] })
    },
    onError: (e) => setMsg({ ok: false, text: e instanceof Error ? e.message : t('common.error') }),
  })

  const release = useMutation({
    mutationFn: releaseClusterLease,
    onSuccess: (r) => {
      setMsg({ ok: true, text: r.status === 'released' ? t('cluster.released', { name: r.lease }) : t('cluster.not_held', { name: r.lease }) })
      setConfirmRelease(null)
      void qc.invalidateQueries({ queryKey: ['cluster'] })
    },
    onError: (e) => setMsg({ ok: false, text: e instanceof Error ? e.message : t('common.error') }),
  })

  if (isLoading) {
    return <div className="text-sm text-[var(--lx-text-muted)] p-2">{t('cluster.loading')}</div>
  }
  if (isError || !data) {
    return <StatusMsg ok={false} msg={error instanceof Error ? error.message : t('common.error_loading')} />
  }

  const s: ClusterStatus = data
  const isCluster = s.mode === 'cluster'

  return (
    <div className="flex flex-col gap-4">
      {/* ── this instance ─────────────────────────────────────────────── */}
      <Card>
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <SectionTitle>
            <span className="inline-flex items-center gap-2">
              <Network size={16} /> {t('cluster.this_instance')}
            </span>
          </SectionTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Pill tone={isCluster ? 'accent' : 'muted'}>{isCluster ? t('cluster.mode_cluster') : t('cluster.mode_single')}</Pill>
            {s.instance.is_leader && (
              <Pill tone="accent" title={t('cluster.leader')}>
                <Crown size={11} /> {t('cluster.leader')}
              </Pill>
            )}
            {s.instance.draining ? (
              <Pill tone="warn">{t('cluster.draining')}</Pill>
            ) : (
              <Pill tone={s.instance.ready ? 'up' : 'down'}>{s.instance.ready ? t('cluster.ready') : t('cluster.not_ready')}</Pill>
            )}
          </div>
        </div>
        <KV label={t('cluster.instance_id')} value={s.instance.id} />
        <KV label={t('cluster.hostname')} value={s.instance.hostname} />
        <KV label={t('cluster.roles')} value={s.instance.roles.join(', ')} />
        <KV
          label={t('cluster.leader')}
          value={s.leader.id ? (s.leader.is_self ? `${s.leader.id} (${t('cluster.leader_self')})` : s.leader.id) : t('cluster.leader_none')}
        />
        <KV label={t('cluster.uptime')} value={formatUptime(s.instance.uptime_s)} />
        <KV label={t('cluster.driver')} value={s.driver} />
        {!s.instance.ready && s.instance.reasons.length > 0 && (
          <KV label={t('cluster.reasons')} value={s.instance.reasons.join(', ')} />
        )}
        {!isCluster && <p className="mt-3 text-xs text-[var(--lx-text-muted)]">{t('cluster.single_hint')}</p>}
        {s.coordinator.error && <StatusMsg ok={false} msg={s.coordinator.error} />}
      </Card>

      {/* ── instances ─────────────────────────────────────────────────── */}
      <Card>
        <SectionTitle>
          <span className="inline-flex items-center gap-2">
            <Server size={16} /> {t('cluster.instances')} <span className="text-[var(--lx-text-muted)] font-normal">({s.alive}/{s.instances.length})</span>
          </span>
        </SectionTitle>
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-xs min-w-[560px]">
            <thead className="text-[var(--lx-text-muted)] uppercase tracking-wide text-[10px]">
              <tr>
                <th className="text-left px-2 py-1 font-medium">{t('cluster.instance_id')}</th>
                <th className="text-left px-2 py-1 font-medium">{t('cluster.hostname')}</th>
                <th className="text-left px-2 py-1 font-medium">{t('cluster.roles')}</th>
                <th className="text-left px-2 py-1 font-medium">{t('cluster.version')}</th>
                <th className="text-left px-2 py-1 font-medium">{t('cluster.heartbeat')}</th>
                <th className="text-left px-2 py-1 font-medium">{t('cluster.status')}</th>
              </tr>
            </thead>
            <tbody>
              {s.instances.map((i) => {
                const meta = i.meta as { ready?: boolean; draining?: boolean; is_leader?: boolean; leases?: string[] }
                return (
                  <tr key={i.instance_id} className="border-t border-[var(--lx-border-soft)]">
                    <td className="px-2 py-1.5 font-mono text-[var(--lx-text)]">
                      <span className="inline-flex items-center gap-1.5">
                        {i.instance_id}
                        {i.is_self && <Pill tone="muted">{t('cluster.you')}</Pill>}
                        {(meta.is_leader || s.leader.id === i.instance_id) && <Crown size={11} className="text-[var(--lx-accent)]" />}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-[var(--lx-text-muted)]">{i.hostname ?? '—'}</td>
                    <td className="px-2 py-1.5 text-[var(--lx-text-muted)]">{i.roles.join(', ')}</td>
                    <td className="px-2 py-1.5 font-mono text-[var(--lx-text-muted)]">{i.core_version ?? '—'} / {i.api_version ?? '—'}</td>
                    <td className="px-2 py-1.5 text-[var(--lx-text-muted)]">{t('cluster.ago', { age: formatAge(i.age_s) })}</td>
                    <td className="px-2 py-1.5">
                      <span className="inline-flex gap-1 flex-wrap">
                        <Pill tone={i.alive ? 'up' : 'down'}>{i.alive ? t('cluster.alive') : t('cluster.stale')}</Pill>
                        {meta.draining ? (
                          <Pill tone="warn">{t('cluster.draining')}</Pill>
                        ) : meta.ready === false ? (
                          <Pill tone="down">{t('cluster.not_ready')}</Pill>
                        ) : null}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── leases + placements ───────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle>
            <span className="inline-flex items-center gap-2">
              <Crown size={16} /> {t('cluster.leases')}
            </span>
          </SectionTitle>
          {s.lease_table.length === 0 ? (
            <p className="text-xs text-[var(--lx-text-muted)]">{t('cluster.no_leases')}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-[var(--lx-border-soft)]">
              {s.lease_table.map((l) => {
                const mine = l.holder === s.instance.id
                return (
                  <li key={l.name} className="py-2 flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-sm font-mono text-[var(--lx-text)] truncate">{l.name}</p>
                      <p className="text-[11px] text-[var(--lx-text-muted)]">
                        {t('cluster.holder')}: <span className="font-mono">{l.holder ?? '—'}</span>
                        {mine && ` (${t('cluster.you')})`} · {l.expired ? t('cluster.expired') : t('cluster.expires_in', { seconds: Math.max(0, Math.round(l.remaining_s)) })}
                      </p>
                    </div>
                    {canAdmin && (
                      confirmRelease === l.name ? (
                        <span className="flex items-center gap-2">
                          <button className="lx-btn lx-btn--danger lx-btn--sm" disabled={release.isPending} onClick={() => release.mutate(l.name)}>
                            {t('cluster.release')}
                          </button>
                          <button className="lx-btn lx-btn--ghost lx-btn--sm" onClick={() => setConfirmRelease(null)}>
                            {t('appearance.cancel')}
                          </button>
                        </span>
                      ) : (
                        <button className="lx-btn lx-btn--secondary lx-btn--sm inline-flex items-center gap-1" title={t('cluster.release_hint')} onClick={() => setConfirmRelease(l.name)}>
                          <Unlock size={12} /> {t('cluster.release')}
                        </button>
                      )
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          {s.leases.wanted.length > 0 && (
            <p className="mt-3 text-[11px] text-[var(--lx-text-muted)]">
              {t('cluster.wanted_here')}: <span className="font-mono">{s.leases.wanted.join(', ')}</span>
            </p>
          )}
        </Card>

        <Card>
          <SectionTitle>
            <span className="inline-flex items-center gap-2">
              <Puzzle size={16} /> {t('cluster.placements')}
            </span>
          </SectionTitle>
          {s.placements.length === 0 ? (
            <p className="text-xs text-[var(--lx-text-muted)]">{t('cluster.no_placements')}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-[var(--lx-border-soft)]">
              {s.placements.map((p) => (
                <li key={p.plugin_id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-[var(--lx-text)] truncate">{p.name}</p>
                    <p className="text-[11px] text-[var(--lx-text-muted)] font-mono truncate">{p.placement}{p.lease ? ` · ${p.lease}` : ''}</p>
                  </div>
                  <span className="flex gap-1 shrink-0">
                    {p.status === 'remote' ? (
                      <Pill tone="muted" title={t('cluster.remote_hint', { role: p.role ?? '?' })}>{t('cluster.remote', { role: p.role ?? '?' })}</Pill>
                    ) : (
                      <Pill tone={p.status === 'active' ? 'up' : 'muted'}>{p.status ?? '—'}</Pill>
                    )}
                    {p.lease && <Pill tone={p.held_here ? 'accent' : 'muted'}>{p.held_here ? t('cluster.held_here') : t('cluster.held_elsewhere')}</Pill>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* ── preflight ─────────────────────────────────────────────────── */}
      <Card>
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <SectionTitle>
            <span className="inline-flex items-center gap-2">
              <ShieldCheck size={16} /> {t('cluster.preflight')}
              <span className="text-[var(--lx-text-muted)] font-normal text-xs">
                {s.preflight.ok} ok · {s.preflight.warn} warn · {s.preflight.fail} fail
              </span>
            </span>
          </SectionTitle>
          <button className="lx-btn lx-btn--secondary lx-btn--sm inline-flex items-center gap-1" disabled={preflight.isPending} onClick={() => preflight.mutate()}>
            <RefreshCw size={12} className={preflight.isPending ? 'animate-spin' : ''} /> {t('cluster.rerun')}
          </button>
        </div>
        {s.preflight.checked_at && (
          <p className="text-[11px] text-[var(--lx-text-muted)] mb-2">{t('cluster.checked_at', { time: new Date(s.preflight.checked_at).toLocaleTimeString() })}</p>
        )}
        <ul className="flex flex-col divide-y divide-[var(--lx-border-soft)]">
          {s.preflight.checks.map((c) => (
            <li key={c.id} className="py-2 flex items-start gap-3">
              <Pill tone={checkTone(c.status)}>{t(`cluster.check_${c.status}`)}</Pill>
              <div className="min-w-0">
                <p className="text-sm text-[var(--lx-text)]"><span className="font-mono text-[var(--lx-text-muted)]">{c.id}</span> — {c.message}</p>
                {c.hint && c.status !== 'ok' && c.status !== 'skip' && (
                  <p className="text-[11px] text-[var(--lx-text-muted)] mt-0.5">{c.hint}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* ── coordinator ───────────────────────────────────────────────── */}
      <Card>
        <SectionTitle>{t('cluster.coordinator')}</SectionTitle>
        <KV label={t('cluster.driver')} value={`${s.driver}${s.coordinator.started ? '' : ` · ${t('cluster.not_started')}`}`} />
        <KV label={t('cluster.lease_ttl')} value={`${s.coordinator.ttl_s} s`} />
        <KV label={t('cluster.heartbeat_interval')} value={`${s.coordinator.heartbeat_s} s`} />
        <KV label={t('cluster.poll')} value={`${s.coordinator.poll_ms} ms`} />
        <KV label={t('cluster.bridge')} value={`${s.coordinator.bridge.published} ${t('cluster.published')} · ${s.coordinator.bridge.relayed} ${t('cluster.relayed')}`} />
        <KV label={t('cluster.drain')} value={s.settings.drain_seconds > 0 ? `${s.settings.drain_seconds} s` : t('common.off')} />
        <KV label={t('cluster.trusted_proxies')} value={`${s.settings.trusted_proxies}${s.settings.forwarded_for_seen ? ` · ${t('cluster.forwarded_seen')}` : ''}`} />
        {s.coordinator.server && typeof s.coordinator.server.version === 'string' && (
          <KV label={t('cluster.database')} value={`${String(s.coordinator.server.dialect ?? '')} ${String(s.coordinator.server.version)}`.trim()} />
        )}
        {msg && <StatusMsg ok={msg.ok} msg={msg.text} />}
      </Card>
    </div>
  )
}
