import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { isLoggedIn } from './lib/auth'
import { apiFetch } from './lib/api'
import { useSSE } from './lib/useSSE'
import { invalidatePluginModule } from './lib/usePluginModules'
import { invalidatePluginRouteCache } from './components/PluginRoute'
import AppShell from './components/layout/AppShell'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import PluginsPage from './pages/PluginsPage'
import SettingsPage from './pages/SettingsPage'
import UsersPage from './pages/UsersPage'
import VaultSetupPage from './pages/VaultSetupPage'
import VaultUnsealPage from './pages/VaultUnsealPage'
import PluginRoute from './components/PluginRoute'
import type { PluginOut, VaultStatusResponse } from './lib/types'

// ─── Root redirect: vault state first, then auth ──────────────────────────────

function RootRedirect() {
  const { data: vaultStatus, isLoading } = useQuery({
    queryKey: ['vault-status-root'],
    queryFn: () => apiFetch<VaultStatusResponse>('/api/vault/status', { skipAuth: true }),
    staleTime: 10_000,
    retry: false,
  })

  if (isLoading) return null

  if (vaultStatus?.ui_state === 'needs_init') return <Navigate to="/vault-setup" replace />
  if (vaultStatus?.ui_state === 'needs_unseal') return <Navigate to="/vault-unseal" replace />
  if (!isLoggedIn()) return <Navigate to="/login" replace />
  return <Navigate to="/dashboard" replace />
}

// ─── Auth wrappers ────────────────────────────────────────────────────────────

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const queryClient = useQueryClient()

  // Version counter per plugin — incremented on state_changed so the error boundary resets.
  const [pluginVersions, setPluginVersions] = useState<Record<string, number>>({})

  const { data: plugins } = useQuery({
    queryKey: ['plugins'],
    queryFn: () => apiFetch<{ plugins: PluginOut[] }>('/api/plugins').then((r) => r.plugins),
    enabled: isLoggedIn(),
  })

  useSSE((topic, payload) => {
    if (topic === 'plugin:state_changed') {
      const p = payload as { plugin_id?: string }
      if (p?.plugin_id) {
        invalidatePluginModule(p.plugin_id)
        invalidatePluginRouteCache(p.plugin_id)
        setPluginVersions((prev) => ({
          ...prev,
          [p.plugin_id!]: (prev[p.plugin_id!] ?? 0) + 1,
        }))
      }
      void queryClient.invalidateQueries({ queryKey: ['plugins'] })
    }
  }, isLoggedIn())

  const reactPlugins = (plugins ?? []).filter((p) => p.react_ui && p.react_routes.length > 0)

  return (
    <Routes>
      {/* Public: vault bootstrap */}
      <Route path="/vault-setup" element={<VaultSetupPage />} />
      <Route path="/vault-unseal" element={<VaultUnsealPage />} />

      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />

      {/* Authenticated shell pages */}
      <Route path="/dashboard" element={<AuthShell><DashboardPage /></AuthShell>} />
      <Route path="/plugins" element={<AuthShell><PluginsPage /></AuthShell>} />
      <Route path="/settings" element={<AuthShell><SettingsPage /></AuthShell>} />
      <Route path="/users" element={<AuthShell><UsersPage /></AuthShell>} />

      {/* Dynamic plugin React UI routes */}
      {reactPlugins.flatMap((plugin) =>
        plugin.react_routes.map((route) => {
          const safeId = plugin.id.replace(/\./g, '-')
          const routePath = `/apps/${safeId}${route.path}`
          const version = pluginVersions[plugin.id] ?? 0
          return (
            <Route
              key={routePath}
              path={routePath}
              element={
                <AuthShell>
                  {/* key on version forces unmount on plugin update, resetting any error boundary */}
                  <PluginRoute key={version} pluginId={plugin.id} />
                </AuthShell>
              }
            />
          )
        }),
      )}

      {/* Plugin deep-link guard: the dynamic /apps/* routes above only exist once
          the /api/plugins query resolves. A cold load of a plugin URL would
          otherwise fall through to the dashboard. While the query is pending we
          show a loader; once loaded, a real plugin route wins by specificity and
          only genuinely-unknown /apps/* paths redirect home. */}
      <Route
        path="/apps/*"
        element={
          plugins === undefined ? (
            <AuthShell>
              <div className="max-w-5xl mx-auto px-6 py-8 flex gap-3 items-center">
                <div className="w-5 h-5 border-2 border-[var(--lx-accent)] border-t-transparent rounded-full animate-spin shrink-0" />
                <p className="text-sm text-[var(--lx-text-muted)]">Plugin wird geladen…</p>
              </div>
            </AuthShell>
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      {/* Root: vault-aware redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
