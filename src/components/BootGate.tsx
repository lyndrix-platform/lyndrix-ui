import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, ApiError } from '../lib/api'
import { bootstrapI18n } from '../lib/i18n'
import { useSSEStatus } from '../lib/useSSE'
import type { BootStatus } from '../lib/types'
import BootScreen from './BootScreen'

const POLL_BOOTING_MS = 1500
const POLL_IDLE_MS = 20_000

/**
 * Shows the boot screen instead of the app while the core is booting, has
 * failed to boot, or is not reachable at all (restart, proxy 502). Polls the
 * public GET /api/boot — fast while booting, slowly once ready — and re-checks
 * immediately when the live SSE channel drops or the browser comes back
 * online, so a dead core is noticed within seconds rather than at the next
 * idle poll. An older core without /api/boot (404) is treated as "no boot
 * info": the app renders as before.
 */
export default function BootGate({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const queryClient = useQueryClient()
  const sseStatus = useSSEStatus()

  const q = useQuery({
    queryKey: ['boot'],
    queryFn: () => apiFetch<BootStatus>('/api/boot', { skipAuth: true }),
    retry: 1,
    retryDelay: 800,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => {
      const d = query.state.data
      if (query.state.status === 'error' || !d || d.is_booting || d.failed) return POLL_BOOTING_MS
      return POLL_IDLE_MS
    },
  })

  const unsupported = q.error instanceof ApiError && q.error.status === 404
  const unreachable = (q.isError || (q.isPending && q.failureCount > 0)) && !unsupported
  const booting = !!q.data && (q.data.is_booting || q.data.failed)
  const show = !unsupported && (unreachable || booting)

  // A dropped live channel is the earliest signal that the core went away —
  // don't wait for the idle poll, ask /api/boot right now. Same when the
  // browser regains connectivity.
  const refetch = q.refetch
  useEffect(() => {
    if (sseStatus === 'disconnected') void refetch()
  }, [sseStatus, refetch])
  useEffect(() => {
    const onOnline = () => void refetch()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [refetch])

  // The app's cached queries hold errors from the boot window — resync once the
  // core is back (plugins, access, health, i18n catalog after plugin changes).
  const wasShown = useRef(false)
  useEffect(() => {
    if (show) {
      wasShown.current = true
      return
    }
    if (wasShown.current) {
      wasShown.current = false
      void queryClient.invalidateQueries()
      void bootstrapI18n()
    }
  }, [show, queryClient])

  // Vault setup / unseal are part of the boot flow — never cover them.
  if (location.pathname.startsWith('/vault-')) return <>{children}</>
  // First answer still pending with no failure yet: render nothing for a few ms
  // instead of flashing the app and then the boot screen.
  if (q.isPending && q.failureCount === 0) return null
  if (show) return <BootScreen status={q.data ?? null} unreachable={unreachable} />
  return <>{children}</>
}
