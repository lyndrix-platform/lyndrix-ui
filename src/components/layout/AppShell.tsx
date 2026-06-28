import { useState } from 'react'
import { Menu } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Sidebar from './Sidebar'
import Header from './Header'
import LyndrixLogo from '../LyndrixLogo'
import ToastStack from '../ToastStack'
import { useAppTitle } from '../../lib/useAppTitle'

interface Props {
  children: React.ReactNode
}

const COLLAPSE_KEY = 'lyndrix_sidebar_collapsed'

const gridBg: React.CSSProperties = {
  backgroundImage: [
    'linear-gradient(color-mix(in srgb, var(--lx-accent) 3%, transparent) 1px, transparent 1px)',
    'linear-gradient(90deg, color-mix(in srgb, var(--lx-accent) 3%, transparent) 1px, transparent 1px)',
  ].join(','),
  backgroundSize: '40px 40px',
}

export default function AppShell({ children }: Props) {
  const { t } = useTranslation('ui')
  const appName = useAppTitle()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // AppShell remounts on every top-level navigation, so the collapsed state
  // must live in localStorage to survive across routes.
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSE_KEY) === '1',
  )

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      return next
    })
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-30 w-56 shrink-0',
          'bg-[var(--lx-surface-glass)] backdrop-blur-[18px] border-r border-[var(--lx-glass-border)]',
          'transition-transform duration-200 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'md:relative md:translate-x-0 md:transition-[width] md:duration-200',
          collapsed ? 'md:w-14' : 'md:w-56',
        ].join(' ')}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} collapsed={collapsed} />
      </aside>

      {/* Main area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-[var(--lx-glass-border)] shrink-0 bg-[var(--lx-surface-glass)] backdrop-blur-[18px] lx-safe-top lx-safe-x [--lx-safe-top-base:0.75rem] [--lx-safe-x-base:1rem]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-[var(--lx-text-muted)] hover:text-[var(--lx-text)] transition-colors"
            aria-label={t('shell.open_nav')}
          >
            <Menu size={20} />
          </button>
          <LyndrixLogo size={18} />
          <span
            className="font-semibold tracking-tight"
            style={{
              background: 'linear-gradient(135deg, var(--lx-accent), var(--lx-accent-2))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {appName}
          </span>
        </div>

        {/* Desktop header */}
        <Header onToggleSidebar={toggleCollapsed} />

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto" style={gridBg}>
          {children}
        </main>
      </div>

      <ToastStack />
    </div>
  )
}
