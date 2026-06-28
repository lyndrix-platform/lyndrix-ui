import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, ExternalLink } from 'lucide-react'
import { getPluginIcon } from '../../lib/icons'
import type { PluginOut } from '../../lib/types'

const CORE_URL = import.meta.env.VITE_CORE_URL ?? 'http://localhost:8081'

// Statuses the plugin manager uses to flag a module that did not come up cleanly.
const ERROR_STATUSES = new Set(['error', 'failed', 'degraded', 'blocked'])

interface Props {
  plugins: PluginOut[]
}

function hasReactUI(p: PluginOut): boolean {
  return p.react_ui && p.react_routes.length > 0
}

function StatusBadge({ plugin }: { plugin: PluginOut }) {
  const { t } = useTranslation('ui')

  if (ERROR_STATUSES.has(plugin.status)) {
    return (
      <span className="lx-badge lx-badge--down" title={plugin.error_message ?? undefined}>
        <span className="lx-dot" />
        {t('dashboard.status_error', { defaultValue: 'Error' })}
      </span>
    )
  }
  if (!plugin.is_active) {
    return (
      <span className="lx-badge lx-badge--muted">
        <span className="lx-dot" />
        {t('plugins_page.status_inactive')}
      </span>
    )
  }
  return (
    <span className="lx-badge lx-badge--up">
      <span className="lx-dot" />
      {t('plugins_page.status_active')}
    </span>
  )
}

function PluginTile({
  plugin,
  href,
  isExternal,
  dimmed,
}: {
  plugin: PluginOut
  href: string | null
  isExternal: boolean
  dimmed: boolean
}) {
  const Icon = getPluginIcon(plugin.icon)
  const interactive = !!href

  const inner = (
    <div
      className={[
        'lx-card group/tile relative flex items-center gap-3.5 p-4 h-full',
        interactive ? 'lx-card-hover cursor-pointer' : '',
        dimmed ? 'opacity-45 cursor-not-allowed' : '',
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
          <StatusBadge plugin={plugin} />
          <span className="lx-mono text-[11px] text-[var(--lx-text-muted)]">v{plugin.version}</span>
        </div>
      </div>

      {interactive &&
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

  if (!href) return <div className="h-full">{inner}</div>

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="h-full">
        {inner}
      </a>
    )
  }

  return (
    <Link to={href} className="h-full">
      {inner}
    </Link>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="lx-eyebrow mb-3">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>
    </section>
  )
}

export default function PluginLaunchpad({ plugins }: Props) {
  const { t } = useTranslation('ui')

  const core = plugins.filter((p) => p.type === 'CORE')
  const pluginItems = plugins.filter((p) => p.type === 'PLUGIN')

  // Three buckets by UI capability — only rendered when non-empty.
  const apps = pluginItems.filter((p) => hasReactUI(p)) // native React UI
  const tools = pluginItems.filter((p) => !hasReactUI(p) && !!p.ui_route) // external/legacy UI
  const services = pluginItems.filter((p) => !hasReactUI(p) && !p.ui_route) // headless

  function appHref(p: PluginOut): string {
    const safeId = p.id.replace(/\./g, '-')
    const primary = p.react_routes.find((r) => r.sidebar_visible) ?? p.react_routes[0]
    return `/apps/${safeId}${primary.path}`
  }

  if (pluginItems.length === 0 && core.length === 0) {
    return (
      <div className="lx-card lx-empty">
        <span className="material-icons">extension</span>
        <p className="text-sm">{t('dashboard.no_plugins')}</p>
        <Link to="/plugins" className="lx-btn lx-btn--secondary lx-btn--sm mt-1">
          {t('dashboard.go_to_marketplace')}
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-9">
      {/* Core components — informational, never dimmed */}
      {core.length > 0 && (
        <Section title={t('dashboard.section_core', { defaultValue: 'Core' })}>
          {core.map((p) => (
            <PluginTile key={p.id} plugin={p} href={null} isExternal={false} dimmed={false} />
          ))}
        </Section>
      )}

      {/* Apps — plugins with a native React UI */}
      {apps.length > 0 && (
        <Section title={t('dashboard.apps')}>
          {apps.map((p) => (
            <PluginTile
              key={p.id}
              plugin={p}
              href={p.is_active ? appHref(p) : null}
              isExternal={false}
              dimmed={!p.is_active}
            />
          ))}
        </Section>
      )}

      {/* Tools — plugins with a non-React (external/legacy) UI */}
      {tools.length > 0 && (
        <Section title={t('dashboard.section_tools', { defaultValue: 'Tools' })}>
          {tools.map((p) => (
            <PluginTile
              key={p.id}
              plugin={p}
              href={p.is_active && p.ui_route ? `${CORE_URL}${p.ui_route}` : null}
              isExternal={true}
              dimmed={!p.is_active}
            />
          ))}
        </Section>
      )}

      {/* Services — headless plugins with no UI; not dimmed, just shown with status */}
      {services.length > 0 && (
        <Section title={t('dashboard.section_services', { defaultValue: 'Services' })}>
          {services.map((p) => (
            <PluginTile key={p.id} plugin={p} href={null} isExternal={false} dimmed={false} />
          ))}
        </Section>
      )}

      {/* No plugins installed (but core present) */}
      {pluginItems.length === 0 && (
        <div className="lx-card lx-empty">
          <span className="material-icons">extension</span>
          <p className="text-sm">{t('dashboard.no_plugins')}</p>
          <Link to="/plugins" className="lx-btn lx-btn--secondary lx-btn--sm mt-1">
            {t('dashboard.go_to_marketplace')}
          </Link>
        </div>
      )}
    </div>
  )
}
