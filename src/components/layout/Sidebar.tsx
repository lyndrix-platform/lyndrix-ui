import { NavLink, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Cpu, LayoutDashboard, Puzzle, Settings, Users } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import { getPluginIcon } from '../../lib/icons'
import { useAppTitle } from '../../lib/useAppTitle'
import LyndrixLogo from '../LyndrixLogo'
import type { PluginOut } from '../../lib/types'

const CORE_URL = import.meta.env.VITE_CORE_URL ?? 'http://localhost:8081'

const gradientText: React.CSSProperties = {
  background: 'linear-gradient(135deg, var(--lx-accent), var(--lx-accent-2))',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}

function SectionLabel({
  children,
  collapsed,
}: {
  children: React.ReactNode
  collapsed?: boolean
}) {
  if (collapsed) return null
  return (
    <p className="px-3 mb-1.5 text-[10px] uppercase tracking-widest text-[var(--lx-text-muted)] font-semibold select-none">
      {children}
    </p>
  )
}

const activeItemCls =
  'rounded-lg bg-[var(--lx-accent)]/10 text-[var(--lx-accent)] font-medium'
const inactiveItemCls =
  'rounded-lg text-[var(--lx-text-muted)] hover:bg-[var(--lx-elevated)] hover:text-[var(--lx-text)]'
const baseItemCls =
  'flex items-center gap-3 px-3 py-2 text-sm transition-colors'

function NavItem({
  to,
  icon: Icon,
  label,
  collapsed,
}: {
  to: string
  icon: React.ElementType
  label: string
  collapsed?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        [baseItemCls, collapsed ? 'justify-center' : '', isActive ? activeItemCls : inactiveItemCls].join(' ')
      }
    >
      <Icon size={16} />
      {!collapsed && <span>{label}</span>}
    </NavLink>
  )
}

function PluginNavItem({
  plugin,
  onClose,
  collapsed,
}: {
  plugin: PluginOut
  onClose?: () => void
  collapsed?: boolean
}) {
  const { t } = useTranslation('ui')
  const Icon = getPluginIcon(plugin.icon)

  if (!plugin.is_active) {
    return (
      <div
        className={[
          baseItemCls,
          'opacity-40 cursor-not-allowed',
          inactiveItemCls,
          collapsed ? 'justify-center' : '',
        ].join(' ')}
        title={collapsed ? `${plugin.name} (${t('sidebar.plugin_inactive')})` : t('sidebar.plugin_inactive')}
      >
        <Icon size={16} />
        {!collapsed && <span>{plugin.name}</span>}
      </div>
    )
  }

  if (plugin.react_ui && plugin.react_routes.length > 0) {
    const safeId = plugin.id.replace(/\./g, '-')
    const primaryRoute = plugin.react_routes.find((r) => r.sidebar_visible) ?? plugin.react_routes[0]
    const to = `/apps/${safeId}${primaryRoute.path}`
    return (
      <NavLink
        to={to}
        onClick={onClose}
        title={collapsed ? plugin.name : undefined}
        className={({ isActive }) =>
          [baseItemCls, collapsed ? 'justify-center' : '', isActive ? activeItemCls : inactiveItemCls].join(' ')
        }
      >
        <Icon size={16} />
        {!collapsed && <span>{plugin.name}</span>}
      </NavLink>
    )
  }

  if (plugin.ui_route) {
    return (
      <a
        href={`${CORE_URL}${plugin.ui_route}`}
        target="_blank"
        rel="noreferrer"
        title={collapsed ? plugin.name : undefined}
        className={[baseItemCls, inactiveItemCls, collapsed ? 'justify-center' : ''].join(' ')}
        onClick={onClose}
      >
        <Icon size={16} />
        {!collapsed && <span>{plugin.name}</span>}
      </a>
    )
  }

  return (
    <div
      className={[
        baseItemCls,
        'opacity-40 cursor-not-allowed',
        inactiveItemCls,
        collapsed ? 'justify-center' : '',
      ].join(' ')}
      title={collapsed ? `${plugin.name} (${t('sidebar.plugin_no_route')})` : t('sidebar.plugin_no_route')}
    >
      <Icon size={16} />
      {!collapsed && <span>{plugin.name}</span>}
    </div>
  )
}

interface HealthResp {
  status?: string
  plugins?: Record<string, { status?: string }>
}

/** A health status that should count an entry as *not* up. */
function isDownStatus(s?: string): boolean {
  return s === 'down' || s === 'unhealthy' || s === 'error' || s === 'degraded'
}

/** Accent that reflects how many of `total` are up: all → up, none → down, some → paused. */
function ratioTone(up: number, total: number): string {
  if (total === 0) return 'var(--lx-text-muted)'
  if (up >= total) return 'var(--lx-state-up)'
  if (up === 0) return 'var(--lx-state-down)'
  return 'var(--lx-state-paused)'
}

function HealthRow({
  icon: Icon,
  label,
  up,
  total,
}: {
  icon: React.ElementType
  label: string
  up: number
  total: number
}) {
  const tone = ratioTone(up, total)
  const pct = total > 0 ? Math.round((up / total) * 100) : 0
  return (
    <div className="flex items-center gap-2.5">
      <Icon size={14} className="text-[var(--lx-text-muted)] shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-medium text-[var(--lx-text)]">{label}</span>
          <span className="text-[11px] font-semibold tabular-nums" style={{ color: tone }}>
            {up}/{total}
          </span>
        </div>
        <div className="h-1 rounded-full overflow-hidden bg-[var(--lx-border-soft)]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: tone }}
          />
        </div>
      </div>
    </div>
  )
}

