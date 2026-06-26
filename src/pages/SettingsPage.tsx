import { Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { apiFetch } from '../lib/api'
import type { SystemConfigOut } from '../lib/types'
import { SETTINGS_SECTIONS } from './settings/registry'
import { SettingsTileGrid, SettingsRail } from './settings/SettingsNav'
import { useIsDesktop } from '../lib/useIsDesktop'

function SectionSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="h-40 rounded-lg bg-[var(--lx-surface)] border border-[var(--lx-border-soft)]"
        />
      ))}
    </div>
  )
}

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeId = searchParams.get('section') // null = overview (tile grid)
  const isDesktop = useIsDesktop()

  const { data: configData } = useQuery({
    queryKey: ['system-config'],
    queryFn: () =>
      apiFetch<SystemConfigOut>('/api/system/config').then((r) => ({
        config: r.config,
        envLocked: r.env_locked ?? [],
      })),
  })

  const config = configData?.config ?? {}
  const envLocked = configData?.envLocked ?? []

  const activeDef = activeId ? SETTINGS_SECTIONS.find((s) => s.id === activeId) ?? null : null
  const ActiveComponent = activeDef?.component

  function selectSection(id: string) {
    setSearchParams({ section: id })
  }
  function back() {
    setSearchParams({})
  }

  const overviewHeader = (
    <div className="mb-6">
      <h1 className="text-xl font-semibold text-[var(--lx-text)] tracking-tight">Einstellungen</h1>
      <p className="text-sm text-[var(--lx-text-muted)] mt-1">Systemkonfiguration und Darstellung</p>
    </div>
  )

  const sectionBody = ActiveComponent && (
    <Suspense fallback={<SectionSkeleton />}>
      <ActiveComponent config={config} envLocked={envLocked} />
    </Suspense>
  )

  // ── Mobile ────────────────────────────────────────────────────────────────
  if (!isDesktop) {
    if (!activeDef) {
      return (
        <div className="max-w-5xl mx-auto px-4 py-6">
          {overviewHeader}
          <SettingsTileGrid sections={SETTINGS_SECTIONS} onSelect={selectSection} />
        </div>
      )
    }
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <button
          onClick={back}
          className="lx-btn lx-btn--ghost lx-btn--sm mb-4 inline-flex items-center gap-1"
        >
          <ChevronLeft size={16} /> Zurück
        </button>
        <div className="mb-5 flex items-center gap-3">
          <span className="grid place-items-center w-9 h-9 rounded-lg bg-[var(--lx-elevated)] text-[var(--lx-accent)]">
            <activeDef.Icon size={18} />
          </span>
          <h1 className="text-lg font-semibold text-[var(--lx-text)] tracking-tight">
            {activeDef.label}
          </h1>
        </div>
        {sectionBody}
      </div>
    )
  }

  // ── Desktop overview (tile grid) ────────────────────────────────────────────
  if (!activeDef) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8 md:px-8">
        {overviewHeader}
        <SettingsTileGrid sections={SETTINGS_SECTIONS} onSelect={selectSection} />
      </div>
    )
  }

  // ── Desktop split-view (rail + section, widened container) ──────────────────
  return (
    <div className="max-w-7xl mx-auto px-6 py-8 md:px-8 transition-[max-width] duration-300">
      {overviewHeader}
      <div className="grid grid-cols-[260px_1fr] gap-6 items-start">
        <div className="lx-card p-3 sticky top-6">
          <SettingsRail sections={SETTINGS_SECTIONS} activeId={activeId} onSelect={selectSection} />
        </div>
        <div className="min-w-0">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid place-items-center w-9 h-9 rounded-lg bg-[var(--lx-elevated)] text-[var(--lx-accent)]">
              <activeDef.Icon size={18} />
            </span>
            <h2 className="text-lg font-semibold text-[var(--lx-text)] tracking-tight">
              {activeDef.label}
            </h2>
          </div>
          {sectionBody}
        </div>
      </div>
    </div>
  )
}
