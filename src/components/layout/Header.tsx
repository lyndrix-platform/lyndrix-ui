import { PanelLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import NotificationBell from '../NotificationBell'
import ProfileMenu from '../ProfileMenu'

interface Props {
  onToggleSidebar: () => void
}

export default function Header({ onToggleSidebar }: Props) {
  const { t } = useTranslation('ui')

  return (
    <header className="hidden md:flex items-center justify-between shrink-0 relative z-40 border-b border-[var(--lx-glass-border)] bg-[var(--lx-surface-glass)] backdrop-blur-[18px] px-4 py-2.5 lx-safe-top lx-safe-x [--lx-safe-top-base:0.625rem] [--lx-safe-x-base:1rem]">
      <button
        type="button"
        onClick={onToggleSidebar}
        className="lx-icon-btn"
        title={t('shell.toggle_sidebar')}
        aria-label={t('shell.toggle_sidebar')}
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
