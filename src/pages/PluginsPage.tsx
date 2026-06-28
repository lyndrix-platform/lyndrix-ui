import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { RefreshCw, ArrowUpCircle, Trash2, Check, Package, Settings } from 'lucide-react'
import { apiFetch } from '../lib/api'
import { toast } from '../lib/toast'
import { getPluginIcon } from '../lib/icons'
import type { PluginOut, MarketplacePlugin } from '../lib/types'
import PluginSettingsModal from '../components/PluginSettingsModal'

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputCls = 'lx-input'

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[]
  active: string
  onChange: (id: string) => void
}) {
  return (
    <div className="lx-tabs mb-6">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`lx-tab ${active === t.id ? 'lx-tab--active' : ''}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ─── Status dot ───────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'active'
      ? 'var(--lx-state-up)'
      : status === 'failed'
        ? 'var(--lx-state-down)'
        : status === 'loading'
          ? 'var(--lx-state-paused)'
          : 'var(--lx-text-muted)'
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0 mt-0.5"
      style={{ background: color }}
      title={status}
    />
  )
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  label: string
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      title={label}
      className={[
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-40 shrink-0',
        checked ? 'bg-[var(--lx-accent)]' : 'bg-[var(--lx-border-soft)]',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200',
          checked ? 'translate-x-4' : 'translate-x-1',
        ].join(' ')}
      />
    </button>
  )
}

// ─── Icon button ──────────────────────────────────────────────────────────────

function IconBtn({
  onClick,
  disabled,
  title,
  variant = 'ghost',
  children,
}: {
  onClick: () => void
  disabled?: boolean
  title: string
  variant?: 'ghost' | 'danger'
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={[
        'p-1.5 rounded-md transition-colors disabled:opacity-40',
        variant === 'danger'
          ? 'text-[var(--lx-text-muted)] hover:text-[var(--lx-state-down)] hover:bg-[var(--lx-state-down)]/10'
          : 'text-[var(--lx-text-muted)] hover:text-[var(--lx-text)] hover:bg-[var(--lx-elevated-glass)]',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
  loading,
}: {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  const { t } = useTranslation('ui')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm mx-4 p-5 rounded-xl bg-[var(--lx-surface-glass)] backdrop-blur-[16px] backdrop-saturate-150 border border-[var(--lx-border-soft)] shadow-xl">
        <h3 className="text-sm font-semibold text-[var(--lx-text)] mb-2">{title}</h3>
        <p className="text-sm text-[var(--lx-text-muted)] mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="lx-btn lx-btn--secondary lx-btn--sm">
            {t('plugins_page.cancel')}
          </button>
          <button onClick={onConfirm} disabled={loading} className="lx-btn lx-btn--danger lx-btn--sm">
            {loading ? t('plugins_page.please_wait') : t('plugins_page.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Install dialog ───────────────────────────────────────────────────────────

function InstallDialog({ initialRepoUrl = '', onClose }: { initialRepoUrl?: string; onClose: () => void }) {
  const { t } = useTranslation('ui')
  const queryClient = useQueryClient()
  const [repoUrl, setRepoUrl] = useState(initialRepoUrl)
  const [version, setVersion] = useState('latest')
  const [refreshCount, setRefreshCount] = useState(0)

  const { data: versions, isFetching: versionsFetching } = useQuery({
    queryKey: ['plugin-versions', repoUrl, refreshCount],
    queryFn: () =>
      apiFetch<{ versions: string[] }>(
        `/api/plugins/versions?url=${encodeURIComponent(repoUrl)}${refreshCount > 0 ? '&force_refresh=true' : ''}`,
      ).then((r) => r.versions),
    enabled: repoUrl.length > 10,
  })

  const installMutation = useMutation({
    mutationFn: () =>
      apiFetch('/api/plugins/install', {
        method: 'POST',
        body: JSON.stringify({ url: repoUrl, version }),
      }),
    onSuccess: () => {
      toast.success(t('plugins_page.install_started'))
      void queryClient.invalidateQueries({ queryKey: ['plugins'] })
      onClose()
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t('plugins_page.install_failed'))
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 p-6 rounded-xl bg-[var(--lx-surface-glass)] backdrop-blur-[16px] backdrop-saturate-150 border border-[var(--lx-border-soft)] shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-[var(--lx-text)]">{t('plugins_page.install_title')}</h3>
          <button
            onClick={onClose}
            className="text-[var(--lx-text-muted)] hover:text-[var(--lx-text)] text-lg leading-none p-1"
          >
            &times;
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[var(--lx-text-muted)] uppercase tracking-wide">
              {t('plugins_page.repo_url')}
            </label>
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/lyndrix-platform/lyndrix-plugin-…"
              className={inputCls}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[var(--lx-text-muted)] uppercase tracking-wide flex items-center gap-2">
              {t('plugins_page.version_label')}
              {versionsFetching && (
                <span className="text-[var(--lx-accent)] normal-case tracking-normal font-normal">
                  {t('common.loading')}
                </span>
              )}
            </label>
            <div className="flex gap-1.5">
              <select
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                disabled={versionsFetching}
                className={`${inputCls} flex-1`}
              >
                <option value="latest">latest</option>
                {(versions ?? []).map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
              <button
                onClick={() => setRefreshCount((c) => c + 1)}
                disabled={versionsFetching || repoUrl.length <= 10}
                title={t('plugins_page.refresh_versions')}
                className="px-2 rounded-md border border-[var(--lx-border-soft)] text-[var(--lx-text-muted)] hover:text-[var(--lx-accent)] hover:border-[var(--lx-accent)]/40 transition-colors disabled:opacity-40 shrink-0"
              >
                <RefreshCw size={13} className={versionsFetching ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {installMutation.isError && (
            <p className="text-xs text-[var(--lx-state-down)] bg-[var(--lx-elevated-glass)] px-3 py-2 rounded-md">
              {installMutation.error instanceof Error
                ? installMutation.error.message
                : t('plugins_page.install_failed')}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="lx-btn lx-btn--secondary lx-btn--sm">
              {t('plugins_page.cancel')}
            </button>
            <button
              onClick={() => installMutation.mutate()}
              disabled={!repoUrl || installMutation.isPending}
              className="lx-btn lx-btn--primary lx-btn--sm"
            >
              {installMutation.isPending ? t('plugins_page.installing') : t('plugins_page.install_btn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Upgrade dialog ───────────────────────────────────────────────────────────

function UpgradeDialog({ plugin, onClose }: { plugin: PluginOut; onClose: () => void }) {
  const { t } = useTranslation('ui')
  const queryClient = useQueryClient()
  const [version, setVersion] = useState('latest')
  const [refreshCount, setRefreshCount] = useState(0)

  const { data: versions, isFetching: versionsFetching } = useQuery({
    queryKey: ['plugin-versions', plugin.repo_url, refreshCount],
    queryFn: () =>
      apiFetch<{ versions: string[] }>(
        `/api/plugins/versions?url=${encodeURIComponent(plugin.repo_url!)}${refreshCount > 0 ? '&force_refresh=true' : ''}`,
      ).then((r) => r.versions),
    enabled: !!plugin.repo_url,
  })

  const upgradeMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/plugins/${plugin.id}/upgrade`, {
        method: 'POST',
        body: JSON.stringify({ version }),
      }),
    onSuccess: () => {
      toast.success(t('plugins_page.upgrading_toast', { name: plugin.name }))
      void queryClient.invalidateQueries({ queryKey: ['plugins'] })
      onClose()
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t('plugins_page.update_failed'))
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm mx-4 p-6 rounded-xl bg-[var(--lx-surface-glass)] backdrop-blur-[16px] backdrop-saturate-150 border border-[var(--lx-border-soft)] shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-semibold text-[var(--lx-text)]">
              {t('plugins_page.upgrade_title', { name: plugin.name })}
            </h3>
            <p className="text-xs text-[var(--lx-text-muted)] mt-0.5">
              {t('plugins_page.current_version', { version: plugin.version })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--lx-text-muted)] hover:text-[var(--lx-text)] text-lg leading-none p-1"
          >
            &times;
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[var(--lx-text-muted)] uppercase tracking-wide flex items-center gap-2">
              {t('plugins_page.target_version')}
              {versionsFetching && (
                <span className="text-[var(--lx-accent)] normal-case tracking-normal font-normal">
                  {t('common.loading')}
                </span>
              )}
            </label>
            <div className="flex gap-1.5">
              <select
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                disabled={versionsFetching}
                className={`${inputCls} flex-1`}
              >
                <option value="latest">latest</option>
                {(versions ?? []).map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
              <button
                onClick={() => setRefreshCount((c) => c + 1)}
                disabled={versionsFetching}
                title={t('plugins_page.refresh_versions')}
                className="px-2 rounded-md border border-[var(--lx-border-soft)] text-[var(--lx-text-muted)] hover:text-[var(--lx-accent)] hover:border-[var(--lx-accent)]/40 transition-colors disabled:opacity-40 shrink-0"
              >
                <RefreshCw size={13} className={versionsFetching ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {upgradeMutation.isError && (
            <p className="text-xs text-[var(--lx-state-down)] bg-[var(--lx-elevated-glass)] px-3 py-2 rounded-md">
              {upgradeMutation.error instanceof Error
                ? upgradeMutation.error.message
                : t('plugins_page.update_failed')}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="lx-btn lx-btn--secondary lx-btn--sm">
              {t('plugins_page.cancel')}
            </button>
            <button
              onClick={() => upgradeMutation.mutate()}
              disabled={upgradeMutation.isPending}
              className="lx-btn lx-btn--primary lx-btn--sm"
            >
              {upgradeMutation.isPending ? t('plugins_page.upgrading') : t('plugins_page.upgrade_btn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Plugin card ──────────────────────────────────────────────────────────────

function PluginCard({ plugin }: { plugin: PluginOut }) {
  const { t } = useTranslation('ui')
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [confirmUninstall, setConfirmUninstall] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [showError, setShowError] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const hasSettings = (plugin.settings_schema?.length ?? 0) > 0 || !!plugin.settings_ui_route

  function openSettings() {
    if (plugin.settings_ui_route) {
      const safeId = plugin.id.replace(/\./g, '-')
      navigate(`/apps/${safeId}${plugin.settings_ui_route}`)
    } else {
      setShowSettings(true)
    }
  }

  const Icon = getPluginIcon(plugin.icon)

  const actionMutation = useMutation({
    mutationFn: (action: 'enable' | 'disable' | 'reload' | 'uninstall') =>
      apiFetch(`/api/plugins/${plugin.id}/${action}`, { method: 'POST' }),
    onSuccess: (_data, action) => {
      const msgs: Record<string, string> = {
        enable: `${plugin.name} ${t('plugins_page.status_active').toLowerCase()}`,
        disable: `${plugin.name} ${t('plugins_page.status_inactive').toLowerCase()}`,
        reload: `${plugin.name} ${t('plugins_page.reload').toLowerCase()}`,
        uninstall: `${plugin.name} ${t('plugins_page.uninstall').toLowerCase()}`,
      }
      toast.success(msgs[action])
      void queryClient.invalidateQueries({ queryKey: ['plugins'] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t('plugins_page.action_failed'))
    },
  })

  const isBusy = actionMutation.isPending
  const isPlugin = plugin.type === 'PLUGIN'

  const statusLabel: Record<string, string> = {
    active: t('plugins_page.status_active'),
    inactive: t('plugins_page.status_inactive'),
    failed: t('plugins_page.status_failed'),
    loading: t('plugins_page.status_loading'),
    installing: t('plugins_page.status_installing'),
    upgrading: t('plugins_page.status_upgrading'),
  }

  const statusBadge =
    plugin.status === 'active'
      ? 'lx-badge--up'
      : plugin.status === 'failed'
        ? 'lx-badge--down'
        : 'lx-badge--muted'

  return (
    <>
      {confirmUninstall && (
        <ConfirmDialog
          title={t('plugins_page.uninstall_title', { name: plugin.name })}
          message={t('plugins_page.uninstall_message')}
          onConfirm={() => {
            actionMutation.mutate('uninstall')
            setConfirmUninstall(false)
          }}
          onCancel={() => setConfirmUninstall(false)}
          loading={isBusy}
        />
      )}

      {showUpgrade && plugin.repo_url && (
        <UpgradeDialog plugin={plugin} onClose={() => setShowUpgrade(false)} />
      )}

      {showSettings && (
        <PluginSettingsModal
          pluginId={plugin.id}
          pluginName={plugin.name}
          onClose={() => setShowSettings(false)}
        />
      )}

      <div className="rounded-xl bg-[var(--lx-surface-glass)] backdrop-blur-[16px] backdrop-saturate-150 border border-[var(--lx-border-soft)] overflow-hidden transition-colors hover:border-[var(--lx-border)]">
        {/* Header */}
        <div className="p-4 flex gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-[var(--lx-accent)]"
            style={{ background: 'color-mix(in srgb, var(--lx-accent) 12%, transparent)' }}
          >
            <Icon size={20} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusDot status={plugin.status} />
              <span className="text-sm font-semibold text-[var(--lx-text)]">{plugin.name}</span>
              <span className="text-xs text-[var(--lx-text-muted)] font-mono shrink-0">
                v{plugin.version}
              </span>
            </div>
            <p className="text-[11px] text-[var(--lx-text-muted)] mt-0.5 truncate font-mono">
              {plugin.id}
            </p>
            {plugin.description && (
              <p className="text-xs text-[var(--lx-text-muted)] mt-1.5 line-clamp-2">
                {plugin.description}
              </p>
            )}
            {actionMutation.isError && (
              <p className="text-xs text-[var(--lx-state-down)] mt-1">
                {actionMutation.error instanceof Error ? actionMutation.error.message : t('plugins_page.action_failed')}
              </p>
            )}
            {showError && plugin.error_message && (
              <div className="mt-2 p-2 rounded-md bg-[var(--lx-state-down)]/10 border border-[var(--lx-state-down)]/20">
                <p className="text-[11px] text-[var(--lx-state-down)] font-mono break-all leading-relaxed">
                  {plugin.error_message}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {plugin.error_message ? (
              <button
                onClick={() => setShowError((v) => !v)}
                title={t('plugins_page.show_error')}
                className={`lx-badge ${statusBadge} cursor-pointer hover:opacity-80 transition-opacity`}
              >
                {statusLabel[plugin.status] ?? plugin.status}
              </button>
            ) : (
              <span className={`lx-badge ${statusBadge}`}>
                {statusLabel[plugin.status] ?? plugin.status}
              </span>
            )}
            {plugin.react_ui && <span className="lx-badge lx-badge--accent">React</span>}
          </div>
        </div>

        {/* Action bar — only for user-managed plugins */}
        {isPlugin && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--lx-border-soft)] bg-[var(--lx-elevated-glass)]/40">
            <div className="flex items-center gap-2">
              <ToggleSwitch
                checked={plugin.is_active}
                onChange={() =>
                  actionMutation.mutate(plugin.is_active ? 'disable' : 'enable')
                }
                disabled={isBusy}
                label={plugin.is_active ? t('plugins_page.disable') : t('plugins_page.enable')}
              />
              <span className="text-xs text-[var(--lx-text-muted)]">
                {plugin.is_active ? t('plugins_page.status_active') : t('plugins_page.status_inactive')}
              </span>
            </div>

            <div className="flex items-center gap-0.5">
              <IconBtn
                onClick={() => actionMutation.mutate('reload')}
                disabled={isBusy}
                title={t('plugins_page.reload')}
              >
                <RefreshCw size={14} />
              </IconBtn>

              {hasSettings && (
                <IconBtn
                  onClick={openSettings}
                  disabled={isBusy}
                  title={t('plugins_page.settings_btn')}
                >
                  <Settings size={14} />
                </IconBtn>
              )}

              {plugin.repo_url && (
                <IconBtn
                  onClick={() => setShowUpgrade(true)}
                  disabled={isBusy}
                  title={t('plugins_page.upgrade')}
                >
                  <ArrowUpCircle size={14} />
                </IconBtn>
              )}

              <IconBtn
                onClick={() => setConfirmUninstall(true)}
                disabled={isBusy}
                title={t('plugins_page.uninstall')}
                variant="danger"
              >
                <Trash2 size={14} />
              </IconBtn>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Installed tab ────────────────────────────────────────────────────────────

function InstalledTab() {
  const { t } = useTranslation('ui')
  const [showInstall, setShowInstall] = useState(false)

  const { data: plugins, isLoading } = useQuery({
    queryKey: ['plugins'],
    queryFn: () => apiFetch<{ plugins: PluginOut[] }>('/api/plugins').then((r) => r.plugins),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-5 h-5 border-2 border-[var(--lx-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const coreModules = (plugins ?? []).filter((p) => p.type !== 'PLUGIN')
  const pluginModules = (plugins ?? []).filter((p) => p.type === 'PLUGIN')

  return (
    <>
      {showInstall && <InstallDialog onClose={() => setShowInstall(false)} />}

      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--lx-text-muted)]">
            {t('plugins_page.installed_count', { count: pluginModules.length })}
          </span>
          <button onClick={() => setShowInstall(true)} className="lx-btn lx-btn--primary lx-btn--sm">
            <span className="material-icons" style={{ fontSize: 16 }}>add</span>
            {t('plugins_page.install_plugin_btn')}
          </button>
        </div>

        {pluginModules.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--lx-text-muted)] mb-3">
              {t('plugins_page.section_plugins')}
            </h2>
            <div className="flex flex-col gap-2">
              {pluginModules.map((p) => (
                <PluginCard key={p.id} plugin={p} />
              ))}
            </div>
          </section>
        )}

        {coreModules.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--lx-text-muted)] mb-3">
              {t('plugins_page.section_core')}
            </h2>
            <div className="flex flex-col gap-2">
              {coreModules.map((p) => (
                <PluginCard key={p.id} plugin={p} />
              ))}
            </div>
          </section>
        )}

        {(plugins ?? []).length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Package size={32} className="text-[var(--lx-text-muted)] opacity-40" />
            <p className="text-sm text-[var(--lx-text-muted)]">
              {t('plugins_page.no_modules')}
            </p>
            <button onClick={() => setShowInstall(true)} className="lx-btn lx-btn--primary">
              {t('plugins_page.install_first')}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Marketplace tab ──────────────────────────────────────────────────────────

interface CustomRepo {
  id: string
  repo_url: string
  name?: string
  description?: string
  enabled?: boolean
  has_token?: boolean
}

function MarketplaceTab() {
  const { t } = useTranslation('ui')
  const queryClient = useQueryClient()
  const [installPlugin, setInstallPlugin] = useState<MarketplacePlugin | null>(null)
  const [upgradePlugin, setUpgradePlugin] = useState<PluginOut | null>(null)
  const [newRepoUrl, setNewRepoUrl] = useState('')

  const { data: marketplace } = useQuery({
    queryKey: ['marketplace'],
    queryFn: () =>
      apiFetch<{ plugins: MarketplacePlugin[] }>('/api/plugins/marketplace').then(
        (r) => r.plugins,
      ),
  })

  const { data: installedPlugins } = useQuery({
    queryKey: ['plugins'],
    queryFn: () => apiFetch<{ plugins: PluginOut[] }>('/api/plugins').then((r) => r.plugins),
  })

  const { data: customRepos } = useQuery({
    queryKey: ['custom-repos'],
    queryFn: () =>
      apiFetch<{ repos: CustomRepo[] }>('/api/plugins/custom-repos').then((r) => r.repos),
  })

  const addRepoMutation = useMutation({
    mutationFn: (url: string) =>
      apiFetch('/api/plugins/custom-repos', {
        method: 'POST',
        body: JSON.stringify({ repo_url: url }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['custom-repos'] })
      void queryClient.invalidateQueries({ queryKey: ['marketplace'] })
      setNewRepoUrl('')
      toast.success(t('plugins_page.repo_added'))
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t('plugins_page.repo_add_failed'))
    },
  })

  const removeRepoMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/plugins/custom-repos/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['custom-repos'] })
      void queryClient.invalidateQueries({ queryKey: ['marketplace'] })
    },
  })

  const installedByUrl = new Map(
    (installedPlugins ?? [])
      .filter((p) => p.repo_url)
      .map((p) => [p.repo_url!, p]),
  )

  return (
    <>
      {installPlugin && (
        <InstallDialog
          initialRepoUrl={installPlugin.repo_url}
          onClose={() => setInstallPlugin(null)}
        />
      )}
      {upgradePlugin && (
        <UpgradeDialog plugin={upgradePlugin} onClose={() => setUpgradePlugin(null)} />
      )}

      {/* Available plugins */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--lx-text-muted)] mb-3">
          {t('plugins_page.marketplace_available')}
        </h2>

        {!marketplace && (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-[var(--lx-accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {marketplace && marketplace.length === 0 && (
          <p className="text-sm text-[var(--lx-text-muted)] py-6 text-center">
            {t('plugins_page.marketplace_empty')}
          </p>
        )}

        {marketplace && marketplace.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {marketplace.map((mp) => {
              const Icon = getPluginIcon(mp.icon)
              const installedEntry = installedByUrl.get(mp.repo_url)
              const isInstalled = !!installedEntry

              return (
                <div
                  key={mp.repo_url}
                  className="rounded-xl bg-[var(--lx-surface-glass)] backdrop-blur-[16px] backdrop-saturate-150 border border-[var(--lx-border-soft)] overflow-hidden transition-colors hover:border-[var(--lx-border)]"
                >
                  <div className="p-4 flex gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-[var(--lx-accent-2)]"
                      style={{
                        background: 'color-mix(in srgb, var(--lx-accent-2) 12%, transparent)',
                      }}
                    >
                      <Icon size={20} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-[var(--lx-text)]">{mp.name}</p>
                        {mp.version && (
                          <span className="text-[10px] text-[var(--lx-text-muted)] font-mono shrink-0">
                            v{mp.version}
                          </span>
                        )}
                      </div>
                      {mp.author && (
                        <p className="text-[11px] text-[var(--lx-text-muted)] mt-0.5">
                          {mp.author}
                        </p>
                      )}
                      {mp.description && (
                        <p className="text-xs text-[var(--lx-text-muted)] mt-1.5 line-clamp-2">
                          {mp.description}
                        </p>
                      )}
                      {mp.tags && mp.tags.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {mp.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--lx-elevated-glass)] text-[var(--lx-text-muted)]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--lx-border-soft)] bg-[var(--lx-elevated-glass)]/40">
                    {isInstalled && installedEntry ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-[var(--lx-state-up)]">
                        <Check size={12} />
                        <span>{t('plugins_page.installed_badge')}</span>
                        <span className="font-mono px-1.5 py-0.5 rounded bg-[var(--lx-state-up)]/10">
                          v{installedEntry.version}
                        </span>
                      </span>
                    ) : (
                      <span />
                    )}

                    {isInstalled && installedEntry ? (
                      <button
                        onClick={() => setUpgradePlugin(installedEntry)}
                        className="lx-btn lx-btn--secondary lx-btn--sm"
                      >
                        {t('plugins_page.change_version')}
                      </button>
                    ) : (
                      <button onClick={() => setInstallPlugin(mp)} className="lx-btn lx-btn--primary lx-btn--sm">
                        {t('plugins_page.install_btn')}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Custom repos */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--lx-text-muted)] mb-3">
          {t('plugins_page.custom_repos')}
        </h2>

        <div className="rounded-xl bg-[var(--lx-surface-glass)] backdrop-blur-[16px] backdrop-saturate-150 border border-[var(--lx-border-soft)] overflow-hidden transition-colors hover:border-[var(--lx-border)]">
          {(customRepos ?? []).length > 0 && (
            <div className="divide-y divide-[var(--lx-border-soft)]">
              {(customRepos ?? []).map((repo) => (
                <div key={repo.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    {repo.name && (
                      <p className="text-xs font-medium text-[var(--lx-text)] mb-0.5">
                        {repo.name}
                      </p>
                    )}
                    <p className="text-xs font-mono text-[var(--lx-text-muted)] truncate">
                      {repo.repo_url}
                    </p>
                  </div>
                  {repo.has_token && (
                    <span className="text-[10px] text-[var(--lx-accent)] px-1.5 py-0.5 rounded border border-[var(--lx-accent)]/30 shrink-0">
                      Token
                    </span>
                  )}
                  <button
                    onClick={() => removeRepoMutation.mutate(repo.id)}
                    disabled={removeRepoMutation.isPending}
                    className="text-xs text-[var(--lx-text-muted)] hover:text-[var(--lx-state-down)] transition-colors shrink-0 p-1"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {(customRepos ?? []).length === 0 && (
            <p className="text-xs text-[var(--lx-text-muted)] px-4 pt-4 pb-0">
              {t('plugins_page.no_custom_repos')}
            </p>
          )}

          <div className="flex gap-2 px-4 pb-4 pt-3">
            <input
              type="text"
              value={newRepoUrl}
              onChange={(e) => setNewRepoUrl(e.target.value)}
              placeholder="https://github.com/org/lyndrix-plugin-collection"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newRepoUrl.trim())
                  addRepoMutation.mutate(newRepoUrl.trim())
              }}
              className={`${inputCls} flex-1 text-xs`}
            />
            <button
              onClick={() => {
                if (newRepoUrl.trim()) addRepoMutation.mutate(newRepoUrl.trim())
              }}
              disabled={!newRepoUrl.trim() || addRepoMutation.isPending}
              className="lx-btn lx-btn--primary lx-btn--sm shrink-0"
            >
              {t('plugins_page.add_repo')}
            </button>
          </div>
        </div>
      </section>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PluginsPage() {
  const { t } = useTranslation('ui')
  const [tab, setTab] = useState('installed')

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 md:px-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--lx-text)]">{t('plugins_page.page_title')}</h1>
        <p className="text-sm text-[var(--lx-text-muted)] mt-1">
          {t('plugins_page.page_subtitle')}
        </p>
      </div>

      <Tabs
        tabs={[
          { id: 'installed', label: t('plugins_page.tab_installed') },
          { id: 'marketplace', label: t('plugins_page.tab_marketplace') },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'installed' && <InstalledTab />}
      {tab === 'marketplace' && <MarketplaceTab />}
    </div>
  )
}
