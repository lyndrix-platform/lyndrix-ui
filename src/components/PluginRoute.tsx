import { Suspense, Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { loadPluginModule } from '../lib/usePluginModules'
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

const resourceCache = new Map<string, { read(): PluginModule }>()

function getResource(pluginId: string) {
  if (!resourceCache.has(pluginId)) {
    resourceCache.set(pluginId, createResource(loadPluginModule(pluginId)))
  }
  return resourceCache.get(pluginId)!
}

export function invalidatePluginRouteCache(pluginId: string) {
  resourceCache.delete(pluginId)
}

// ─── Error boundary ───────────────────────────────────────────────────────────

interface EBState { error: Error | null }

class PluginErrorBoundary extends Component<{ children: ReactNode }, EBState> {
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
          <p className="text-xs text-[var(--lx-text-muted)]">{this.state.error.message}</p>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Inner component (suspends via resource.read()) ───────────────────────────

function RemotePlugin({ pluginId }: { pluginId: string }) {
  const mod = getResource(pluginId).read()
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

export default function PluginRoute({ pluginId }: { pluginId: string }) {
  return (
    <PluginErrorBoundary>
      <Suspense fallback={<PluginSkeleton />}>
        <RemotePlugin pluginId={pluginId} />
      </Suspense>
    </PluginErrorBoundary>
  )
}
