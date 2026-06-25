import { PanelLeft } from 'lucide-react'
import NotificationBell from '../NotificationBell'
import ProfileMenu from '../ProfileMenu'

interface Props {
  onToggleSidebar: () => void
}

export default function Header({ onToggleSidebar }: Props) {
  return (
    <header className="hidden md:flex items-center justify-between shrink-0 border-b border-[var(--lx-border-soft)] bg-[var(--lx-surface)] px-4 py-2.5">
      <button
        type="button"
        onClick={onToggleSidebar}
        className="lx-icon-btn"
        title="Menü ein-/ausklappen"
        aria-label="Menü ein-/ausklappen"
      >
        <PanelLeft size={18} />
      </button>

      <div className="flex items-center gap-2">
        <NotificationBell />
        <ProfileMenu />
      </div>
    </header>
  )
}
