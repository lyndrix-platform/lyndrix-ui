import { Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, Lock } from 'lucide-react'
import { apiFetch } from '../lib/api'
import type { SystemConfigOut, EditableSettingMeta } from '../lib/types'
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
  const { t } = useTranslation('ui')
  const [searchParams, setSearchParams] = useSearchParams()
  const activeId = searchParams.get('section')
  const isDesktop = useIsDesktop()

  const { data: configData } = useQuery({
    queryKey: ['system-config'],
    queryFn: () =>
      apiFetch<SystemConfigOut>('/api/system/config').then((r) => ({
        config: r.config,
        envLocked: (r.config?.env_locked as string[] | undefined) ?? [],
        editableSettings:
          (r.config?.editable_settings as EditableSettingMeta[] | undefined) ?? [],
      })),
  })

  const config = configData?.config ?? {}
  const envLocked = configData?.envLocked ?? []
  const editableSettings = configData?.editableSettings ?? []

  const activeDef = activeId ? SETTINGS_SECTIONS.find((s) => s.id === activeId) ?? null : null
  const ActiveComponent = activeDef?.component

  function selectSection(id: string) {
    setSearchParams({ section: id })
  }
  function back() {
    setSearchParams({})
  }

  const overviewHeader = (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold text-[var(--lx-text)] tracking-tight">
          {t('settings.title')}
        </h1>
        <p className="text-sm text-[var(--lx-text-muted)] mt-1">{t('settings.subtitle')}</p>
      </div>
      {envLocked.length > 0 && (
        <div
          title={t('settings.env_global_hint')}
          className="shrink-0 flex items-center gap-1.5 text-[11px] leading-tight text-[var(--lx-warning)] bg-[var(--lx-warning)]/10 border border-[var(--lx-warning)]/20 px-2.5 py-1.5 rounded-md max-w-[280px]"
        >
          <Lock size={12} className="shrink-0" />
          <span>{t('settings.env_global_warning', { count: envLocked.length })}</span>
        </div>
      )}
    </div>
  )

  const sectionBody = ActiveComponent && (
    <Suspense fallback={<SectionSkeleton />}>
      <ActiveComponent config={config} envLocked={envLocked} editableSettings={editableSettings} />
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
          <ChevronLeft size={16} /> {t('settings.back')}
        </button>
        {/* Mobile keeps the section header — it's the only place the name appears */}
        <div className="mb-5 flex items-center gap-3">
          <span className="grid place-items-center w-9 h-9 rounded-lg bg-[var(--lx-elevated)] text-[var(--lx-accent)]">
            <activeDef.Icon size={18} />
          </span>
          <h1 className="text-lg font-semibold text-[var(--lx-text)] tracking-tight">
            {t(activeDef.labelKey)}
          </h1>
        </div>
        {sectionBody}
      </div>
    )
  }

  // ── Desktop overview (tile grid) ──────────────────────────────────────────
  if (!activeDef) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8 md:px-8">
        {overviewHeader}
        <SettingsTileGrid sections={SETTINGS_SECTIONS} onSelect={selectSection} />
      </div>
    )
  }

  // ── Desktop split-view — no section title on the right, rail shows active ──
  return (
    <div className="max-w-7xl mx-auto px-6 py-8 md:px-8 transition-[max-width] duration-300">
      {overviewHeader}
      <div className="grid grid-cols-[260px_1fr] gap-6 items-start">
        <div className="lx-card p-3 sticky top-6">
          <SettingsRail sections={SETTINGS_SECTIONS} activeId={activeId} onSelect={selectSection} />
        </div>
        <div className="min-w-0">
          {sectionBody}
        </div>
      </div>
    </div>
  )
}
