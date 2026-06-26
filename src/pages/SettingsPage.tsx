import { Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import type { SystemConfigOut } from '../lib/types'
import { SETTINGS_SECTIONS } from './settings/registry'

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
  const activeId = searchParams.get('section') ?? SETTINGS_SECTIONS[0].id

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

  const activeDef = SETTINGS_SECTIONS.find((s) => s.id === activeId) ?? SETTINGS_SECTIONS[0]
  const ActiveComponent = activeDef.component

  function selectSection(id: string) {
    setSearchParams({ section: id }, { replace: true })
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 md:px-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--lx-text)] tracking-tight">Einstellungen</h1>
        <p className="text-sm text-[var(--lx-text-muted)] mt-1">Systemkonfiguration und Darstellung</p>
      </div>

      {/* Same lx-tabs design as the Plugin- and User-Verwaltung */}
      <div className="lx-tabs mb-6 overflow-x-auto">
        {SETTINGS_SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => selectSection(s.id)}
            className={`lx-tab shrink-0 ${s.id === activeId ? 'lx-tab--active' : ''}`}
          >
            <s.Icon size={14} />
            {s.label}
          </button>
        ))}
      </div>

      <Suspense fallback={<SectionSkeleton />}>
        <ActiveComponent config={config} envLocked={envLocked} />
      </Suspense>
    </div>
  )
}
