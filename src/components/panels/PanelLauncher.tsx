import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { PanelsTopLeft, Pin } from 'lucide-react'
import { getPlugins } from '../../lib/api'
import { useAccess } from '../../lib/access'
import { getPluginIcon } from '../../lib/icons'
import { anyPanelsDeclared, availablePanels, togglePanel, usePanelStates } from '../../lib/panels'

/**
 * Header button listing every panel the user may open (core API ≥ 1.11).
 * Hidden entirely while no loaded plugin declares a panel; shows an empty
 * state when panels exist but none is visible to this user.
 */
export default function PanelLauncher() {
  const { t } = useTranslation('ui')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { data: plugins } = useQuery({ queryKey: ['plugins'], queryFn: getPlugins })
  const { data: access } = useAccess()
  const states = usePanelStates()
  const entries = useMemo(() => availablePanels(plugins, access), [plugins, access])

  // Close on click outside.
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  if (!anyPanelsDeclared(plugins)) return null

  const openCount = entries.filter((e) => states[e.key]?.open).length

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="lx-icon-btn relative"
        title={t('panels.launcher')}
        aria-label={t('panels.launcher')}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <PanelsTopLeft size={18} />
        {openCount > 0 && (
          <span
            className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full"
            style={{ background: 'var(--lx-accent)' }}
            aria-hidden
          />
        )}
      </button>

      {open && (
        <div className="lx-popover absolute right-0 mt-2 w-72 z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-[var(--lx-border-soft)]">
            <p className="text-sm font-semibold text-[var(--lx-text)]">{t('panels.launcher')}</p>
            <p className="text-[11px] text-[var(--lx-text-muted)]">{t('panels.launcher_hint')}</p>
          </div>

          <div className="max-h-96 overflow-y-auto py-1">
            {entries.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-[var(--lx-text-muted)]">
                {t('panels.empty')}
              </div>
            ) : (
              entries.map((e) => {
                const st = states[e.key]
                const isOpen = !!st?.open
                const Icon = getPluginIcon(e.panel.icon || e.plugin.icon)
                return (
                  <button
                    key={e.key}
                    type="button"
                    onClick={() => {
                      togglePanel(e)
                      setOpen(false)
                    }}
                    title={isOpen ? t('panels.close') : t('panels.open')}
                    className="w-full flex items-start gap-2.5 px-3 py-2 text-left text-sm hover:bg-[var(--lx-elevated)]/50 transition-colors"
                  >
                    <Icon
                      size={15}
                      className="mt-0.5 shrink-0"
                      style={{ color: isOpen ? 'var(--lx-accent)' : 'var(--lx-text-muted)' }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[var(--lx-text)] truncate">{e.panel.label}</span>
                      <span className="block text-[11px] text-[var(--lx-text-muted)] truncate">
                        {e.panel.description || e.plugin.name}
                      </span>
                    </span>
                    {st?.pinned && (
                      <Pin size={12} className="mt-1 shrink-0 text-[var(--lx-accent)]" aria-hidden />
                    )}
                    {isOpen && <span className="lx-badge lx-badge--muted mt-0.5">{t('panels.state_open')}</span>}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
