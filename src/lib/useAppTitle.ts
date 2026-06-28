import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './api'
import { isLoggedIn } from './auth'

export function useAppTitle(): string {
  const { data } = useQuery({
    queryKey: ['app-name'],
    queryFn: () =>
      apiFetch<{ config: Record<string, unknown> }>('/api/system/config').then(
        (r) => String(r.config?.APP_NAME ?? 'Lyndrix'),
      ),
    staleTime: 60_000,
    enabled: isLoggedIn(),
  })
  return data ?? 'Lyndrix'
}
