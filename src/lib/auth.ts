import { apiFetch, setToken, clearToken } from './api'

export interface LoginResponse {
  token: string
  username: string
  roles: string[]
  display_name: string | null
}

export interface MeResponse {
  username: string
  full_name: string | null
  email: string | null
  roles: string[]
  groups: string[]
  extra_permissions: string[]
  method: string
  is_system: boolean
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const data = await apiFetch<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
    skipAuth: true,
  })
  setToken(data.token)
  return data
}

export async function logout(): Promise<void> {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' })
  } finally {
    clearToken()
  }
}

export async function getMe(): Promise<MeResponse> {
  return apiFetch<MeResponse>('/api/auth/me')
}

export function isLoggedIn(): boolean {
  return !!localStorage.getItem('lyndrix_token')
}
