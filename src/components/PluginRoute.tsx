import { Suspense, Component, useCallback, useState } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { loadPluginModule, invalidatePluginModule } from '../lib/usePluginModules'
import type { PluginModule } from '../lib/usePluginModules'

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

// ─── Public component ─────────────────────────────────────────────────────────

export default function PluginRoute({ pluginId, version = 'dev' }: { pluginId: string; version?: string }) {
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

  return (
    <PluginErrorBoundary key={attempt} onRetry={retry}>
      <Suspense fallback={<PluginSkeleton />}>
        <RemotePlugin pluginId={pluginId} version={version} />
      </Suspense>
    </PluginErrorBoundary>
  )
}
