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

const moduleCache = new Map<string, PluginModule>()

function safeId(pluginId: string): string {
  return pluginId.replace(/[.\-]/g, '_')
}

function globalName(pluginId: string): string {
  return `__lyndrix_plugin_${safeId(pluginId)}`
}

export async function loadPluginModule(pluginId: string): Promise<PluginModule> {
  if (moduleCache.has(pluginId)) return moduleCache.get(pluginId)!

  const gName = globalName(pluginId)
  delete (window as unknown as Record<string, unknown>)[gName]

  return new Promise<PluginModule>((resolve, reject) => {
    const scriptId = `plugin-script-${safeId(pluginId)}`
    const existing = document.getElementById(scriptId)
    if (existing) existing.remove()

    const script = document.createElement('script')
    script.id = scriptId
    // Cache-bust on each fresh load so reloads after invalidation get new code.
    script.src = `/api/plugins/${pluginId}/static/ui_bundle.js?t=${Date.now()}`

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
      moduleCache.set(pluginId, mod)
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
  moduleCache.delete(pluginId)
  const scriptId = `plugin-script-${safeId(pluginId)}`
  document.getElementById(scriptId)?.remove()
  const gName = globalName(pluginId)
  delete (window as unknown as Record<string, unknown>)[gName]
}
