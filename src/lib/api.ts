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
