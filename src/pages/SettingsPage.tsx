import { Suspense, useState } from 'react'
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

  const [, setMobileOpen] = useState(false)

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
    setMobileOpen(false)
  }

  return (
    <div className="px-6 py-8 md:px-8 h-full">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--lx-text)] tracking-tight">
          Einstellungen
        </h1>
        <p className="text-sm text-[var(--lx-text-muted)] mt-1">
          Systemkonfiguration und Darstellung
        </p>
      </div>

      {/* Mobile tab strip */}
      <div className="flex gap-1 mb-5 overflow-x-auto md:hidden border-b border-[var(--lx-border-soft)] pb-0">
        {SETTINGS_SECTIONS.map((s) => {
          const isActive = s.id === activeId
          return (
            <button
              key={s.id}
              onClick={() => selectSection(s.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
                isActive
                  ? 'border-[var(--lx-accent)] text-[var(--lx-accent)]'
                  : 'border-transparent text-[var(--lx-text-muted)] hover:text-[var(--lx-text)]'
              }`}
            >
              <s.Icon size={14} />
              {s.label}
            </button>
          )
        })}
      </div>

      {/* Desktop: sidebar + content */}
      <div className="hidden md:flex gap-6 items-start">
        {/* Sidebar */}
        <nav className="w-44 shrink-0 flex flex-col gap-0.5">
          {SETTINGS_SECTIONS.map((s) => {
            const isActive = s.id === activeId
            return (
              <button
                key={s.id}
                onClick={() => selectSection(s.id)}
                className={`flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-[var(--lx-accent)]/10 text-[var(--lx-accent)] font-medium'
                    : 'text-[var(--lx-text-muted)] hover:bg-[var(--lx-elevated)] hover:text-[var(--lx-text)]'
                }`}
              >
                <s.Icon size={15} />
                {s.label}
              </button>
            )
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0 max-w-2xl">
          <Suspense fallback={<SectionSkeleton />}>
            <ActiveComponent config={config} envLocked={envLocked} />
          </Suspense>
        </div>
      </div>

      {/* Mobile content */}
      <div className="md:hidden">
        <Suspense fallback={<SectionSkeleton />}>
          <ActiveComponent config={config} envLocked={envLocked} />
        </Suspense>
      </div>
    </div>
  )
}
