import { Suspense, Component, useCallback, useEffect, useState } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { loadPluginModule, invalidatePluginModule } from '../lib/usePluginModules'
import type { PluginModule } from '../lib/usePluginModules'
import type { PluginRuntime } from '../lib/types'

// ─── React 18 suspense resource ───────────────────────────────────────────────

type ResourceState<T> =
  | { status: 'pending'; suspension: Promise<void> }
  | { status: 'success'; value: T }
  | { status: 'error'; error: unknown }

function createResource<T>(promise: Promise<T>): { read(): T } {
  let state: ResourceState<T> = {
    status: 'pending',
    suspension: promise.then(
      (value) => { state = { status: 'success', value } },
      (error) => { state = { status: 'error', error } },
    ),
  }
  return {
    read() {
      if (state.status === 'pending') throw state.suspension
      if (state.status === 'error') throw state.error
      return (state as { status: 'success'; value: T }).value
    },
  }
}

// Keyed by `${pluginId}@${version}` so a version bump alone (upgrade/re-install)
// suspends on a fresh bundle instead of replaying the cached old one.
const resourceCache = new Map<string, { read(): PluginModule }>()

function getResource(pluginId: string, version: string) {
  const key = `${pluginId}@${version}`
  if (!resourceCache.has(key)) {
    resourceCache.set(key, createResource(loadPluginModule(pluginId, version)))
  }
  return resourceCache.get(key)!
}

export function invalidatePluginRouteCache(pluginId: string) {
  const prefix = `${pluginId}@`
  for (const key of resourceCache.keys()) {
    if (key.startsWith(prefix)) resourceCache.delete(key)
  }
}

// ─── Error boundary ───────────────────────────────────────────────────────────

interface EBState { error: Error | null }

class PluginErrorBoundary extends Component<{ children: ReactNode; onRetry: () => void }, EBState> {
  state: EBState = { error: null }

  static getDerivedStateFromError(error: Error): EBState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[PluginRoute] bundle error', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="max-w-lg mx-auto px-6 py-12 text-center">
          <p className="text-sm font-medium text-[var(--lx-text)] mb-1">Plugin-UI nicht verfügbar</p>
          <p className="text-xs text-[var(--lx-text-muted)] mb-4">{this.state.error.message}</p>
          <button onClick={this.props.onRetry} className="lx-btn lx-btn--secondary lx-btn--sm">
            Erneut versuchen
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Inner component (suspends via resource.read()) ───────────────────────────

function RemotePlugin({ pluginId, version }: { pluginId: string; version: string }) {
  const mod = getResource(pluginId, version).read()
  const { PluginApp } = mod
  return <PluginApp />
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PluginSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8 flex gap-3 items-center">
      <div className="w-5 h-5 border-2 border-[var(--lx-accent)] border-t-transparent rounded-full animate-spin shrink-0" />
      <p className="text-sm text-[var(--lx-text-muted)]">Plugin wird geladen…</p>
    </div>
  )
}

// ─── Runtime status (ctx.set_status in the plugin, core API ≥ 1.5) ────────────

function useElapsedSeconds(since: string | null): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])
  if (!since) return 0
  const start = Date.parse(since)
  return Number.isFinite(start) ? Math.max(0, Math.round((now - start) / 1000)) : 0
}

function RuntimeProgress({ runtime }: { runtime: PluginRuntime }) {
  const { t } = useTranslation('ui')
  const p = runtime.progress
  if (!p || p.total <= 0) return null
  const pct = Math.min(100, Math.round((p.done / p.total) * 100))
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--lx-border-soft)' }}>
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: 'var(--lx-accent)' }} />
      </div>
      <span className="text-xs font-mono text-[var(--lx-text-muted)] shrink-0">
        {t('plugin_runtime.progress', { done: p.done, total: p.total, defaultValue: '{{done}} of {{total}}' })}
      </span>
    </div>
  )
}

/** Full-page stand-in while a plugin reports a *blocking* warm-up/maintenance.
 *  Its API answers 503 meanwhile; the plugin UI mounts by itself once the
 *  runtime flips to ready (the plugins query is patched over SSE). */
function PluginWarmupPanel({ pluginName, runtime }: { pluginName: string; runtime: PluginRuntime }) {
  const { t } = useTranslation('ui')
  const elapsed = useElapsedSeconds(runtime.since)
  const title = runtime.phase === 'maintenance'
    ? t('plugin_runtime.panel_title_maintenance', { name: pluginName, defaultValue: '{{name}} is in maintenance' })
    : t('plugin_runtime.panel_title', { name: pluginName, defaultValue: '{{name}} is starting up' })
  return (
    <div className="max-w-lg mx-auto px-6 py-16 flex flex-col items-center gap-4 text-center">
      <div className="w-8 h-8 border-2 border-[var(--lx-accent)] border-t-transparent rounded-full animate-spin" />
      <p className="text-sm font-semibold text-[var(--lx-text)]">{title}</p>
      {runtime.message && <p className="text-xs text-[var(--lx-text-muted)]">{runtime.message}</p>}
      <RuntimeProgress runtime={runtime} />
      <p className="text-[11px] text-[var(--lx-text-muted)]">
        {t('plugin_runtime.elapsed', { seconds: elapsed, defaultValue: '{{seconds}} s' })} · {t('plugin_runtime.panel_hint', { defaultValue: "The plugin's API pauses until this is done. This page continues by itself." })}
      </p>
    </div>
  )
}

