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

  const res = await fetch(`${BASE_URL}${path}`, { ...rest, headers })

  if (res.status === 401) {
    clearToken()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(body?.detail ?? `HTTP ${res.status}`)
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
