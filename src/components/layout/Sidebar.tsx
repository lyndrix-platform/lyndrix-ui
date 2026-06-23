import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LayoutDashboard, LogOut, Puzzle, Settings, Users } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import { getMe, logout } from '../../lib/auth'
import { getPluginIcon } from '../../lib/icons'
import LyndrixLogo from '../LyndrixLogo'
import type { PluginOut } from '../../lib/types'

const CORE_URL = import.meta.env.VITE_CORE_URL ?? 'http://localhost:8081'

const gradientText: React.CSSProperties = {
  background: 'linear-gradient(135deg, var(--lx-accent), var(--lx-accent-2))',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 mb-1 text-[10px] uppercase tracking-widest text-[var(--lx-text-muted)] font-medium">
      {children}
    </p>
  )
}

function NavItem({
  to,
  icon: Icon,
  label,
}: {
  to: string
  icon: React.ElementType
  label: string
}) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        [
          'flex items-center gap-2.5 px-3 py-1.5 text-sm border-l-2 transition-colors',
          isActive
            ? 'border-[var(--lx-accent)] text-[var(--lx-accent)] bg-[var(--lx-accent)]/5'
            : 'border-transparent text-[var(--lx-text-muted)] hover:text-[var(--lx-text)] hover:border-[var(--lx-border-soft)]',
        ].join(' ')
      }
    >
      <Icon size={15} />
      <span>{label}</span>
    </NavLink>
  )
}

function PluginNavItem({ plugin, onClose }: { plugin: PluginOut; onClose?: () => void }) {
  const Icon = getPluginIcon(plugin.icon)

  if (!plugin.is_active) {
    return (
      <div
        className="flex items-center gap-2.5 px-3 py-1.5 text-sm border-l-2 border-transparent text-[var(--lx-text-muted)] opacity-40 cursor-not-allowed"
        title="Plugin inaktiv"
      >
        <Icon size={15} />
        <span>{plugin.name}</span>
      </div>
    )
  }

  // React UI: use internal router link
  if (plugin.react_ui && plugin.react_routes.length > 0) {
    const safeId = plugin.id.replace(/\./g, '-')
    const primaryRoute = plugin.react_routes.find((r) => r.sidebar_visible) ?? plugin.react_routes[0]
    const to = `/apps/${safeId}${primaryRoute.path}`
    return (
      <NavLink
        to={to}
        onClick={onClose}
        className={({ isActive }) =>
          [
            'flex items-center gap-2.5 px-3 py-1.5 text-sm border-l-2 transition-colors',
            isActive
              ? 'border-[var(--lx-accent)] text-[var(--lx-accent)] bg-[var(--lx-accent)]/5'
              : 'border-transparent text-[var(--lx-text-muted)] hover:text-[var(--lx-text)] hover:border-[var(--lx-border-soft)]',
          ].join(' ')
        }
      >
        <Icon size={15} />
        <span>{plugin.name}</span>
      </NavLink>
    )
  }

  // NiceGUI UI: external link to core
  if (plugin.ui_route) {
    return (
      <a
        href={`${CORE_URL}${plugin.ui_route}`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2.5 px-3 py-1.5 text-sm border-l-2 border-transparent text-[var(--lx-text-muted)] hover:text-[var(--lx-text)] hover:border-[var(--lx-border-soft)] transition-colors"
        onClick={onClose}
      >
        <Icon size={15} />
        <span>{plugin.name}</span>
      </a>
    )
  }

  // No UI at all — render disabled
  return (
    <div
      className="flex items-center gap-2.5 px-3 py-1.5 text-sm border-l-2 border-transparent text-[var(--lx-text-muted)] opacity-40 cursor-not-allowed"
      title="Keine UI-Route konfiguriert"
    >
      <Icon size={15} />
      <span>{plugin.name}</span>
    </div>
  )
}

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const navigate = useNavigate()

  const { data: plugins } = useQuery({
    queryKey: ['plugins'],
    queryFn: () => apiFetch<{ plugins: PluginOut[] }>('/api/plugins').then((r) => r.plugins),
  })

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
  })

  const pluginList = (plugins ?? []).filter((p) => p.type === 'PLUGIN')

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex flex-col h-full select-none">
      {/* Logo */}
      <div className="px-4 py-[18px] border-b border-[var(--lx-border-soft)] shrink-0">
        <Link
          to="/dashboard"
          onClick={onClose}
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <LyndrixLogo size={20} />
          <span style={gradientText}>Lyndrix</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 flex flex-col gap-5">
        {/* Dashboard */}
        <div onClick={onClose}>
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
        </div>

        {/* Apps (dynamic from /api/plugins) */}
        {pluginList.length > 0 && (
          <div>
            <SectionLabel>Apps</SectionLabel>
            {pluginList.map((plugin) => (
              <PluginNavItem key={plugin.id} plugin={plugin} onClose={onClose} />
            ))}
          </div>
        )}

        {/* System */}
        <div onClick={onClose}>
          <SectionLabel>System</SectionLabel>
          <NavItem to="/settings" icon={Settings} label="Einstellungen" />
          <NavItem to="/users" icon={Users} label="Benutzer" />
          <NavItem to="/plugins" icon={Puzzle} label="Plugin-Verwaltung" />
        </div>
      </nav>

      {/* User footer */}
      <div className="border-t border-[var(--lx-border-soft)] px-3 py-3 shrink-0 flex items-center gap-2.5">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[var(--lx-text)] truncate">
            {me?.full_name || me?.username || '…'}
          </p>
          <p className="text-[10px] text-[var(--lx-text-muted)] truncate">@{me?.username}</p>
        </div>
        <button
          onClick={handleLogout}
          title="Abmelden"
          className="text-[var(--lx-text-muted)] hover:text-[var(--lx-state-down)] transition-colors shrink-0 p-0.5"
        >
          <LogOut size={15} />
        </button>
      </div>
    </div>
  )
}