/** Slim banner above a mounted plugin UI for non-blocking phases. */
function PluginRuntimeBanner({ runtime }: { runtime: PluginRuntime }) {
  const { t } = useTranslation('ui')
  const label = t(`plugin_runtime.${runtime.phase}`, { defaultValue: runtime.phase })
  const tone = runtime.phase === 'degraded' ? 'var(--lx-state-paused, #d4a017)' : 'var(--lx-accent)'
  return (
    <div className="mx-auto max-w-5xl px-6 pt-3">
      <div
        className="flex items-center gap-3 rounded-md px-3 py-2 text-xs"
        style={{ border: `1px solid color-mix(in srgb, ${tone} 35%, transparent)`, background: `color-mix(in srgb, ${tone} 10%, transparent)`, color: 'var(--lx-text)' }}
      >
        {runtime.phase !== 'degraded' && (
          <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin shrink-0" style={{ borderColor: tone, borderTopColor: 'transparent' }} />
        )}
        <span className="font-semibold shrink-0">{label}</span>
        {runtime.message && <span className="text-[var(--lx-text-muted)] truncate">{runtime.message}</span>}
        <div className="flex-1 min-w-[120px]"><RuntimeProgress runtime={runtime} /></div>
      </div>
    </div>
  )
}

/** Cluster: the plugin is pinned to a role this core instance does not have.
 *  Its API answers 503 "remote" here and the bundle is not mounted on this
 *  instance — say so instead of showing a broken plugin UI. */
function PluginRemotePanel({ pluginName, placement, onRetry }: { pluginName: string; placement?: string; onRetry?: () => void }) {
  const { t } = useTranslation('ui')
  const role = placement?.startsWith('pinned:') ? placement.slice('pinned:'.length) : '?'
  return (
    <div className="max-w-lg mx-auto px-6 py-16 flex flex-col items-center gap-3 text-center">
      <p className="text-sm font-semibold text-[var(--lx-text)]">
        {t('plugin_runtime.panel_title_remote', { name: pluginName, defaultValue: '{{name}} runs on another instance' })}
      </p>
      <p className="text-xs text-[var(--lx-text-muted)]">
        {t('plugin_runtime.remote_hint', { role, defaultValue: "This plugin is pinned to instances with the role '{{role}}'. Open it through the load balancer route that targets that instance." })}
      </p>
      {onRetry && (
        <button onClick={onRetry} className="lx-btn lx-btn--secondary lx-btn--sm mt-2">
          {t('plugin_runtime.retry', { defaultValue: 'Retry' })}
        </button>
      )}
    </div>
  )
}

/** Error boundary for a *remote* plugin: the load balancer may route this
 *  plugin's paths (bundle + API) to the pinned instance, in which case the UI
 *  mounts normally. If the bundle request lands on this instance instead
 *  (503 remote stub, no route), explain that rather than a generic error. */
class PluginRemoteBoundary extends Component<
  { children: ReactNode; pluginName: string; placement?: string; onRetry: () => void },
  EBState
> {
  state: EBState = { error: null }

  static getDerivedStateFromError(error: Error): EBState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.info('[PluginRoute] remote plugin bundle not reachable through this instance', error, info)
  }

  render() {
    if (this.state.error) {
      return <PluginRemotePanel pluginName={this.props.pluginName} placement={this.props.placement} onRetry={this.props.onRetry} />
    }
    return this.props.children
  }
}

// ─── Public component ─────────────────────────────────────────────────────────

export default function PluginRoute({
  pluginId, version = 'dev', pluginName, runtime = null, status, placement,
}: {
  pluginId: string
  version?: string
  pluginName?: string
  runtime?: PluginRuntime | null
  status?: string
  placement?: string
}) {
  // A failed bundle load is cached as an `error` resource (PluginRoute cache) and
  // would otherwise stay broken until the page is reloaded. The retry drops the
  // cached resource + module and remounts the boundary (via the bumped key) so
  // the next render re-fetches a fresh bundle.
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => {
    invalidatePluginRouteCache(pluginId)
    invalidatePluginModule(pluginId)
    setAttempt((a) => a + 1)
  }, [pluginId])

  if (status === 'remote') {
    // Try the bundle anyway: with a load-balancer route for this plugin's paths
    // the request reaches the pinned instance and the UI works end to end. Only
    // when the bundle is unreachable (503 remote stub on this instance) show why.
    return (
      <PluginRemoteBoundary key={attempt} pluginName={pluginName ?? pluginId} placement={placement} onRetry={retry}>
        <Suspense fallback={<PluginSkeleton />}>
          <RemotePlugin pluginId={pluginId} version={version} />
        </Suspense>
      </PluginRemoteBoundary>
    )
  }

  const blocking = !!runtime && runtime.blocking && (runtime.phase === 'starting' || runtime.phase === 'maintenance')
  if (blocking) {
    // Do not mount the plugin at all: its API 503s right now and the bundle
    // would only render errors. Mounts automatically when `ready` arrives.
    return <PluginWarmupPanel pluginName={pluginName ?? pluginId} runtime={runtime} />
  }

  return (
    <>
      {runtime && runtime.phase !== 'ready' && <PluginRuntimeBanner runtime={runtime} />}
      <PluginErrorBoundary key={attempt} onRetry={retry}>
        <Suspense fallback={<PluginSkeleton />}>
          <RemotePlugin pluginId={pluginId} version={version} />
        </Suspense>
      </PluginErrorBoundary>
    </>
  )
}
