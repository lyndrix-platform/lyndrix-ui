import { useEffect, useRef, useState } from 'react'
import { getJobLogDelta } from './api'

// Keep at most this many lines in the live view; the entire log is available via
// the streamed raw endpoint (jobLogRawUrl). Bounds memory and DOM regardless of
// how massive the underlying log file gets.
const MAX_LINES = 5000
const POLL_MS = 1000

export interface UseJobLogResult {
  lines: string[]
  size: number
  isLoading: boolean
  error: string | null
}

/**
 * Stream a job's log into a bounded, incrementally-updated buffer.
 *
 * - No grep: polls by byte offset, appending only new lines (O(new data)).
 * - With grep: polls a server-side filtered snapshot and replaces the buffer.
 * - live=false: fetches once (e.g. a finished job).
 */
export function useJobLog(
  jobId: number | null,
  opts: { live?: boolean; grep?: string } = {},
): UseJobLogResult {
  const { live = true, grep } = opts
  const [lines, setLines] = useState<string[]>([])
  const [size, setSize] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const offsetRef = useRef(0)

  useEffect(() => {
    if (jobId == null) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    let loadedOnce = false

    // Reset buffer/offset whenever the job or filter changes.
    offsetRef.current = 0
    setLines([])
    setSize(0)
    setError(null)
    setIsLoading(true)

    async function tick() {
      // Don't poll while the tab is backgrounded — it would hammer the log
      // endpoint once per second with nobody watching. We still do the initial
      // load, then resume polling on `visibilitychange` (see below). The first
      // fetch is allowed even when hidden so a backgrounded open still populates.
      if (live && loadedOnce && document.hidden) {
        timer = setTimeout(tick, POLL_MS)
        return
      }
      try {
        const res = await getJobLogDelta(jobId!, grep ? 0 : offsetRef.current, grep)
        if (cancelled) return
        setError(null)
        setSize(res.size)
        if (grep) {
          setLines(res.lines.slice(-MAX_LINES))
        } else {
          offsetRef.current = res.offset
          if (res.lines.length) {
            setLines((prev) => {
              const next = prev.concat(res.lines)
              return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next
            })
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load log')
      } finally {
        if (cancelled) return
        loadedOnce = true
        setIsLoading(false)
        if (live) timer = setTimeout(tick, POLL_MS)
      }
    }

    // When the tab becomes visible again, fetch immediately instead of waiting
    // out the (skipped) poll interval.
    function onVisibility() {
      if (!cancelled && live && !document.hidden) {
        if (timer) clearTimeout(timer)
        void tick()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    void tick()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [jobId, live, grep])

  return { lines, size, isLoading, error }
}
