/**
 * Plugin UI federation via IIFE script injection.
 *
 * Plugins build an IIFE bundle with:
 *   format: 'iife', name: '__lyndrix_plugin_<safe_id>'
 *   external: ['react', 'react-dom/client']
 *   globals: { react: '__lyndrix_react', 'react-dom/client': '__lyndrix_react_dom_client' }
 *
 * The shell loads them by injecting a <script> tag. React is shared via the
 * globals set in main.tsx (window.__lyndrix_react / __lyndrix_react_dom_client).
 */

import type React from 'react'

export interface PluginModule {
  PluginApp: React.ComponentType
  pluginRoutes?: Array<{ path: string; label: string; icon: string; sidebar_visible: boolean }>
}

// Keyed by `${pluginId}@${version}` — a bare pluginId key would keep serving the
// old bundle after an upgrade bumped the version, until someone explicitly
// invalidated it. With the version in the key, a version change alone is enough
// to fetch fresh code.
const moduleCache = new Map<string, PluginModule>()

function safeId(pluginId: string): string {
  return pluginId.replace(/[.\-]/g, '_')
}

function globalName(pluginId: string): string {
  return `__lyndrix_plugin_${safeId(pluginId)}`
}

function cacheKey(pluginId: string, version: string): string {
  return `${pluginId}@${version}`
}

export async function loadPluginModule(pluginId: string, version = 'dev'): Promise<PluginModule> {
  const key = cacheKey(pluginId, version)
  if (moduleCache.has(key)) return moduleCache.get(key)!

  const gName = globalName(pluginId)
  delete (window as unknown as Record<string, unknown>)[gName]

  return new Promise<PluginModule>((resolve, reject) => {
    const scriptId = `plugin-script-${safeId(pluginId)}`
    const existing = document.getElementById(scriptId)
    if (existing) existing.remove()

    const script = document.createElement('script')
    script.id = scriptId
    // Stable version-based cache key so the browser can cache between page loads.
    // The version string combines the manifest version + an in-session invalidation
    // counter (bumped on plugin:state_changed), so a re-install or new deploy
    // always fetches fresh code while normal navigation hits the browser cache.
    script.src = `/api/plugins/${pluginId}/static/ui_bundle.js?v=${encodeURIComponent(version)}`

    // Guard against a stalled response that never fires load/error: fail fast so
    // the Suspense boundary shows an error instead of an indefinite spinner.
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      script.remove()
      reject(new Error(`Zeitüberschreitung beim Laden des Plugin-Bundles '${pluginId}'`))
    }, 15_000)

    script.onload = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      const mod = (window as unknown as Record<string, unknown>)[gName] as PluginModule | undefined
      if (!mod?.PluginApp) {
        reject(new Error(`Plugin '${pluginId}' bundle did not expose PluginApp`))
        return
      }
      moduleCache.set(key, mod)
      resolve(mod)
    }

    script.onerror = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(new Error(`Failed to load plugin bundle for '${pluginId}'`))
    }

    document.head.appendChild(script)
  })
}

export function invalidatePluginModule(pluginId: string): void {
  const prefix = `${pluginId}@`
  for (const key of moduleCache.keys()) {
    if (key.startsWith(prefix)) moduleCache.delete(key)
  }
  const scriptId = `plugin-script-${safeId(pluginId)}`
  document.getElementById(scriptId)?.remove()
  const gName = globalName(pluginId)
  delete (window as unknown as Record<string, unknown>)[gName]
}
