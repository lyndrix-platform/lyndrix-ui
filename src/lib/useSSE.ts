import { useEffect, useRef } from 'react'

interface SSEEvent {
  topic: string
  payload: unknown
}

export function useSSE(
  onEvent: (topic: string, payload: unknown) => void,
  enabled: boolean = true,
): void {
  const callbackRef = useRef(onEvent)
  callbackRef.current = onEvent

  useEffect(() => {
    if (!enabled) return

    let es: EventSource | null = null
    let retryTimeout: ReturnType<typeof setTimeout> | null = null
    let retryDelay = 2000
    let destroyed = false

    function connect() {
      if (destroyed) return
      // EventSource cannot send an Authorization header, and core's SSE auth
      // (optional_api_auth) reads ONLY headers / X-API-Key — there is no query-param
      // token path in core/api/security.py. Appending ?token= therefore authenticates
      // nothing and merely leaks the session bearer into access logs / Referer, so we
      // do NOT send it. The stream stays on its public topic subset until the backend
      // gains a proper short-TTL stream ticket.
      // TODO(agent): teach core /api/events to mint+accept a short-lived, stream-scoped
      // HMAC ticket (mirror iac-orchestrator's POST /stream/ticket), then pass that —
      // never the long-lived session bearer (see UI-SHELL-001/002/006).
      es = new EventSource('/api/events')

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as SSEEvent
          callbackRef.current(data.topic, data.payload)
        } catch (err) {
          // Surface malformed payloads rather than dropping them silently.
          console.warn('[useSSE] failed to parse event payload', err, e.data)
        }
      }

      es.onerror = () => {
        es?.close()
        es = null
        if (!destroyed) {
          retryTimeout = setTimeout(() => {
            retryDelay = Math.min(retryDelay * 1.5, 30_000)
            connect()
          }, retryDelay)
        }
      }

      es.onopen = () => {
        retryDelay = 2000
      }
    }

    connect()

    return () => {
      destroyed = true
      if (retryTimeout) clearTimeout(retryTimeout)
      es?.close()
    }
  }, [enabled])
}
