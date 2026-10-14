import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { isLoggedIn } from './lib/auth'
import { useAccess, can, routeAllowed } from './lib/access'
import { apiFetch } from './lib/api'
import { useSSE, useSSEStatus } from './lib/useSSE'
import { toast } from './lib/toast'
import { bootstrapI18n } from './lib/i18n'
import { useTheme } from './theme/ThemeProvider'
import { useAppTitle } from './lib/useAppTitle'
import { invalidatePluginModule } from './lib/usePluginModules'
import { invalidatePluginRouteCache } from './components/PluginRoute'
import AppShell from './components/layout/AppShell'
import ErrorBoundary from './components/ErrorBoundary'
import LiquidGlassDefs from './components/LiquidGlassDefs'
import LoginPage from './pages/LoginPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import DashboardPage from './pages/DashboardPage'
import PluginsPage from './pages/PluginsPage'
import SettingsPage from './pages/SettingsPage'
import UsersPage from './pages/UsersPage'
import JobLogPage from './pages/JobLogPage'
import VaultSetupPage from './pages/VaultSetupPage'
import VaultUnsealPage from './pages/VaultUnsealPage'
import PluginRoute from './components/PluginRoute'
import BootGate from './components/BootGate'
import type { PluginOut, PluginRuntime, VaultStatusResponse } from './lib/types'

// ─── Document title sync ──────────────────────────────────────────────────────

function TitleSync({ plugins }: { plugins: PluginOut[] | undefined }) {
  const { t } = useTranslation('ui')
  const location = useLocation()
  const appName = useAppTitle()

  useEffect(() => {
    const path = location.pathname
    let pageName: string

    if (path === '/dashboard' || path === '/') {
      pageName = t('nav.dashboard')
    } else if (path.startsWith('/settings')) {
      pageName = t('nav.settings')
    } else if (path.startsWith('/users')) {
      pageName = t('nav.users')
    } else if (path.startsWith('/plugins')) {
      pageName = t('nav.plugins')
    } else if (path.startsWith('/apps/')) {
      const plugin = (plugins ?? []).find((p) =>
        path.startsWith(`/apps/${p.id.replace(/\./g, '-')}`)
      )
      pageName = plugin?.name ?? 'App'
    } else {
      pageName = appName
    }

    document.title = `${pageName} — ${appName}`
  }, [location.pathname, appName, plugins, t])

  return null
}

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

/** Server-derived permission gate (Identity 2.0). Renders nothing while the
 *  access view loads (avoids a redirect flash), bounces to /dashboard when
 *  the caller lacks the permission. Enforcement stays backend-side — this
 *  only prevents rendering pages the API would 403 anyway. */
