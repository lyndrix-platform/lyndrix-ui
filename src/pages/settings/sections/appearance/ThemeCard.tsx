import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Cloud, Monitor, Palette, Trash2, Upload } from 'lucide-react'
import { apiFetch, getToken, clearToken, ApiError } from '../../../../lib/api'
import { getSelectedThemeId, getThemeVars } from '../../../../lib/themeStore'
import { useTheme } from '../../../../theme/ThemeProvider'
import { ACCOUNT_SCOPE_ENABLED } from '../../../../lib/preferences'
import { toast } from '../../../../lib/toast'
import type { ThemeOut } from '../../../../lib/types'
import { Card, SectionTitle, inputCls } from '../../shared'

type ApplyMode = 'both' | 'separate'
/** A staged activation that mutates the global (all-users) NiceGUI theme. */
interface PendingActivate {
  id: string
  /** 'both' also pins the React browser theme to the same id after confirm. */
  target: 'both' | 'nicegui'
}

function themeIds(themes: ThemeOut[] | undefined): string[] {
  return (themes ?? []).map((t) => (typeof t === 'string' ? t : t.id))
}

/** Best-effort accent swatch for a theme, from its cached css-vars (may be null). */
function themeSwatch(id: string): string {
  const v = getThemeVars(id)
  return v?.dark?.['--lx-accent'] ?? 'var(--lx-border-soft)'
}

/**
 * Theme selection card. Replaces the old dual App/Server pickers with a single
 * "Apply to" model:
 *   • Both     → one theme drives React (browser pin) AND NiceGUI (PUT active).
 *   • Separate → React row pins locally (localStorage only); NiceGUI row calls
 *                PUT /api/themes/active (all-users) behind an inline confirm.
 * The scope pills (System default / My account / This browser) belong to the
 * React row in Separate mode. My account is a disabled Phase-2 seam.
 */
