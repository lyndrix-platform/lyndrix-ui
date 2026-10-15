import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './api'
import type { NavEntryOut } from './types'

/**
 * Sidebar entries plugins register at runtime (core API ≥ 1.9, `GET /api/nav`).
 * The core already filters them by the caller's `plugin:<id>` grant; the list is
 * invalidated on the `nav:changed` and `plugin:state_changed` SSE topics.
 */
export function useNavEntries() {
  return useQuery({
    queryKey: ['nav'],
    queryFn: () => apiFetch<{ entries: NavEntryOut[] }>('/api/nav').then((r) => r.entries ?? []),
    staleTime: 30_000,
  })
}

/** URL-safe plugin id, same convention as the `/apps/<id>` plugin routes. */
export function safePluginId(pluginId: string): string {
  return pluginId.replace(/\./g, '-')
}

/** In-shell route of an embedded (`open_mode: iframe`) entry. */
export function navEntryPath(entry: NavEntryOut): string {
  return `/ext/${safePluginId(entry.plugin_id)}/${encodeURIComponent(entry.id)}`
}

/** Entries grouped by their sidebar section, in server order. */
export function groupNavEntries(entries: NavEntryOut[]): Array<[string, NavEntryOut[]]> {
  const groups = new Map<string, NavEntryOut[]>()
  for (const e of entries) {
    const list = groups.get(e.group) ?? []
    list.push(e)
    groups.set(e.group, list)
  }
  return Array.from(groups.entries())
}
