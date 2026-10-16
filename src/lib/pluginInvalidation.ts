// In-session invalidation counter per plugin id, bumped on `plugin:state_changed`
// (App.tsx SSE handler). Page routes (App.tsx) and floating panels (PanelHost)
// both read it, so they mount the same bundle cache key and remount together
// after an upgrade / re-enable — two diverging counters would load the same
// bundle twice.
import { useSyncExternalStore } from 'react'

let counters: Record<string, number> = {}
const listeners = new Set<() => void>()

export function bumpPluginInvalidation(pluginId: string): void {
  counters = { ...counters, [pluginId]: (counters[pluginId] ?? 0) + 1 }
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

const getSnapshot = () => counters

/** Reactive map pluginId → counter (missing = never invalidated = 0). */
export function usePluginInvalidations(): Record<string, number> {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
