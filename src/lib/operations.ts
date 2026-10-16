import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './api'
import type { PluginOperationOut } from './types'

/**
 * Cluster-wide plugin operations (core 1.8, `GET /api/plugins/operations`): one
 * install/upgrade/rollback per operator action with the outcome of every
 * participating instance. Invalidated on the `plugin:operation_changed` SSE topic.
 */
export function usePluginOperations(opts: { active?: boolean; limit?: number } = {}) {
  const { active = false, limit = 10 } = opts
  return useQuery({
    queryKey: ['plugin-operations', active, limit],
    queryFn: () =>
      apiFetch<{ operations: PluginOperationOut[] }>(
        `/api/plugins/operations?active=${active ? 'true' : 'false'}&limit=${limit}`,
      ).then((r) => r.operations ?? []),
    // Progress arrives over SSE; poll slowly as a safety net while something runs.
    refetchInterval: (query) =>
      (query.state.data ?? []).some((o) => o.status === 'running') ? 10_000 : false,
  })
}
