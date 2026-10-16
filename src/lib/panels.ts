// Floating plugin panels (core API ≥ 1.11): which panels the current user may
// open, and the per-user window state behind them.
//
// State is one entry per `<plugin_id>/<panel_id>` in the account preferences
// document (GET/PUT /api/me/preferences — the server deep-merges a PUT), under
// the `panels` namespace:
//
//   { "panels": { "lyndrix.plugin.ai_assistant/chat":
//       { open, pinned, minimized, x, y, width, height, z } } }
//
// Semantics:
//   • position/size/z are always restored; `open` is restored only for *pinned*
//     panels — closing a panel unpins it, so an unpinned panel is closed again
//     on the next login.
//   • the document is adopted once per login (later refetches are ignored —
//     this device's in-memory state is newer than what the server echoes).
//   • writes are debounced (600 ms) and carry only the keys that changed; a
//     keepalive PUT flushes pending changes when the page goes away.
//   • plugins never touch this document.
import { useSyncExternalStore } from 'react'
import { getToken } from './api'
import { can, pluginVisible, type AccessView } from './access'
import { preferencesClient, type PreferencesDoc } from './preferences'
import type { PluginOut, PluginPanelOut } from './types'

export interface PanelState {
  open: boolean
  pinned: boolean
  minimized: boolean
  x: number
  y: number
  width: number
  height: number
  z: number
}

export interface PanelBox {
  x: number
  y: number
  width: number
  height: number
}

/** Area panels may occupy: the window below the shell header. */
export interface PanelViewport {
  top: number
  width: number
  height: number
}

/** A declared panel joined with its plugin — what the launcher and host render. */
export interface PanelEntry {
  key: string
  plugin: PluginOut
  panel: PluginPanelOut
}

export const PANEL_MIN_WIDTH = 320
export const PANEL_MIN_HEIGHT = 240
/** Height of the title bar — the visible part of a minimized panel. */
export const PANEL_TITLEBAR_HEIGHT = 40
const PANEL_DEFAULT_WIDTH = 420
const PANEL_DEFAULT_HEIGHT = 520
const PANEL_MARGIN = 24
const WRITE_DEBOUNCE_MS = 600

export function panelKey(pluginId: string, panelId: string): string {
  return `${pluginId}/${panelId}`
}

/** Whether any loaded plugin declares a panel at all (else the launcher hides). */
export function anyPanelsDeclared(plugins: PluginOut[] | undefined): boolean {
  return (plugins ?? []).some((p) => (p.panels?.length ?? 0) > 0)
}

/** Panels the caller may open: active (or remote-pinned) React plugins the user
 *  may see, filtered by the optional per-panel `permission`. Display parity only —
 *  the plugin's API enforces. */
export function availablePanels(
  plugins: PluginOut[] | undefined,
  access: AccessView | undefined,
): PanelEntry[] {
  const out: PanelEntry[] = []
  for (const plugin of plugins ?? []) {
    if (!plugin.react_ui || !plugin.panels?.length) continue
    if (!plugin.is_active && plugin.status !== 'remote') continue
    if (!pluginVisible(access, plugin.id)) continue
    for (const panel of plugin.panels) {
      if (panel.permission && !can(access, panel.permission)) continue
      out.push({ key: panelKey(plugin.id, panel.id), plugin, panel })
    }
  }
  return out
}

// ── Store ─────────────────────────────────────────────────────────────────────

let states: Record<string, PanelState> = {}
let hydrated = false
const listeners = new Set<() => void>()
const dirty = new Set<string>()
let flushTimer: ReturnType<typeof setTimeout> | null = null

function notify(): void {
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

const getStates = () => states

/** Reactive map `<plugin>/<panel>` → state (untouched entries keep their identity). */
export function usePanelStates(): Record<string, PanelState> {
  return useSyncExternalStore(subscribe, getStates, getStates)
}

export function isPanelStoreHydrated(): boolean {
  return hydrated
}

function defaultState(): PanelState {
  return {
    open: false,
    pinned: false,
    minimized: false,
    x: PANEL_MARGIN,
    y: PANEL_MARGIN,
    width: PANEL_DEFAULT_WIDTH,
    height: PANEL_DEFAULT_HEIGHT,
    z: 1,
  }
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

/** Defensive read of one stored entry (the document is user data). */
function sanitize(raw: unknown): PanelState | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const pinned = r.pinned === true
  return {
    open: pinned && r.open === true,
    pinned,
    minimized: r.minimized === true,
    x: Math.round(num(r.x, PANEL_MARGIN)),
    y: Math.round(num(r.y, PANEL_MARGIN)),
    width: Math.round(Math.max(PANEL_MIN_WIDTH, num(r.width, PANEL_DEFAULT_WIDTH))),
    height: Math.round(Math.max(PANEL_MIN_HEIGHT, num(r.height, PANEL_DEFAULT_HEIGHT))),
    z: Math.max(1, Math.floor(num(r.z, 1))),
  }
}

/** Adopt the server document (once per login unless `force`). Entries the user
 *  already touched on this device (still dirty) win over the server copy — the
 *  document may arrive after the first panel was opened. */
export function hydratePanels(doc: PreferencesDoc | null | undefined, force = false): void {
  if (hydrated && !force) return
  const raw = (doc as Record<string, unknown> | null | undefined)?.panels
  const next: Record<string, PanelState> = {}
  if (raw && typeof raw === 'object') {
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      const st = sanitize(value)
      if (st) next[key] = st
    }
  }
  for (const key of dirty) {
    if (states[key]) next[key] = states[key]
  }
  states = next
  hydrated = true
  notify()
}

