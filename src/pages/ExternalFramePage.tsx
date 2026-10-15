import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ExternalLink } from 'lucide-react'
import { getPluginIcon } from '../lib/icons'
import { safePluginId, useNavEntries } from '../lib/nav'

/**
 * Embedded page for a plugin-registered sidebar entry (core API ≥ 1.9):
 * /ext/:pluginId/:entryId renders the entry's URL in a full-height iframe with
 * a slim header. Entries with open_mode "new_tab" get a launcher instead —
 * services that forbid embedding (X-Frame-Options / CSP) are configured that way.
 */
export default function ExternalFramePage() {
  const { t } = useTranslation('ui')
  const { pluginId, entryId } = useParams<{ pluginId: string; entryId: string }>()
  const { data: entries, isPending } = useNavEntries()

  const entry = entries?.find(
    (e) => safePluginId(e.plugin_id) === pluginId && e.id === decodeURIComponent(entryId ?? ''),
  )

  if (isPending && !entries) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8 flex gap-3 items-center">
        <div className="w-5 h-5 border-2 border-[var(--lx-accent)] border-t-transparent rounded-full animate-spin shrink-0" />
        <p className="text-sm text-[var(--lx-text-muted)]">{t('shell.loading_plugin')}</p>
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10 flex flex-col items-center gap-3 text-center">
        <p className="text-sm text-[var(--lx-text-muted)]">{t('external.not_found')}</p>
        <Link to="/dashboard" className="lx-btn lx-btn--secondary lx-btn--sm">
          {t('nav.dashboard')}
        </Link>
      </div>
    )
  }

  const Icon = getPluginIcon(entry.icon)

  if (entry.open_mode === 'new_tab') {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10 flex flex-col items-center gap-4 text-center">
        <Icon size={28} className="text-[var(--lx-accent)]" />
        <h1 className="text-lg font-semibold text-[var(--lx-text)]">{entry.label}</h1>
        {entry.description && (
          <p className="text-sm text-[var(--lx-text-muted)]">{entry.description}</p>
        )}
        <p className="text-sm text-[var(--lx-text-muted)]">{t('external.opens_new_tab')}</p>
        <a
          href={entry.url}
          target="_blank"
          rel="noreferrer"
          className="lx-btn lx-btn--primary inline-flex items-center gap-2"
        >
          <ExternalLink size={14} />
          {t('external.open_new_tab')}
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-4 py-2 border-b border-[var(--lx-border-soft)] shrink-0">
        <Icon size={16} className="text-[var(--lx-accent)] shrink-0" />
        <span className="text-sm font-medium text-[var(--lx-text)] truncate">{entry.label}</span>
        <span className="hidden sm:inline text-[11px] text-[var(--lx-text-muted)] truncate">
          {t('external.blocked_hint')}
        </span>
        <a
          href={entry.url}
          target="_blank"
          rel="noreferrer"
          title={t('external.open_new_tab')}
          className="ml-auto lx-btn lx-btn--secondary lx-btn--sm inline-flex items-center gap-1.5 shrink-0"
        >
          <ExternalLink size={14} />
          <span className="hidden sm:inline">{t('external.open_new_tab')}</span>
        </a>
      </div>
      <iframe
        key={entry.url}
        src={entry.url}
        title={entry.label}
        className="flex-1 w-full border-0 bg-white"
        allow="fullscreen; clipboard-read; clipboard-write"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  )
}
