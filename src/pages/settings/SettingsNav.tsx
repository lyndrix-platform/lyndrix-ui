import type { SettingsSectionDef } from './registry'

/**
 * Big-icon tile grid for the settings overview ("wie beim Handy").
 * Mobile: 2 columns; widens to 3/4 on larger screens.
 */
export function SettingsTileGrid({
  sections,
  onSelect,
}: {
  sections: SettingsSectionDef[]
  onSelect: (id: string) => void
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {sections.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          className="lx-card lx-card-hover p-5 sm:p-6 flex flex-col items-center justify-center gap-3 text-center min-h-[120px] sm:min-h-[150px]"
        >
          <span className="grid place-items-center w-14 h-14 rounded-xl bg-[var(--lx-elevated)] text-[var(--lx-accent)]">
            <s.Icon size={26} />
          </span>
          <span className="text-sm font-medium text-[var(--lx-text)]">{s.label}</span>
        </button>
      ))}
    </div>
  )
}

/**
 * Compact vertical rail for the desktop split-view (tiles on the left while the
 * selected section renders on the right).
 */
export function SettingsRail({
  sections,
  activeId,
  onSelect,
}: {
  sections: SettingsSectionDef[]
  activeId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <nav className="flex flex-col gap-1.5">
      {sections.map((s) => {
        const active = s.id === activeId
        return (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors border ${
              active
                ? 'bg-[var(--lx-elevated)] text-[var(--lx-text)] border-[var(--lx-border)]'
                : 'text-[var(--lx-text-muted)] hover:bg-[var(--lx-surface)] border-transparent'
            }`}
          >
            <s.Icon size={18} className={active ? 'text-[var(--lx-accent)]' : ''} />
            <span className="text-sm font-medium">{s.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
