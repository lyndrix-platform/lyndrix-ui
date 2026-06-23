import { useState } from 'react'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import LyndrixLogo from '../LyndrixLogo'
import ToastStack from '../ToastStack'

interface Props {
  children: React.ReactNode
}

const gridBg: React.CSSProperties = {
  backgroundImage: [
    'linear-gradient(rgba(0, 212, 255, 0.03) 1px, transparent 1px)',
    'linear-gradient(90deg, rgba(0, 212, 255, 0.03) 1px, transparent 1px)',
  ].join(','),
  backgroundSize: '40px 40px',
}

export default function AppShell({ children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--lx-bg)]">
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
          'bg-[var(--lx-surface)] border-r border-[var(--lx-border-soft)]',
          'transition-transform duration-200 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'md:relative md:translate-x-0',
        ].join(' ')}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Main area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-[var(--lx-border-soft)] shrink-0 bg-[var(--lx-surface)]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-[var(--lx-text-muted)] hover:text-[var(--lx-text)] transition-colors"
            aria-label="Navigation öffnen"
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
            Lyndrix
          </span>
        </div>

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto" style={gridBg}>
          {children}
        </main>
      </div>

      <ToastStack />
    </div>
  )
}
