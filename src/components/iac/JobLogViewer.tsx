import { useEffect, useRef, useState } from 'react'
import { FixedSizeList, type ListChildComponentProps } from 'react-window'
import { Download, ExternalLink, Search } from 'lucide-react'
import { useJobLog } from '../../lib/useJobLog'
import { jobLogRawUrl } from '../../lib/api'

interface JobLogViewerProps {
  jobId: number
  /** Keep polling for new lines (false for a finished job). */
  live?: boolean
  /** Pixel height of the scrollable log area. */
  height?: number
}

const ROW_HEIGHT = 18
// How close to the bottom (px) still counts as "pinned" for autoscroll.
const STICK_THRESHOLD = 40

/**
 * Virtualized, incrementally-streamed job log viewer.
 *
 * Renders only the visible rows (react-window) over a bounded line buffer, so it
 * stays smooth no matter how large the log is. The entire log is reachable via the
 * "Full log" / "Download" actions, which stream the raw file straight to the browser.
 */
export default function JobLogViewer({ jobId, live = true, height = 600 }: JobLogViewerProps) {
  const [grepInput, setGrepInput] = useState('')
  const [grep, setGrep] = useState('')

  // Debounce the filter so we don't re-scan on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setGrep(grepInput.trim()), 250)
    return () => clearTimeout(t)
  }, [grepInput])

  const { lines, isLoading, error } = useJobLog(jobId, { live, grep: grep || undefined })
  const listRef = useRef<FixedSizeList>(null)
  const stick = useRef(true)

  // Autoscroll to the newest line, but only while the user is pinned to the bottom.
  useEffect(() => {
    if (stick.current && listRef.current && lines.length > 0) {
      listRef.current.scrollToItem(lines.length - 1, 'end')
    }
  }, [lines])

  const Row = ({ index, style }: ListChildComponentProps) => (
    <div
      style={style}
      className="px-3 whitespace-pre font-mono text-[11px] leading-[18px] text-[var(--lx-log-accent)]"
    >
      {lines[index]}
    </div>
  )

  return (
    <div className="flex flex-col rounded-lg overflow-hidden border border-[var(--lx-border-soft)] bg-[var(--lx-log-bg)]">
      <div className="flex items-center gap-2 p-2 border-b border-[var(--lx-border-soft)] bg-[var(--lx-log-bg)]">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--lx-text-muted)]" />
          <input
            value={grepInput}
            onChange={(e) => setGrepInput(e.target.value)}
            placeholder="Filter logs (grep)…"
            className="w-full pl-8 pr-2 py-1.5 text-sm rounded bg-[var(--lx-log-bg)] border border-[var(--lx-border-soft)] text-[var(--lx-log-fg)] outline-none focus:border-[var(--lx-border)]"
          />
        </div>
        <a
          href={jobLogRawUrl(jobId)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 px-2 py-1.5 text-sm rounded text-[var(--lx-log-fg)] hover:bg-[var(--lx-border-soft)] shrink-0"
        >
          <ExternalLink className="w-4 h-4" /> Full log
        </a>
        <a
          href={jobLogRawUrl(jobId, true)}
          className="inline-flex items-center gap-1 px-2 py-1.5 text-sm rounded text-[var(--lx-log-fg)] hover:bg-[var(--lx-border-soft)] shrink-0"
        >
          <Download className="w-4 h-4" /> Download
        </a>
      </div>

      <div style={{ height }}>
        {error ? (
          <div className="p-3 text-sm text-[var(--lx-state-down)]">{error}</div>
        ) : lines.length === 0 ? (
          <div className="p-3 text-sm text-[var(--lx-text-muted)]">{isLoading ? 'Loading…' : 'No log output.'}</div>
        ) : (
          <FixedSizeList
            ref={listRef}
            height={height}
            width="100%"
            itemCount={lines.length}
            itemSize={ROW_HEIGHT}
            onScroll={({ scrollOffset }) => {
              const total = lines.length * ROW_HEIGHT
              stick.current = scrollOffset + height >= total - STICK_THRESHOLD
            }}
          >
            {Row}
          </FixedSizeList>
        )}
      </div>
    </div>
  )
}