/** Logout: drop everything (the next login hydrates the next user's document). */
export function clearPanelStore(): void {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  states = {}
  hydrated = false
  dirty.clear()
  notify()
}

// ── Persistence ───────────────────────────────────────────────────────────────

function takeDirty(): Record<string, PanelState> | null {
  if (dirty.size === 0) return null
  const patch: Record<string, PanelState> = {}
  for (const key of dirty) {
    if (states[key]) patch[key] = states[key]
  }
  dirty.clear()
  return Object.keys(patch).length > 0 ? patch : null
}

async function flush(): Promise<void> {
  const patch = takeDirty()
  if (!patch || !getToken()) return
  try {
    // PUT {preferences: {panels: patch}} — the server merges it into the document.
    await preferencesClient.setPath('panels', patch)
  } catch (err) {
    // Keep the keys dirty so the next change retries them.
    for (const key of Object.keys(patch)) dirty.add(key)
    console.warn('[panels] preference write failed', err)
  }
}

function scheduleFlush(): void {
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flush()
  }, WRITE_DEBOUNCE_MS)
}

/** The debounce would lose a change made right before navigating away —
 *  send it with keepalive (apiFetch's abort timer cannot be used here). */
function flushOnPageHide(): void {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  const patch = takeDirty()
  const token = getToken()
  if (!patch || !token) return
  try {
    void fetch('/api/me/preferences', {
      method: 'PUT',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ preferences: { panels: patch } }),
    })
  } catch {
    // best effort
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushOnPageHide)
}

function update(key: string, patch: Partial<PanelState>): void {
  const prev = states[key] ?? defaultState()
  states = { ...states, [key]: { ...prev, ...patch } }
  dirty.add(key)
  scheduleFlush()
  notify()
}

// ── Geometry ──────────────────────────────────────────────────────────────────

/** Window area below the shell header (the header carries `data-lx-shell-header`). */
export function panelViewport(): PanelViewport {
  const header =
    typeof document !== 'undefined'
      ? document.querySelector<HTMLElement>('[data-lx-shell-header]')
      : null
  const top = header ? Math.max(0, Math.round(header.getBoundingClientRect().bottom)) : 0
  return { top, width: window.innerWidth, height: window.innerHeight }
}

/** Keep a panel inside the viewport (shrinks it when the window is smaller). */
export function clampPanel(st: PanelBox & { minimized?: boolean }, vp: PanelViewport): PanelBox {
  const maxW = Math.max(PANEL_MIN_WIDTH, vp.width)
  const maxH = Math.max(PANEL_MIN_HEIGHT, vp.height - vp.top)
  const width = Math.min(Math.max(PANEL_MIN_WIDTH, st.width), maxW)
  const height = Math.min(Math.max(PANEL_MIN_HEIGHT, st.height), maxH)
  const visibleH = st.minimized ? PANEL_TITLEBAR_HEIGHT : height
  const x = Math.min(Math.max(0, st.x), Math.max(0, vp.width - width))
  const y = Math.min(Math.max(vp.top, st.y), Math.max(vp.top, vp.height - visibleH))
  return { x, y, width, height }
}

// ── Actions ───────────────────────────────────────────────────────────────────

function topZ(): number {
  let max = 0
  for (const s of Object.values(states)) if (s.open && s.z > max) max = s.z
  return max
}

export function openPanel(entry: PanelEntry): void {
  const existing = states[entry.key]
  if (existing) {
    update(entry.key, { open: true, minimized: false, z: topZ() + 1 })
    return
  }
  const vp = panelViewport()
  const size = entry.panel.default_size
  const width = Math.max(PANEL_MIN_WIDTH, size?.width ?? PANEL_DEFAULT_WIDTH)
  const height = Math.max(PANEL_MIN_HEIGHT, size?.height ?? PANEL_DEFAULT_HEIGHT)
  // New windows cascade from the bottom-right corner.
  const openCount = Object.values(states).filter((s) => s.open).length
  const stagger = (openCount % 5) * 28
  const box = clampPanel(
    {
      x: vp.width - width - PANEL_MARGIN - stagger,
      y: vp.height - height - PANEL_MARGIN - stagger,
      width,
      height,
    },
    vp,
  )
  update(entry.key, { ...defaultState(), ...box, open: true, z: topZ() + 1 })
}

/** Closing also unpins — otherwise the panel would be back on the next login. */
export function closePanel(key: string): void {
  if (states[key]) update(key, { open: false, pinned: false })
}

export function toggleMinimized(key: string): void {
  const s = states[key]
  if (!s) return
  update(key, { minimized: !s.minimized, z: s.minimized ? topZ() + 1 : s.z })
}

export function togglePinned(key: string): void {
  const s = states[key]
  if (!s) return
  update(key, { pinned: !s.pinned })
}

export function bringToFront(key: string): void {
  const s = states[key]
  if (!s || s.z === topZ()) return
  update(key, { z: topZ() + 1 })
}

export function movePanel(key: string, x: number, y: number): void {
  if (states[key]) update(key, { x: Math.round(x), y: Math.round(y) })
}

export function resizePanel(key: string, width: number, height: number): void {
  if (!states[key]) return
  update(key, {
    width: Math.round(Math.max(PANEL_MIN_WIDTH, width)),
    height: Math.round(Math.max(PANEL_MIN_HEIGHT, height)),
  })
}

/** Launcher click: closed → open, minimized → restore, open → close. */
export function togglePanel(entry: PanelEntry): void {
  const s = states[entry.key]
  if (!s?.open) openPanel(entry)
  else if (s.minimized) update(entry.key, { minimized: false, z: topZ() + 1 })
  else closePanel(entry.key)
}
