import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getPlugins } from '../../lib/api'
import { isLoggedIn } from '../../lib/auth'
import { useAccess } from '../../lib/access'
import { preferencesClient } from '../../lib/preferences'
import { availablePanels, hydratePanels, panelViewport, usePanelStates } from '../../lib/panels'
import type { PanelViewport } from '../../lib/panels'
import { usePluginInvalidations } from '../../lib/pluginInvalidation'
import { useIsDesktop } from '../../lib/useIsDesktop'
import FloatingPanel from './FloatingPanel'
import PanelSheet from './PanelSheet'

// Pages that render without the authenticated shell — never float panels there.
const PUBLIC_PREFIXES = ['/login', '/auth/', '/vault-setup', '/vault-unseal']

/**
 * Hosts every open plugin panel (core API ≥ 1.11) above the whole app.
 *
 * Mounted ONCE at the app root (not inside AppShell, which remounts on every
 * top-level navigation and would reset the panel content with it). It gates on
 * the login state per route change; the inner component holds the hooks so no
 * authed request fires while logged out.
 */
export default function PanelHost() {
  const location = useLocation()
  const publicPage = PUBLIC_PREFIXES.some((p) => location.pathname.startsWith(p))
  if (publicPage || !isLoggedIn()) return null
  return <PanelHostInner />
}

function useViewport(): PanelViewport {
  const [viewport, setViewport] = useState<PanelViewport>(() => panelViewport())
  useEffect(() => {
    const measure = () => setViewport(panelViewport())
    window.addEventListener('resize', measure)
    // The shell header (whose height defines `top`) mounts after this host.
    const raf = requestAnimationFrame(measure)
    return () => {
      window.removeEventListener('resize', measure)
      cancelAnimationFrame(raf)
    }
  }, [])
  return viewport
}

function PanelHostInner() {
  const isDesktop = useIsDesktop()
  const { data: plugins } = useQuery({ queryKey: ['plugins'], queryFn: getPlugins })
  const { data: access } = useAccess()
  // Same key the profile section uses — one fetch; adopted once per login.
  const { data: prefs } = useQuery({
    queryKey: ['me-preferences'],
    queryFn: () => preferencesClient.getPreferences(true),
    staleTime: 60_000,
  })
  useEffect(() => {
    if (prefs) hydratePanels(prefs)
  }, [prefs])

  const states = usePanelStates()
  const invalidations = usePluginInvalidations()
  const viewport = useViewport()
  const entries = useMemo(() => availablePanels(plugins, access), [plugins, access])
  const openEntries = useMemo(() => entries.filter((e) => states[e.key]?.open), [entries, states])

  if (openEntries.length === 0) return null

  if (!isDesktop) {
    const top = openEntries
      .filter((e) => !states[e.key].minimized)
      .sort((a, b) => states[b.key].z - states[a.key].z)[0]
    if (!top) return null
    return <PanelSheet entry={top} state={states[top.key]} invalidation={invalidations[top.plugin.id] ?? 0} />
  }

  // z-[35]: above the page and the sidebar (30), below the header (40) and
  // dialogs (50). The overlay itself never catches pointer events — only panels do.
  return (
    <div className="fixed inset-0 z-[35] pointer-events-none">
      {openEntries.map((e) => (
        <FloatingPanel
          key={e.key}
          entry={e}
          state={states[e.key]}
          viewport={viewport}
          invalidation={invalidations[e.plugin.id] ?? 0}
        />
      ))}
    </div>
  )
}
