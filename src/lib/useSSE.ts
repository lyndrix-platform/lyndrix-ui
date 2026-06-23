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