function RequirePermission({
  perm,
  children,
}: {
  perm: string
  children: React.ReactNode
}) {
  const { data: access, isLoading } = useAccess()
  if (isLoading) return null
  if (!can(access, perm)) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

/** Route gate for dynamic plugin routes (umbrella or per-route grant). */
function RequirePluginRoute({
  pluginId,
  path,
  children,
}: {
  pluginId: string
  path: string
  children: React.ReactNode
}) {
  const { data: access, isLoading } = useAccess()
  if (isLoading) return null
  if (!routeAllowed(access, pluginId, path)) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>
        <ErrorBoundary>{children}</ErrorBoundary>
      </AppShell>
    </RequireAuth>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const { t } = useTranslation('ui')
  const queryClient = useQueryClient()
  const { refreshTheme } = useTheme()

  // Version counter per plugin — incremented on state_changed so the error boundary resets.
  const [pluginVersions, setPluginVersions] = useState<Record<string, number>>({})

  const sseStatus = useSSEStatus()

  const { data: plugins } = useQuery({
    queryKey: ['plugins'],
    queryFn: () => apiFetch<{ plugins: PluginOut[] }>('/api/plugins').then((r) => r.plugins),
    enabled: isLoggedIn(),
    // Live updates arrive over the authenticated SSE stream; whenever that
    // channel is down (or stuck on the public subset), fall back to polling so
    // the plugin list can never silently go stale.
    refetchInterval: sseStatus === 'authenticated' ? false : 15_000,
  })

  // Catch-up after every (re)connect of the live channel: events emitted while
  // we were disconnected (e.g. during a core self-restart or uvicorn reload)
  // are gone — resync the state they would have carried.
  useEffect(() => {
    if (sseStatus !== 'authenticated') return
    void queryClient.invalidateQueries({ queryKey: ['plugins'] })
    void queryClient.invalidateQueries({ queryKey: ['health'] })
    void bootstrapI18n()
  }, [sseStatus, queryClient])

  useSSE((topic, payload) => {
    if (topic === 'plugin:installed') {
      const p = payload as { repo?: string }
      toast.success(t('plugins_page.install_completed', { repo: p?.repo ?? '?' }))
      void queryClient.invalidateQueries({ queryKey: ['plugins'] })
      void queryClient.invalidateQueries({ queryKey: ['health'] })
    } else if (topic === 'plugin:install_failed') {
      const p = payload as { repo?: string; error?: string }
      toast.error(
        t('plugins_page.install_failed_detail', { repo: p?.repo ?? '?', error: p?.error ?? '' }),
      )
      void queryClient.invalidateQueries({ queryKey: ['plugins'] })
    } else if (topic === 'plugin:state_changed') {
      const p = payload as { plugin_id?: string }
      if (p?.plugin_id) {
        invalidatePluginModule(p.plugin_id)
        invalidatePluginRouteCache(p.plugin_id)
        setPluginVersions((prev) => ({
          ...prev,
          [p.plugin_id!]: (prev[p.plugin_id!] ?? 0) + 1,
        }))
        void queryClient.invalidateQueries({ queryKey: ['plugins'] })
      }
      // A plugin install/removal may add/remove locale namespaces and bumps the
      // catalog version server-side — cheap `?v=` revalidation (304 if unchanged).
      void bootstrapI18n()
    } else if (topic === 'plugin:update_available') {
      // Background checker found a newer tag — refresh so the badge appears.
      void queryClient.invalidateQueries({ queryKey: ['plugins'] })
    } else if (topic === 'plugin:runtime_status') {
      // Warm-up / maintenance progress: patch the cached list in place. Never
      // invalidate here — that would remount the plugin UI on every tick.
      const p = payload as (PluginRuntime & { plugin_id?: string }) | undefined
      if (p?.plugin_id) {
        const { plugin_id, ...runtime } = p
        queryClient.setQueryData<PluginOut[]>(['plugins'], (old) =>
          old?.map((pl) => (pl.id === plugin_id ? { ...pl, runtime } : pl)),
        )
      }
    } else if (topic === 'ui:needs_refresh') {
      void bootstrapI18n()
      // A theme upload/activation re-emits this — re-fetch the selected theme's vars.
      refreshTheme()
    }
  }, isLoggedIn())

  const reactPlugins = (plugins ?? []).filter((p) => p.react_ui && p.react_routes.length > 0)

  return (
    <>
    {/* One shared liquid-glass SVG filter for every GlassSurface in the app. */}
    <LiquidGlassDefs />
    <TitleSync plugins={plugins} />
    {/* Boot screen while the core boots / restarts / is unreachable (GET /api/boot). */}
    <BootGate>
    <Routes>
      {/* Public: vault bootstrap */}
      <Route path="/vault-setup" element={<VaultSetupPage />} />
      <Route path="/vault-unseal" element={<VaultUnsealPage />} />

      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      {/* Authenticated shell pages */}
      <Route path="/dashboard" element={<AuthShell><DashboardPage /></AuthShell>} />
      <Route path="/plugins" element={<AuthShell><RequirePermission perm="feature:plugins.manage"><PluginsPage /></RequirePermission></AuthShell>} />
      {/* /settings stays reachable for every user (profile, appearance) —
          admin-only sections fail closed at the API. */}
      <Route path="/settings" element={<AuthShell><SettingsPage /></AuthShell>} />
      <Route path="/users" element={<AuthShell><RequirePermission perm="feature:users.view"><UsersPage /></RequirePermission></AuthShell>} />
      <Route path="/iac/jobs/:jobId/logs" element={<AuthShell><JobLogPage /></AuthShell>} />

      {/* Dynamic plugin React UI routes */}
      {reactPlugins.flatMap((plugin) =>
        plugin.react_routes.map((route) => {
          const safeId = plugin.id.replace(/\./g, '-')
          const routePath = `/apps/${safeId}${route.path}`
          const invalidation = pluginVersions[plugin.id] ?? 0
          // Stable cache key: manifest version + in-session invalidation counter.
          // Allows browser HTTP cache between page loads; busts on plugin update.
          const cacheKey = `${plugin.version}-${invalidation}`
          return (
            <Route
              key={routePath}
              path={routePath}
              element={
                <AuthShell>
                  <RequirePluginRoute pluginId={plugin.id} path={route.path}>
                    {/* key on invalidation forces unmount/re-fetch on plugin:state_changed */}
                    <PluginRoute
                      key={invalidation}
                      pluginId={plugin.id}
                      version={cacheKey}
                      pluginName={plugin.name}
                      runtime={plugin.runtime ?? null}
                      status={plugin.status}
                      placement={plugin.placement}
                    />
                  </RequirePluginRoute>
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
                <p className="text-sm text-[var(--lx-text-muted)]">{t('shell.loading_plugin')}</p>
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
    </BootGate>
    </>
  )
}