function HealthDot({ label, up, total }: { label: string; up: number; total: number }) {
  const tone = ratioTone(up, total)
  return (
    <div className="flex flex-col items-center gap-0.5" title={`${label} ${up}/${total}`}>
      <span
        className="w-2 h-2 rounded-full"
        style={{ background: tone, boxShadow: `0 0 6px ${tone}` }}
      />
      <span className="text-[9px] font-semibold tabular-nums text-[var(--lx-text-muted)]">
        {up}/{total}
      </span>
    </div>
  )
}

function SidebarHealth({
  collapsed,
  coreUp,
  coreTotal,
  pluginUp,
  pluginTotal,
}: {
  collapsed?: boolean
  coreUp: number
  coreTotal: number
  pluginUp: number
  pluginTotal: number
}) {
  const { t } = useTranslation('ui')
  const coreLabel = t('sidebar.health_core', { defaultValue: 'Core' })
  const pluginLabel = t('sidebar.health_plugins', { defaultValue: 'Plugins' })

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2.5 py-3">
        <HealthDot label={coreLabel} up={coreUp} total={coreTotal} />
        <HealthDot label={pluginLabel} up={pluginUp} total={pluginTotal} />
      </div>
    )
  }

  return (
    <div className="lx-glass rounded-xl px-3 py-2.5 flex flex-col gap-2.5">
      <HealthRow icon={Cpu} label={coreLabel} up={coreUp} total={coreTotal} />
      <HealthRow icon={Puzzle} label={pluginLabel} up={pluginUp} total={pluginTotal} />
    </div>
  )
}

export default function Sidebar({
  onClose,
  collapsed,
}: {
  onClose?: () => void
  collapsed?: boolean
}) {
  const { t } = useTranslation('ui')
  const appName = useAppTitle()

  const { data: plugins } = useQuery({
    queryKey: ['plugins'],
    queryFn: () => apiFetch<{ plugins: PluginOut[] }>('/api/plugins').then((r) => r.plugins),
  })

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: () => apiFetch<HealthResp>('/api/health'),
    refetchInterval: 30_000,
  })

  const allModules = plugins ?? []
  const pluginList = allModules.filter(
    (p) => p.type === 'PLUGIN' && p.react_ui && p.react_routes.length > 0,
  )

  // Health summary: Core = core modules up/total, Plugins = plugins up/total.
  // A module is "up" when active and not reporting a failing health status.
  const healthPlugins = health?.plugins ?? {}
  const coreModules = allModules.filter((p) => p.type === 'CORE')
  const pluginModules = allModules.filter((p) => p.type === 'PLUGIN')
  const coreUp = coreModules.filter(
    (p) => p.is_active && !isDownStatus(healthPlugins[p.id]?.status),
  ).length
  const pluginUp = pluginModules.filter(
    (p) => p.is_active && !isDownStatus(healthPlugins[p.id]?.status),
  ).length

  return (
    <div className="flex flex-col h-full select-none">
      {/* Logo */}
      <div className="px-4 py-[18px] border-b border-[var(--lx-border-soft)] shrink-0 lx-safe-top lx-safe-x [--lx-safe-top-base:18px] [--lx-safe-x-base:1rem]">
        <Link
          to="/dashboard"
          onClick={onClose}
          className={[
            'flex items-center gap-2.5 font-semibold tracking-tight',
            collapsed ? 'justify-center' : '',
          ].join(' ')}
          title={collapsed ? appName : undefined}
        >
          <LyndrixLogo size={20} />
          {!collapsed && <span style={gradientText}>{appName}</span>}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-4">
        {/* Dashboard */}
        <div onClick={onClose}>
          <NavItem to="/dashboard" icon={LayoutDashboard} label={t('nav.dashboard')} collapsed={collapsed} />
        </div>

        {/* Apps (dynamic from /api/plugins) */}
        {pluginList.length > 0 && (
          <div>
            <SectionLabel collapsed={collapsed}>{t('sidebar.section_apps')}</SectionLabel>
            {pluginList.map((plugin) => (
              <PluginNavItem
                key={plugin.id}
                plugin={plugin}
                onClose={onClose}
                collapsed={collapsed}
              />
            ))}
          </div>
        )}
      </nav>

      {/* System — pinned at bottom */}
      <div className="shrink-0 px-2 pb-2 border-t border-[var(--lx-border-soft)]" onClick={onClose}>
        <div className="pt-3">
          <SectionLabel collapsed={collapsed}>{t('sidebar.section_system')}</SectionLabel>
          <NavItem to="/settings" icon={Settings} label={t('nav.settings')} collapsed={collapsed} />
          <NavItem to="/users" icon={Users} label={t('nav.users')} collapsed={collapsed} />
          <NavItem to="/plugins" icon={Puzzle} label={t('nav.plugins')} collapsed={collapsed} />
        </div>
      </div>

      {/* System health summary */}
      <div
        className={[
          'border-t border-[var(--lx-border-soft)] px-2 pt-2.5 pb-2 shrink-0',
          'lx-safe-bottom lx-safe-x [--lx-safe-bottom-base:0.5rem] [--lx-safe-x-base:0.5rem]',
        ].join(' ')}
      >
        <SidebarHealth
          collapsed={collapsed}
          coreUp={coreUp}
          coreTotal={coreModules.length}
          pluginUp={pluginUp}
          pluginTotal={pluginModules.length}
        />
      </div>
    </div>
  )
}
