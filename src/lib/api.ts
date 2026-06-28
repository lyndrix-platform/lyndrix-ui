import type { PluginSettingField } from './types'

const BASE_URL = ''

export function getToken(): string | null {
  return localStorage.getItem('lyndrix_token')
}

export function setToken(token: string): void {
  localStorage.setItem('lyndrix_token', token)
}

export function clearToken(): void {
  localStorage.removeItem('lyndrix_token')
}

interface FetchOptions extends RequestInit {
  skipAuth?: boolean
}

// ─── Debug logging + request timeout ───────────────────────────────────────────
// Flip on in the browser console:  localStorage.LX_DEBUG = '1'  (then reload).
// Logs every request with timing/status; a hung request aborts after the timeout
// and surfaces as a visible error instead of silently wedging the whole UI.
const REQUEST_TIMEOUT_MS = 20_000

function debugOn(): boolean {
  try {
    return localStorage.getItem('LX_DEBUG') === '1'
  } catch {
    return false
  }
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

export async function apiFetch<T = unknown>(path: string, options: FetchOptions = {}): Promise<T> {
  const { skipAuth, ...rest } = options
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(rest.headers as Record<string, string> | undefined),
  }

  if (!skipAuth) {
    const token = getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  const method = (rest.method ?? 'GET').toUpperCase()
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS)
  const t0 = now()

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...rest, headers, signal: rest.signal ?? ctrl.signal })
  } catch (err) {
    const ms = Math.round(now() - t0)
    const aborted = (err as Error)?.name === 'AbortError'
    if (debugOn()) {
      // eslint-disable-next-line no-console
      console.warn(`[api] ${method} ${path} → ${aborted ? `TIMEOUT ${REQUEST_TIMEOUT_MS}ms` : 'NETWORK ERR'} (${ms}ms)`, err)
    }
    throw new Error(
      aborted ? `Zeitüberschreitung nach ${REQUEST_TIMEOUT_MS / 1000}s: ${method} ${path}` : `Netzwerkfehler: ${method} ${path}`,
    )
  } finally {
    clearTimeout(timer)
  }

  if (debugOn()) {
    // eslint-disable-next-line no-console
    console.debug(`[api] ${method} ${path} → ${res.status} (${Math.round(now() - t0)}ms)`)
  }

  if (res.status === 401) {
    clearToken()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }))
    const detail = body?.detail
    const message =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((e: { msg?: string }) => e.msg ?? JSON.stringify(e)).join(', ')
          : `HTTP ${res.status}`
    throw new Error(message)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ─── IaC Orchestrator job logs ────────────────────────────────────────────────

export const IAC_ORCHESTRATOR_ID = 'lyndrix.plugin.iac_orchestrator'

export interface JobLogDelta {
  job_id: number
  lines: string[]
  offset: number
  size: number
  source: string
  grep: string | null
}

/**
 * Fetch an incremental slice of a job's log. Pass the previously returned
 * `offset` to get only the bytes appended since (append-only log → O(new data)).
 * When `grep` is set the server returns a filtered snapshot (full offset reset),
 * so callers should replace rather than append.
 */
export async function getJobLogDelta(
  jobId: number,
  offset = 0,
  grep?: string,
): Promise<JobLogDelta> {
  const params = new URLSearchParams({ offset: String(offset) })
  if (grep) params.set('grep', grep)
  return apiFetch<JobLogDelta>(
    `/api/plugins/${IAC_ORCHESTRATOR_ID}/jobs/${jobId}/logs?${params.toString()}`,
  )
}

/**
 * URL of the streamed raw (entire) log. Carries the token as a query param because
 * the browser opens this directly (new tab / download) and cannot send a Bearer
 * header — matching the SSE stream's `?token=` auth.
 *
 * TODO(agent): this embeds the long-lived session bearer in the URL, which leaks
 * into server/proxy access logs, browser history and the Referer header (UI-SHELL-002).
 * The backend should issue a short-TTL, single-use, log-scoped download token and we
 * should embed that here instead of the session token.
 */
export function jobLogRawUrl(jobId: number, download = false): string {
  const params = new URLSearchParams({ token: getToken() ?? '' })
  if (download) params.set('download', 'true')
  return `${BASE_URL}/api/plugins/${IAC_ORCHESTRATOR_ID}/jobs/${jobId}/logs/raw?${params.toString()}`
}

export interface PluginSettingsResponse {
  status: string
  plugin_id: string
  schema: PluginSettingField[]
  values: Record<string, unknown>
}

export async function getPluginSettings(pluginId: string): Promise<PluginSettingsResponse> {
  return apiFetch<PluginSettingsResponse>(`/api/plugins/${pluginId}/settings`)
}

export async function updatePluginSettings(
  pluginId: string,
  values: Record<string, unknown>,
): Promise<{ status: string }> {
  return apiFetch<{ status: string }>(`/api/plugins/${pluginId}/settings`, {
    method: 'PUT',
    body: JSON.stringify({ values }),
  })
}

// ─── Notifications (notification bell) ────────────────────────────────────────

export interface NotificationItem {
  id: string
  title: string
  message: string
  type: string
  timestamp: number
  read: boolean
}

export interface NotificationsResponse {
  notifications: NotificationItem[]
  unread: number
}

export const getNotifications = () =>
  apiFetch<NotificationsResponse>('/api/notifications')

export const markNotificationRead = (id: string) =>
  apiFetch(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' })

export const markAllNotificationsRead = () =>
  apiFetch('/api/notifications/read-all', { method: 'POST' })

export const dismissNotification = (id: string) =>
  apiFetch(`/api/notifications/${encodeURIComponent(id)}`, { method: 'DELETE' })

export const clearAllNotifications = () =>
  apiFetch('/api/notifications', { method: 'DELETE' })
