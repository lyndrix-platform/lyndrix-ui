import { useEffect, useRef, useSyncExternalStore } from 'react'
import { apiFetch, getToken } from './api'

interface SSEEvent {
  topic: string
  payload: unknown
}

type Listener = (topic: string, payload: unknown) => void

/**
 * Connection status of the shared stream:
 * - 'disconnected' — no live EventSource (reconnect pending or no subscribers)
 * - 'public'       — connected without a ticket; only the public topic subset
 * - 'authenticated'— connected with a stream ticket; full whitelisted topic set
 *
 * Consumers use this to run polling fallbacks whenever the live channel cannot
 * deliver authenticated topics.
 */
export type SSEStatus = 'disconnected' | 'public' | 'authenticated'

// ─── Shared singleton connection ──────────────────────────────────────────────
// One EventSource for the whole app (previously every consumer — App shell,
// notification bell, vault pages — opened its own stream).

const listeners = new Set<Listener>()
const statusListeners = new Set<() => void>()

let es: EventSource | null = null
let connecting = false
let authenticated = false
let retryTimeout: ReturnType<typeof setTimeout> | null = null
let retryDelay = 2000
let status: SSEStatus = 'disconnected'

function setStatus(next: SSEStatus): void {
  if (status === next) return
  status = next
  statusListeners.forEach((cb) => cb())
}

export function getSSEStatus(): SSEStatus {
  return status
}

/**
 * EventSource cannot send an Authorization header, so a bare /api/events
 * connection is unauthenticated and only receives the public topic subset.
 * Core mints a short-TTL, stream-scoped HMAC ticket over the normal authed
 * API; passing that as ?ticket= grants the full topic set without ever
 * putting the long-lived session bearer in a URL.
 */
async function mintTicket(): Promise<string | null> {
  if (!getToken()) return null
  try {
    const res = await apiFetch<{ ticket: string }>('/api/events/ticket', { method: 'POST' })
    return res.ticket
  } catch {
    // Ticket endpoint missing (older core) or transient failure — fall back to
    // the public stream; consumers compensate via their polling fallbacks.
    return null
  }
}

async function connect(): Promise<void> {
  if (connecting || es || listeners.size === 0) return
  connecting = true
  const ticket = await mintTicket()
  connecting = false
  // Everyone may have unsubscribed while the ticket was minted.
  if (es || listeners.size === 0) return

  authenticated = !!ticket
  const url = ticket ? `/api/events?ticket=${encodeURIComponent(ticket)}` : '/api/events'
  const source = new EventSource(url)
  es = source

  source.onopen = () => {
    retryDelay = 2000
    setStatus(authenticated ? 'authenticated' : 'public')
  }

  source.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data) as SSEEvent
      listeners.forEach((cb) => cb(data.topic, data.payload))
    } catch (err) {
      // Surface malformed payloads rather than dropping them silently.
      console.warn('[useSSE] failed to parse event payload', err, e.data)
    }
  }

  source.onerror = () => {
    source.close()
    if (es === source) es = null
    setStatus('disconnected')
    scheduleReconnect()
  }
}

function scheduleReconnect(): void {
  if (retryTimeout || listeners.size === 0) return
  retryTimeout = setTimeout(() => {
    retryTimeout = null
    retryDelay = Math.min(retryDelay * 1.5, 30_000)
    void connect()
  }, retryDelay)
}

function teardown(): void {
  if (retryTimeout) {
    clearTimeout(retryTimeout)
    retryTimeout = null
  }
  es?.close()
  es = null
  setStatus('disconnected')
}

/** Reconnect with a ticket when a login happened while the public stream was open. */
function upgradeIfPossible(): void {
  if (es && !authenticated && getToken()) {
    es.close()
    es = null
    void connect()
  }
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useSSE(
  onEvent: (topic: string, payload: unknown) => void,
  enabled: boolean = true,
): void {
  const callbackRef = useRef(onEvent)
  callbackRef.current = onEvent

  useEffect(() => {
    if (!enabled) return

    const listener: Listener = (topic, payload) => callbackRef.current(topic, payload)
    listeners.add(listener)
    upgradeIfPossible()
    void connect()

    return () => {
      listeners.delete(listener)
      if (listeners.size === 0) teardown()
    }
  }, [enabled])
}

/** Reactive view of the shared stream's status (for polling fallbacks). */
export function useSSEStatus(): SSEStatus {
  return useSyncExternalStore(
    (cb) => {
      statusListeners.add(cb)
      return () => statusListeners.delete(cb)
    },
    getSSEStatus,
  )
}
