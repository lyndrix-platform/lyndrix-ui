import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { getPluginIcon } from '../../lib/icons'
import type { PluginOut } from '../../lib/types'

const CORE_URL = import.meta.env.VITE_CORE_URL ?? 'http://localhost:8081'

interface Props {
  plugins: PluginOut[]
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full ${
        active ? 'bg-[var(--lx-state-up)]' : 'bg-[var(--lx-text-muted)] opacity-40'
      }`}
    />
  )
}

function PluginTile({ plugin, href, isExternal }: { plugin: PluginOut; href: string | null; isExternal: boolean }) {
  const Icon = getPluginIcon(plugin.icon)

  const inner = (
    <div
      className={[
        'lx-card relative flex flex-col items-center gap-2 p-4 text-center',
        'transition-all duration-200',
        href
          ? 'hover:border-[var(--lx-border)] hover:-translate-y-0.5 cursor-pointer'
          : 'opacity-40 cursor-not-allowed',
      ].join(' ')}
    >
      <div className="w-10 h-10 flex items-center justify-center rounded-md bg-[var(--lx-accent)]/10 text-[var(--lx-accent)] shrink-0">
        <Icon size={20} />
      </div>
      <div className="min-w-0 w-full">
        <p className="text-sm font-medium text-[var(--lx-text)] truncate">{plugin.name}</p>
        <p className="text-[10px] text-[var(--lx-text-muted)] mt-0.5">v{plugin.version}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <StatusDot active={plugin.is_active} />
        <span className="text-[10px] text-[var(--lx-text-muted)]">{plugin.status}</span>
      </div>
      {href && isExternal && (
        <ExternalLink
          size={10}
          className="absolute top-2 right-2 text-[var(--lx-accent)] opacity-0 group-hover:opacity-60"
        />
      )}
    </div>
  )

  if (!href) return <div key={plugin.id}>{inner}</div>

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="group">
        {inner}
      </a>
    )
  }

  return (
    <Link to={href} className="group">
      {inner}
    </Link>
  )
}

export default function PluginLaunchpad({ plugins }: Props) {
  const items = plugins.filter((p) => p.type === 'PLUGIN')

  if (items.length === 0) {
    return <p className="text-sm text-[var(--lx-text-muted)]">Keine Plugins installiert.</p>
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {items.map((plugin) => {
        if (!plugin.is_active) {
          return <PluginTile key={plugin.id} plugin={plugin} href={null} isExternal={false} />
        }

        // React UI: link internally
        if (plugin.react_ui && plugin.react_routes.length > 0) {
          const safeId = plugin.id.replace(/\./g, '-')
          const primaryRoute = plugin.react_routes.find((r) => r.sidebar_visible) ?? plugin.react_routes[0]
          return (
            <PluginTile
              key={plugin.id}
              plugin={plugin}
              href={`/apps/${safeId}${primaryRoute.path}`}
              isExternal={false}
            />
          )
        }

        // NiceGUI UI: external link to core
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
