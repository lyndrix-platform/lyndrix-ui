import { Link } from 'react-router-dom'
import { ArrowRight, ExternalLink } from 'lucide-react'
import { getPluginIcon } from '../../lib/icons'
import type { PluginOut } from '../../lib/types'

const CORE_URL = import.meta.env.VITE_CORE_URL ?? 'http://localhost:8081'

interface Props {
  plugins: PluginOut[]
}

function PluginTile({
  plugin,
  href,
  isExternal,
}: {
  plugin: PluginOut
  href: string | null
  isExternal: boolean
}) {
  const Icon = getPluginIcon(plugin.icon)
  const enabled = !!href

  const inner = (
    <div
      className={[
        'lx-card group/tile relative flex items-center gap-3.5 p-4',
        enabled ? 'lx-card-hover cursor-pointer' : 'opacity-45 cursor-not-allowed',
      ].join(' ')}
    >
      <div
        className="w-11 h-11 flex items-center justify-center rounded-lg shrink-0 text-[var(--lx-accent)]"
        style={{ background: 'color-mix(in srgb, var(--lx-accent) 12%, transparent)' }}
      >
        <Icon size={22} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--lx-text)] truncate">{plugin.name}</p>
        <div className="flex items-center gap-2 mt-1">
          {!plugin.is_active ? (
            <span className="lx-badge lx-badge--muted">
              <span className="lx-dot" />
              Inaktiv
            </span>
          ) : enabled ? (
            <span className="lx-badge lx-badge--up">
              <span className="lx-dot" />
              Aktiv
            </span>
          ) : (
            <span className="lx-badge lx-badge--muted">Kein UI</span>
          )}
          <span className="lx-mono text-[11px] text-[var(--lx-text-muted)]">v{plugin.version}</span>
        </div>
      </div>

      {enabled &&
        (isExternal ? (
          <ExternalLink
            size={16}
            className="shrink-0 text-[var(--lx-text-muted)] transition-colors group-hover/tile:text-[var(--lx-accent)]"
          />
        ) : (
          <ArrowRight
            size={16}
            className="shrink-0 text-[var(--lx-text-muted)] transition-all group-hover/tile:text-[var(--lx-accent)] group-hover/tile:translate-x-0.5"
          />
        ))}
    </div>
  )

  if (!href) return <div>{inner}</div>

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {inner}
      </a>
    )
  }

  return <Link to={href}>{inner}</Link>
}

export default function PluginLaunchpad({ plugins }: Props) {
  const items = plugins.filter((p) => p.type === 'PLUGIN')

  if (items.length === 0) {
    return (
      <div className="lx-card lx-empty">
        <span className="material-icons">extension</span>
        <p className="text-sm">Keine Plugins installiert.</p>
        <Link to="/plugins" className="lx-btn lx-btn--secondary lx-btn--sm mt-1">
          Zum Marketplace
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((plugin) => {
        if (!plugin.is_active) {
          return <PluginTile key={plugin.id} plugin={plugin} href={null} isExternal={false} />
        }

        if (plugin.react_ui && plugin.react_routes.length > 0) {
          const safeId = plugin.id.replace(/\./g, '-')
          const primaryRoute =
            plugin.react_routes.find((r) => r.sidebar_visible) ?? plugin.react_routes[0]
          return (
            <PluginTile
              key={plugin.id}
              plugin={plugin}
              href={`/apps/${safeId}${primaryRoute.path}`}
              isExternal={false}
            />
          )
        }

        if (plugin.ui_route) {
          return (
            <PluginTile
              key={plugin.id}
              plugin={plugin}
              href={`${CORE_URL}${plugin.ui_route}`}
              isExternal={true}
            />
          )
        }

        return <PluginTile key={plugin.id} plugin={plugin} href={null} isExternal={false} />
      })}
    </div>
  )
}