export default function ThemeCard() {
  const { t } = useTranslation('ui')
  const {
    selectedThemeId,
    setSelectedTheme,
    unpinTheme,
    refreshTheme,
    accountSelection,
    setAccountThemeSelection,
    clearAccountThemeSelection,
  } = useTheme()
  const qc = useQueryClient()
  const [, setSearchParams] = useSearchParams()

  // Open the live Theme Editor by adding the `editor=theme` param, pre-loading
  // the currently pinned theme as the editing base. AppearanceSection portals it.
  function openEditor() {
    setSearchParams((prev) => {
      prev.set('editor', 'theme')
      prev.set('base', selectedThemeId)
      return prev
    })
  }

  const { data: themes } = useQuery({
    queryKey: ['themes'],
    queryFn: () => apiFetch<{ themes: ThemeOut[] }>('/api/themes').then((r) => r.themes),
  })
  const { data: activeTheme } = useQuery({
    queryKey: ['theme-active'],
    queryFn: () => apiFetch<{ theme_id: string }>('/api/themes/active').then((r) => r.theme_id),
  })

  // Whether the React theme is explicitly pinned in this browser (vs following
  // the server active theme). Tracked locally because only this component mutates
  // the pin during step 2.
  const [isPinned, setIsPinned] = useState<boolean>(() => getSelectedThemeId() !== null)

  const [applyMode, setApplyMode] = useState<ApplyMode>('both')
  const initedMode = useRef(false)
  // Resolve the initial Apply-to mode once the server active theme is known:
  // "Both" when the browser has no pin OR the pin equals the server theme.
  useEffect(() => {
    if (initedMode.current || activeTheme === undefined) return
    const pin = getSelectedThemeId()
    setApplyMode(pin === null || pin === activeTheme ? 'both' : 'separate')
    initedMode.current = true
  }, [activeTheme])

  const [pending, setPending] = useState<PendingActivate | null>(null)
  const [manageOpen, setManageOpen] = useState(false)
  // Set once a write (upload/activate/delete) is denied → hides those affordances.
  const [writeDenied, setWriteDenied] = useState(false)

  const ids = themeIds(themes)

  const activateMut = useMutation({
    mutationFn: (id: string) =>
      apiFetch('/api/themes/active', {
        method: 'PUT',
        body: JSON.stringify({ theme_id: id }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['theme-active'] }),
    onError: (e) => handleWriteError(e),
  })

  function handleWriteError(e: unknown) {
    if (e instanceof ApiError && e.status === 403) {
      setWriteDenied(true)
      toast.error(
        t('appearance.write_denied', {
          defaultValue: 'You do not have permission to change server themes.',
        }),
      )
      return
    }
    toast.error(e instanceof Error ? e.message : t('common.error'))
  }

  // ── React-row scope actions ─────────────────────────────────────────────────
  // Source resolution for the React UI (matches ThemeProvider's precedence):
  //   browser pin  →  account selection (cross-device)  →  system default.
  const source: 'browser' | 'account' | 'system' = isPinned
    ? 'browser'
    : accountSelection.react
      ? 'account'
      : 'system'

  function pinReactTheme(id: string) {
    setSelectedTheme(id)
    setIsPinned(true)
  }
  function unpinReactTheme() {
    unpinTheme()
    setIsPinned(false)
  }
  // "System default": drop the browser pin AND the account selection so the row
  // falls all the way back to the server active theme.
  function useSystemDefault() {
    unpinReactTheme()
    clearAccountThemeSelection('react')
    clearAccountThemeSelection('nicegui')
  }
  // "My account": persist the current theme as the account selection (React is
  // consumed live; NiceGUI is mirrored so a cross-device NiceGUI session picks up
  // the same theme) and drop the browser pin so the account selection wins.
  function useAccount() {
    setAccountThemeSelection('react', selectedThemeId)
    setAccountThemeSelection('nicegui', selectedThemeId)
    setIsPinned(false)
  }

  // ── All-users confirm flow (the ONLY path that PUTs /api/themes/active) ──────
  function confirmPending() {
    if (!pending) return
    activateMut.mutate(pending.id)
    if (pending.target === 'both') pinReactTheme(pending.id)
    setPending(null)
  }

  // Theme <select> handler for the Both-mode single row.
  function onBothSelect(id: string) {
    if (id === activeTheme && id === selectedThemeId) return
    setPending({ id, target: 'both' })
  }
  // Theme <select> handler for the Separate-mode NiceGUI row.
  function onNiceGuiSelect(id: string) {
    if (id === activeTheme) return
    setPending({ id, target: 'nicegui' })
  }

  const effectiveSource =
    source === 'browser'
      ? t('appearance.src_pinned', {
          defaultValue: '{{id}} — pinned in this browser',
          id: selectedThemeId,
        })
      : source === 'account'
        ? t('appearance.src_account', {
            defaultValue: '{{id}} — following my account (syncs across devices)',
            id: selectedThemeId,
          })
        : t('appearance.src_following', {
            defaultValue: '{{id}} — following server default',
            id: selectedThemeId,
          })

  return (
    <Card>
      <SectionTitle>{t('appearance.theme', { defaultValue: 'Theme' })}</SectionTitle>

      {/* Apply-to radio */}
      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        {(['both', 'separate'] as const).map((m) => {
          const active = applyMode === m
          const label =
            m === 'both'
              ? t('appearance.apply_both', { defaultValue: 'Both UIs' })
              : t('appearance.apply_separate', { defaultValue: 'Separate per UI' })
          const hint =
            m === 'both'
              ? t('appearance.apply_both_hint', {
                  defaultValue: 'One theme for the whole platform.',
                })
              : t('appearance.apply_separate_hint', {
                  defaultValue: 'Pick a theme for this browser and the server independently.',
                })
          return (
            <button
              key={m}
              onClick={() => setApplyMode(m)}
              className={[
                'flex-1 text-left px-4 py-3 rounded-lg border transition-colors',
                active
                  ? 'border-[var(--lx-accent)] bg-[var(--lx-accent)]/5'
                  : 'border-[var(--lx-border-soft)] bg-[var(--lx-elevated)] hover:border-[var(--lx-accent)]/40',
              ].join(' ')}
            >
              <span className="flex items-center gap-2 text-sm font-medium text-[var(--lx-text)]">
                <span
                  className={[
                    'inline-grid place-items-center w-4 h-4 rounded-full border',
                    active
                      ? 'border-[var(--lx-accent)]'
                      : 'border-[var(--lx-border-soft)]',
                  ].join(' ')}
                >
                  {active && <span className="w-2 h-2 rounded-full bg-[var(--lx-accent)]" />}
                </span>
                {label}
              </span>
              <span className="block mt-1 text-[11px] text-[var(--lx-text-muted)] pl-6">
                {hint}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── BOTH: one row drives everything ── */}
      {applyMode === 'both' && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-[var(--lx-text-muted)]">
            {t('appearance.theme_both_label', { defaultValue: 'Theme (all UIs)' })}
          </label>
          <select
            className={inputCls}
            value={selectedThemeId}
            onChange={(e) => onBothSelect(e.target.value)}
          >
            {ids.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-[var(--lx-warning)]">
            ⚠️{' '}
            {t('appearance.theme_both_warn', {
              defaultValue: 'Changing this updates the server default for all users.',
            })}
          </p>
        </div>
      )}

      {/* ── SEPARATE: React row (browser) + NiceGUI row (server) ── */}
      {applyMode === 'separate' && (
        <div className="flex flex-col gap-5">
          {/* React UI row */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--lx-text-muted)]">
              <Monitor size={13} />
              {t('appearance.react_ui', { defaultValue: 'This interface (React)' })}
            </label>
            <select
              className={inputCls}
              value={selectedThemeId}
              onChange={(e) => pinReactTheme(e.target.value)}
            >
              {ids.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
            {/* Scope pills — precedence: This browser > My account > System default */}
            <div className="flex flex-wrap gap-2 mt-1">
              <ScopePill active={source === 'system'} onClick={useSystemDefault}>
                {t('appearance.scope_system', { defaultValue: 'System default' })}
              </ScopePill>
              <ScopePill
                active={source === 'account'}
                disabled={!ACCOUNT_SCOPE_ENABLED}
                onClick={ACCOUNT_SCOPE_ENABLED ? useAccount : undefined}
                title={t('appearance.scope_account_hint', {
                  defaultValue: 'Follow this theme on all your devices',
                })}
              >
                <Cloud size={12} />
                {t('appearance.scope_account', { defaultValue: 'My account' })}
              </ScopePill>
              <ScopePill active={source === 'browser'} onClick={() => pinReactTheme(selectedThemeId)}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {t('appearance.scope_browser', { defaultValue: 'This browser' })}
              </ScopePill>
            </div>
            <p className="text-[11px] text-[var(--lx-text-muted)]">{effectiveSource}</p>
          </div>

          {/* NiceGUI (server) row */}
          <div className="flex flex-col gap-2 border-t border-[var(--lx-border-soft)] pt-4">
            <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--lx-text-muted)]">
              <Monitor size={13} />
              {t('appearance.nicegui_ui', { defaultValue: 'Server UI (NiceGUI)' })}
            </label>
            <select
              className={inputCls}
              value={activeTheme ?? ''}
              onChange={(e) => onNiceGuiSelect(e.target.value)}
            >
              {ids.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-[var(--lx-warning)]">
              ⚠️{' '}
              {t('appearance.nicegui_warn', {
                defaultValue: 'System default (all users).',
              })}
            </p>
          </div>
        </div>
      )}

      {/* Inline all-users confirm (shared by Both-select and NiceGUI-select) */}
      {pending && (
        <div className="mt-4 p-3 rounded-md bg-[var(--lx-elevated)] border border-[var(--lx-warning)]/40 text-sm">
          <p className="text-[var(--lx-text)] mb-2">
            {t('appearance.confirm_all_users', {
              defaultValue: 'Apply "{{id}}" as the server default for all users?',
              id: pending.id,
            })}
          </p>
          <div className="flex gap-2">
            <button
              onClick={confirmPending}
              className="lx-btn lx-btn--primary lx-btn--sm"
              disabled={activateMut.isPending}
            >
              {t('appearance.confirm_apply', { defaultValue: 'Apply for all' })}
            </button>
            <button
              onClick={() => setPending(null)}
              className="lx-btn lx-btn--ghost lx-btn--sm"
            >
              {t('appearance.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 mt-5">
        <button className="lx-btn lx-btn--secondary lx-btn--sm" onClick={openEditor}>
          <Palette size={14} className="mr-1.5 inline" />
          {t('appearance.open_editor', { defaultValue: 'Open Theme Editor' })}
        </button>
        <button
          className="lx-btn lx-btn--ghost lx-btn--sm"
          onClick={() => setManageOpen((v) => !v)}
        >
          {t('appearance.manage_themes', { defaultValue: 'Manage themes' })}
          <ChevronDown
            size={14}
            className={`ml-1 inline transition-transform ${manageOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {manageOpen && (
        <ManageThemes
          ids={ids}
          activeTheme={activeTheme}
          writeDenied={writeDenied}
          onWriteError={handleWriteError}
          onDeny={() => setWriteDenied(true)}
          onChanged={() => {
            qc.invalidateQueries({ queryKey: ['themes'] })
            qc.invalidateQueries({ queryKey: ['theme-active'] })
            refreshTheme()
          }}
        />
      )}
    </Card>
  )
}

// ── Scope pill ─────────────────────────────────────────────────────────────────

function ScopePill({
  active,
  disabled,
  title,
  onClick,
  children,
}: {
  active: boolean
  disabled?: boolean
  title?: string
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={[
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors',
        disabled
          ? 'border-[var(--lx-border-soft)] text-[var(--lx-text-subtle)] opacity-50 cursor-not-allowed'
          : active
            ? 'border-[var(--lx-accent)] bg-[var(--lx-accent)]/10 text-[var(--lx-accent)]'
            : 'border-[var(--lx-border-soft)] text-[var(--lx-text-muted)] hover:text-[var(--lx-text)] hover:border-[var(--lx-accent)]/40',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

// ── Manage themes disclosure (upload + per-theme delete) ─────────────────────────

function ManageThemes({
  ids,
  activeTheme,
  writeDenied,
  onWriteError,
  onDeny,
  onChanged,
}: {
  ids: string[]
  activeTheme: string | undefined
  writeDenied: boolean
  onWriteError: (e: unknown) => void
  onDeny: () => void
  onChanged: () => void
}) {
  const { t } = useTranslation('ui')
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleUpload(file: File) {
    setUploadStatus(null)
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const token = getToken()
      const r = await fetch('/api/themes', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      })
      if (r.status === 401) {
        clearToken()
        window.location.href = '/login'
        return
      }
      if (r.status === 403) {
        onDeny()
        toast.error(
          t('appearance.write_denied', {
            defaultValue: 'You do not have permission to change server themes.',
          }),
        )
        return
      }
      if (!r.ok) {
        const body = await r.json().catch(() => ({ detail: r.statusText }))
        throw new Error((body as { detail?: string })?.detail ?? r.statusText)
      }
      setUploadStatus(t('appearance.uploaded'))
      toast.success(t('appearance.uploaded'))
      onChanged()
    } catch (e) {
      setUploadStatus(e instanceof Error ? e.message : t('appearance.upload_failed'))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiFetch(`/api/themes/${encodeURIComponent(id)}`, { method: 'DELETE' })
      setDeleteConfirm(null)
      onChanged()
    } catch (e) {
      setDeleteConfirm(null)
      onWriteError(e)
    }
  }

  return (
    <div className="mt-4 border-t border-[var(--lx-border-soft)] pt-4 flex flex-col gap-3">
      {/* Theme list */}
      <div className="flex flex-col gap-1.5">
        {ids.map((id) => {
          const immutable = id === 'default'
          return (
            <div
              key={id}
              className="flex items-center justify-between px-3 py-2 rounded-md border border-[var(--lx-border-soft)] bg-[var(--lx-elevated)] text-sm"
            >
              <span className="flex items-center gap-2 min-w-0">
                <span
                  className="shrink-0 w-4 h-4 rounded-full border border-[var(--lx-border-soft)]"
                  style={{ background: themeSwatch(id) }}
                />
                <span className="truncate text-[var(--lx-text)]">{id}</span>
                {id === activeTheme && (
                  <span className="text-[10px] uppercase tracking-wide text-[var(--lx-accent)]">
                    {t('appearance.badge_active')}
                  </span>
                )}
              </span>
              {!immutable && !writeDenied && (
                <button
                  className="text-[var(--lx-text-muted)] hover:text-[var(--lx-state-down)] p-1"
                  title={t('appearance.delete')}
                  onClick={() => setDeleteConfirm(id)}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {deleteConfirm && (
        <div className="p-3 rounded-md bg-[var(--lx-elevated)] border border-[var(--lx-state-down)]/30 text-sm">
          <p className="text-[var(--lx-text)] mb-2">
            {t('appearance.confirm_delete', { name: deleteConfirm })}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleDelete(deleteConfirm)}
              className="px-3 py-1 rounded text-xs bg-[var(--lx-state-down)] text-white"
            >
              {t('appearance.delete')}
            </button>
            <button
              onClick={() => setDeleteConfirm(null)}
              className="px-3 py-1 rounded text-xs text-[var(--lx-text-muted)]"
            >
              {t('appearance.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Upload */}
      {!writeDenied && (
        <div>
          <p className="text-[11px] text-[var(--lx-text-muted)] mb-2">
            {t('appearance.upload_short', {
              defaultValue: 'Upload a theme ZIP (tokens.json + components.json).',
            })}
          </p>
          <label
            className={`lx-btn lx-btn--secondary lx-btn--sm cursor-pointer ${
              busy ? 'opacity-60 pointer-events-none' : ''
            }`}
          >
            <Upload size={14} className="mr-1.5 inline" />
            {busy ? t('common.saving') : t('appearance.upload_theme')}
            <input
              type="file"
              accept=".zip"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleUpload(f)
                e.target.value = ''
              }}
            />
          </label>
          {uploadStatus && (
            <p className="mt-2 text-xs text-[var(--lx-text-muted)]">{uploadStatus}</p>
          )}
        </div>
      )}
    </div>
  )
}
