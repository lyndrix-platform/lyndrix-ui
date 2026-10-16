import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronUp, Minus, Pin, PinOff, X } from 'lucide-react'
import { getPluginIcon } from '../../lib/icons'
import {
  PANEL_MIN_HEIGHT,
  PANEL_MIN_WIDTH,
  PANEL_TITLEBAR_HEIGHT,
  bringToFront,
  clampPanel,
  closePanel,
  movePanel,
  resizePanel,
  toggleMinimized,
  togglePinned,
} from '../../lib/panels'
import type { PanelBox, PanelEntry, PanelState, PanelViewport } from '../../lib/panels'
import PluginPanelMount from './PluginPanelMount'

// ─── Title bar (shared with the mobile bottom sheet) ──────────────────────────

type BarPointerHandlers = Pick<
  React.HTMLAttributes<HTMLDivElement>,
  'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel'
>

export function PanelTitleBar({
  entry,
  state,
  draggable = false,
  showMinimize = true,
  ...handlers
}: {
  entry: PanelEntry
  state: PanelState
  draggable?: boolean
  showMinimize?: boolean
} & BarPointerHandlers) {
  const { t } = useTranslation('ui')
  const Icon = getPluginIcon(entry.panel.icon || entry.plugin.icon)
  return (
    <div
      className={[
        'flex items-center gap-2 pl-3 pr-1.5 shrink-0 select-none border-b border-[var(--lx-border-soft)]',
        draggable ? 'cursor-move touch-none' : '',
      ].join(' ')}
      style={{ height: PANEL_TITLEBAR_HEIGHT }}
      {...handlers}
    >
      <Icon size={15} className="shrink-0 text-[var(--lx-accent)]" />
      <span className="flex-1 min-w-0 text-sm font-semibold truncate text-[var(--lx-text)]" title={entry.plugin.name}>
        {entry.panel.label}
      </span>
      {showMinimize && (
        <button
          type="button"
          className="lx-icon-btn"
          title={state.minimized ? t('panels.restore') : t('panels.minimize')}
          aria-label={state.minimized ? t('panels.restore') : t('panels.minimize')}
          onClick={() => toggleMinimized(entry.key)}
        >
          {state.minimized ? <ChevronUp size={14} /> : <Minus size={14} />}
        </button>
      )}
      <button
        type="button"
        className="lx-icon-btn"
        title={state.pinned ? t('panels.unpin') : t('panels.pin')}
        aria-label={state.pinned ? t('panels.unpin') : t('panels.pin')}
        aria-pressed={state.pinned}
        style={state.pinned ? { color: 'var(--lx-accent)' } : undefined}
        onClick={() => togglePinned(entry.key)}
      >
        {state.pinned ? <PinOff size={14} /> : <Pin size={14} />}
      </button>
      <button
        type="button"
        className="lx-icon-btn"
        title={t('panels.close')}
        aria-label={t('panels.close')}
        onClick={() => closePanel(entry.key)}
      >
        <X size={14} />
      </button>
    </div>
  )
}

// ─── Floating window ──────────────────────────────────────────────────────────

interface Gesture {
  kind: 'move' | 'resize'
  pointerId: number
  startX: number
  startY: number
  origin: PanelBox
}

/**
 * One draggable, resizable window. The stored state is the source of truth; a
 * running gesture renders from a local `live` box and commits to the store on
 * pointer-up (one preference write per gesture instead of one per pixel).
 */
export default function FloatingPanel({
  entry,
  state,
  viewport,
  invalidation,
}: {
  entry: PanelEntry
  state: PanelState
  viewport: PanelViewport
  invalidation: number
}) {
  const { t } = useTranslation('ui')
  const gesture = useRef<Gesture | null>(null)
  const [live, setLive] = useState<PanelBox | null>(null)
  // Clamp on every render so a smaller window never strands a panel off-screen
  // (display only — the stored position is rewritten only by a gesture).
  const rest = clampPanel(state, viewport)
  const box = live ?? rest

  function begin(kind: Gesture['kind'], e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    if (kind === 'move' && (e.target as HTMLElement).closest('button')) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    gesture.current = { kind, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, origin: rest }
    bringToFront(entry.key)
  }

  function track(e: ReactPointerEvent<HTMLDivElement>) {
    const g = gesture.current
    if (!g || e.pointerId !== g.pointerId) return
    const dx = e.clientX - g.startX
    const dy = e.clientY - g.startY
    if (g.kind === 'move') {
      setLive(clampPanel({ ...g.origin, x: g.origin.x + dx, y: g.origin.y + dy, minimized: state.minimized }, viewport))
    } else {
      const width = Math.min(Math.max(PANEL_MIN_WIDTH, g.origin.width + dx), Math.max(PANEL_MIN_WIDTH, viewport.width - g.origin.x))
      const height = Math.min(Math.max(PANEL_MIN_HEIGHT, g.origin.height + dy), Math.max(PANEL_MIN_HEIGHT, viewport.height - g.origin.y))
      setLive({ x: g.origin.x, y: g.origin.y, width, height })
    }
  }

  function finish(e: ReactPointerEvent<HTMLDivElement>) {
    const g = gesture.current
    if (!g || e.pointerId !== g.pointerId) return
    gesture.current = null
    if (live) {
      if (g.kind === 'move') movePanel(entry.key, live.x, live.y)
      else resizePanel(entry.key, live.width, live.height)
    }
    setLive(null)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // capture already released
    }
  }

  return (
    <section
      role="dialog"
      aria-label={entry.panel.label}
      className="absolute pointer-events-auto flex flex-col lx-popover overflow-hidden"
      style={{
        left: box.x,
        top: box.y,
        width: box.width,
        height: state.minimized ? 'auto' : box.height,
        zIndex: state.z,
      }}
      // Any interaction with the window (including inside the plugin UI) raises it.
      onPointerDownCapture={() => bringToFront(entry.key)}
    >
      <PanelTitleBar
        entry={entry}
        state={state}
        draggable
        onPointerDown={(e) => begin('move', e)}
        onPointerMove={track}
        onPointerUp={finish}
        onPointerCancel={finish}
      />
      {/* Kept mounted while minimized so the plugin keeps its state. */}
      <div className={state.minimized ? 'hidden' : 'flex-1 min-h-0 overflow-y-auto'}>
        <PluginPanelMount plugin={entry.plugin} panelId={entry.panel.id} invalidation={invalidation} />
      </div>
      {!state.minimized && (
        <div
          role="presentation"
          title={t('panels.resize')}
          className="absolute right-0 bottom-0 w-4 h-4 cursor-nwse-resize touch-none flex items-end justify-end p-[3px]"
          onPointerDown={(e) => begin('resize', e)}
          onPointerMove={track}
          onPointerUp={finish}
          onPointerCancel={finish}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden className="text-[var(--lx-text-muted)]">
            <path d="M7 1L1 7M7 4.5L4.5 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </section>
  )
}
