import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import i18nInstance from '../../../lib/i18n'
import { Moon, Sun } from 'lucide-react'
import { apiFetch, getToken, clearToken } from '../../../lib/api'
import { LANG_KEY, loadCatalog, useSupportedLanguages } from '../../../lib/i18n'
import { useTheme } from '../../../theme/ThemeProvider'
import type { ThemeOut } from '../../../lib/types'
import { Card, SectionTitle } from '../shared'
import GlassSurface from '../../../components/GlassSurface'
import {
  useGlassConfig,
  setGlassConfig,
  resetGlassConfig,
  type GlassMode,
} from '../../../lib/glassConfig'

export default function AppearanceSection(_: {
  config: Record<string, unknown>
  envLocked: string[]
}) {
  const { t } = useTranslation('ui')
  const { themeId, setTheme, selectedThemeId, setSelectedTheme, refreshTheme } = useTheme()
  const qc = useQueryClient()
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const { data: themes } = useQuery({
    queryKey: ['themes'],
    queryFn: () => apiFetch<{ themes: ThemeOut[] }>('/api/themes').then((r) => r.themes),
  })

  const { data: activeTheme } = useQuery({
    queryKey: ['theme-active'],
    queryFn: () => apiFetch<{ theme_id: string }>('/api/themes/active').then((r) => r.theme_id),
  })

  const activateMut = useMutation({
    mutationFn: (themeId: string) =>
      apiFetch('/api/themes/active', {
        method: 'PUT',
        body: JSON.stringify({ theme_id: themeId }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['theme-active'] }),
  })

  const deleteMut = useMutation({
    mutationFn: (themeId: string) => apiFetch(`/api/themes/${themeId}`, { method: 'DELETE' }),
    onSuccess: () => {
      setDeleteConfirm(null)
      qc.invalidateQueries({ queryKey: ['themes'] })
      qc.invalidateQueries({ queryKey: ['theme-active'] })
    },
  })

  async function handleUpload(file: File) {
    setUploadStatus(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
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
      if (!r.ok) {
        const body = await r.json().catch(() => ({ detail: r.statusText }))
        throw new Error((body as { detail?: string })?.detail ?? r.statusText)
      }
      setUploadStatus(t('appearance.uploaded'))
      qc.invalidateQueries({ queryKey: ['themes'] })
      refreshTheme()
    } catch (e) {
      setUploadStatus(e instanceof Error ? e.message : t('appearance.upload_failed'))
    }
  }

  const currentLang = i18nInstance.language
  const { supported } = useSupportedLanguages()

  // Endonyms for the languages we expect; falls back to the code for any other
  // locale core may advertise.
  const LANG_ENDONYMS: Record<string, string> = { de: 'Deutsch', en: 'English' }

  async function handleLangChange(lang: string) {
    // Ensure the new locale's catalog is loaded/cached before switching, so the
    // UI doesn't flash untranslated keys.
    await loadCatalog(lang)
    await i18nInstance.changeLanguage(lang)
    try {
      localStorage.setItem(LANG_KEY, lang)
    } catch {
      // best-effort persistence
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Dark / Light mode */}
      <Card>
        <SectionTitle>{t('appearance.color_scheme')}</SectionTitle>
        <div className="flex gap-2 mt-1">
          {(['dark', 'light'] as const).map((id) => {
            const Icon = id === 'dark' ? Moon : Sun
            const label = id === 'dark' ? t('appearance.dark') : t('appearance.light')
            const isActive = themeId === id
            return (
              <button
                key={id}
                onClick={() => setTheme(id)}
                className={[
                  'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
                  isActive
                    ? 'border-[var(--lx-accent)] bg-[var(--lx-accent)]/10 text-[var(--lx-accent)]'
                    : 'border-[var(--lx-border-soft)] bg-[var(--lx-elevated)] text-[var(--lx-text-muted)] hover:text-[var(--lx-text)] hover:border-[var(--lx-accent)]/40',
                ].join(' ')}
              >
                <Icon size={15} />
                {label}
              </button>
            )
          })}
        </div>
      </Card>

      {/* Language */}
      <Card>
        <SectionTitle>{t('appearance.language')}</SectionTitle>
        <div className="flex gap-2 mt-1">
          {supported.map((lang) => {
            const label = LANG_ENDONYMS[lang] ?? lang.toUpperCase()
            const isActive = currentLang === lang
            return (
              <button
                key={lang}
                onClick={() => void handleLangChange(lang)}
                className={[
                  'px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
                  isActive
                    ? 'border-[var(--lx-accent)] bg-[var(--lx-accent)]/10 text-[var(--lx-accent)]'
                    : 'border-[var(--lx-border-soft)] bg-[var(--lx-elevated)] text-[var(--lx-text-muted)] hover:text-[var(--lx-text)] hover:border-[var(--lx-accent)]/40',
                ].join(' ')}
              >
                {label}
              </button>
            )
          })}
        </div>
      </Card>

      {/* App theme (React UI) — independent of the NiceGUI active theme */}
      <Card>
        <SectionTitle>{t('appearance.app_theme', { defaultValue: 'App theme' })}</SectionTitle>
        <p className="text-xs text-[var(--lx-text-muted)] mb-2">
          {t('appearance.app_theme_hint', {
            defaultValue: 'Theme applied to this interface. Can differ from the server theme.',
          })}
        </p>
        <div className="flex flex-col gap-2">
          {(themes ?? []).map((t_) => {
            const tid = typeof t_ === 'string' ? t_ : (t_ as ThemeOut).id
            const isActive = tid === selectedThemeId
            return (
              <div
                key={tid}
                className={`flex items-center justify-between px-4 py-2.5 rounded-md border text-sm cursor-pointer transition-colors ${
                  isActive
                    ? 'border-[var(--lx-accent)] bg-[var(--lx-accent)]/5 text-[var(--lx-accent)]'
                    : 'border-[var(--lx-border-soft)] bg-[var(--lx-elevated)] text-[var(--lx-text)] hover:border-[var(--lx-accent)]/40'
                }`}
                onClick={() => !isActive && setSelectedTheme(tid)}
              >
                <span className="capitalize">{tid}</span>
                {isActive && (
                  <span className="text-[10px] uppercase tracking-wide text-[var(--lx-accent)]">
                    {t('appearance.badge_active')}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Personalization — per-mode --lx-* colour overrides on top of the theme */}
      <BackgroundCard />

      <PersonalizationCard />

      {/* Liquid-glass effect controls */}
      <GlassEffectCard />

      {/* Server-side NiceGUI theme */}
      <Card>
        <SectionTitle>{t('appearance.server_theme')}</SectionTitle>
        <div className="flex flex-col gap-2">
          {(themes ?? []).map((t_) => {
            const tid = typeof t_ === 'string' ? t_ : (t_ as ThemeOut).id
            const isActive = tid === activeTheme
            return (
              <div
                key={tid}
                className={`flex items-center justify-between px-4 py-2.5 rounded-md border text-sm cursor-pointer transition-colors ${
                  isActive
                    ? 'border-[var(--lx-accent)] bg-[var(--lx-accent)]/5 text-[var(--lx-accent)]'
                    : 'border-[var(--lx-border-soft)] bg-[var(--lx-elevated)] text-[var(--lx-text)] hover:border-[var(--lx-accent)]/40'
                }`}
                onClick={() => !isActive && activateMut.mutate(tid)}
              >
                <span className="capitalize">{tid}</span>
                <div className="flex items-center gap-2">
                  {isActive && (
                    <span className="text-[10px] uppercase tracking-wide text-[var(--lx-accent)]">
                      {t('appearance.badge_active')}
                    </span>
                  )}
                  {tid !== 'default' && (
                    <span
                      role="button"
                      className="text-[var(--lx-text-muted)] hover:text-[var(--lx-state-down)] text-xs px-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteConfirm(tid)
                      }}
                    >
                      ✕
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {deleteConfirm && (
          <div className="mt-3 p-3 rounded-md bg-[var(--lx-elevated)] border border-[var(--lx-state-down)]/30 text-sm">
            <p className="text-[var(--lx-text)] mb-2">
              {t('appearance.confirm_delete', { name: deleteConfirm })}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => deleteMut.mutate(deleteConfirm)}
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
      </Card>

      {/* Upload */}
      <Card>
        <SectionTitle>{t('appearance.upload_theme')}</SectionTitle>
        <p className="text-xs text-[var(--lx-text-muted)] mb-3">
          {t('appearance.upload_hint').split('tokens.json').map((part, i, arr) =>
            i < arr.length - 1 ? (
              <>
                {part}
                <code className="text-[var(--lx-accent)]">tokens.json</code>
              </>
            ) : (
              part.split('components.json').map((p, j, a) =>
                j < a.length - 1 ? (
                  <>
                    {p}
                    <code className="text-[var(--lx-accent)]">components.json</code>
                  </>
                ) : (
                  p
                ),
              )
            ),
          )}
        </p>
        <input
          type="file"
          accept=".zip"
          className="text-sm text-[var(--lx-text-muted)]"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleUpload(f)
          }}
        />
        {uploadStatus && (
          <p className="mt-2 text-xs text-[var(--lx-text-muted)]">{uploadStatus}</p>
        )}
      </Card>
    </div>
  )
}

// ── Personalization ───────────────────────────────────────────────────────────

// Curated set of solid-colour --lx-* tokens that make sense to pick directly
// (composited tokens like borders/glow are derived and intentionally omitted).
const SWATCHES: { var: string; key: string; def: string }[] = [
  { var: '--lx-accent', key: 'accent', def: 'Primary' },
  { var: '--lx-accent-2', key: 'accent2', def: 'Secondary' },
  { var: '--lx-accent-3', key: 'accent3', def: 'Tertiary' },
  { var: '--lx-bg', key: 'bg', def: 'Background' },
  { var: '--lx-surface', key: 'surface', def: 'Surface' },
  { var: '--lx-text', key: 'text', def: 'Text' },
  { var: '--lx-state-up', key: 'success', def: 'Success' },
  { var: '--lx-state-down', key: 'danger', def: 'Danger' },
  { var: '--lx-state-paused', key: 'warning', def: 'Warning' },
]

/** Normalize a computed colour value (#rgb, #rrggbb, rgb()/rgba()) to #rrggbb for <input type="color">. */
function toHex(value: string): string {
  const v = value.trim()
  if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase()
  if (/^#[0-9a-f]{3}$/i.test(v)) return ('#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3]).toLowerCase()
  const m = v.match(/^rgba?\(([^)]+)\)/i)
  if (m) {
    const [r, g, b] = m[1].split(',').map((x) => parseFloat(x))
    const h = (n: number) => Math.max(0, Math.min(255, Math.round(n || 0))).toString(16).padStart(2, '0')
    return ('#' + h(r) + h(g) + h(b)).toLowerCase()
  }
  return '#000000'
}

function PersonalizationCard() {
  const { t } = useTranslation('ui')
  const { themeId, personal, setPersonalColor, clearPersonalColor, resetPersonal } = useTheme()
  const overrides = personal[themeId]
  const anyOverride =
    Object.keys(personal.light).length > 0 || Object.keys(personal.dark).length > 0

  // Effective value: an explicit override wins; otherwise the live computed token
  // (which reflects the selected theme for the current mode).
  const effective = (varName: string): string => {
    const o = overrides[varName]
    if (o) return o
    return toHex(getComputedStyle(document.documentElement).getPropertyValue(varName))
  }

  return (
    <Card>
      <SectionTitle>{t('appearance.personalize', { defaultValue: 'Personalize colors' })}</SectionTitle>
      <p className="text-xs text-[var(--lx-text-muted)] mb-3">
        {t('appearance.personalize_hint', {
          defaultValue:
            'Override individual colors on top of the selected theme. Applies to the current mode ({{mode}}).',
          mode: t(themeId === 'dark' ? 'appearance.dark' : 'appearance.light'),
        })}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {SWATCHES.map((s) => {
          const isOver = s.var in overrides
          const val = effective(s.var)
          return (
            <div key={s.var} className="flex items-center gap-2.5">
              <label
                className="relative shrink-0 w-9 h-9 rounded-lg border border-[var(--lx-border-soft)] cursor-pointer"
                style={{ background: val }}
                title={val}
              >
                <input
                  type="color"
                  value={val}
                  onChange={(e) => setPersonalColor(themeId, s.var, e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </label>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-[var(--lx-text)] truncate">
                  {t(`appearance.color.${s.key}`, { defaultValue: s.def })}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-[var(--lx-text-muted)]">{val}</span>
                  {isOver && (
                    <button
                      onClick={() => clearPersonalColor(themeId, s.var)}
                      className="text-[10px] text-[var(--lx-accent)] hover:underline"
                    >
                      {t('appearance.reset_color', { defaultValue: 'Reset' })}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {anyOverride && (
        <button onClick={resetPersonal} className="lx-btn lx-btn--ghost lx-btn--sm mt-4">
          {t('appearance.reset_all', { defaultValue: 'Reset all personalization' })}
        </button>
      )}
    </Card>
  )
}

// ── Background image ──────────────────────────────────────────────────────────

function BackgroundCard() {
  const { t } = useTranslation('ui')
  const { themeId, userBg, refreshUserBg } = useTheme()
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const hasCustom = !!userBg[themeId]
  const modeLabel = t(themeId === 'dark' ? 'appearance.dark' : 'appearance.light')

  async function upload(file: File) {
    setBusy(true)
    setStatus(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const token = getToken()
      const r = await fetch(`/api/me/background?mode=${themeId}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      })
      if (!r.ok) {
        const b = await r.json().catch(() => null)
        throw new Error((b && (b.detail as string)) || `HTTP ${r.status}`)
      }
      refreshUserBg()
      setStatus(t('appearance.bg_uploaded', { defaultValue: 'Background updated.' }))
    } catch (e) {
      setStatus(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    setStatus(null)
    try {
      await apiFetch(`/api/me/background/${themeId}`, { method: 'DELETE' })
      refreshUserBg()
      setStatus(t('appearance.bg_removed', { defaultValue: 'Background removed.' }))
    } catch (e) {
      setStatus(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <SectionTitle>{t('appearance.background', { defaultValue: 'Background image' })}</SectionTitle>
      <p className="text-xs text-[var(--lx-text-muted)] mb-3">
        {t('appearance.background_hint', {
          defaultValue:
            'Personal backdrop for {{mode}} mode, shown behind the glass surfaces. Stored on the server.',
          mode: modeLabel,
        })}
      </p>
      <div
        className="h-28 rounded-lg border border-[var(--lx-glass-border)] mb-3 overflow-hidden"
        style={{
          backgroundImage: 'var(--lx-bg-image, none)',
          backgroundColor: 'var(--lx-bg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <label
          className={`lx-btn lx-btn--secondary lx-btn--sm cursor-pointer ${
            busy ? 'opacity-60 pointer-events-none' : ''
          }`}
        >
          {busy
            ? t('common.saving')
            : hasCustom
              ? t('appearance.bg_replace', { defaultValue: 'Replace image' })
              : t('appearance.bg_upload', { defaultValue: 'Upload image' })}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void upload(f)
              e.target.value = ''
            }}
          />
        </label>
        {hasCustom && (
          <button
            className="lx-btn lx-btn--ghost lx-btn--sm"
            disabled={busy}
            onClick={() => void remove()}
          >
            {t('appearance.bg_remove', { defaultValue: 'Remove' })}
          </button>
        )}
      </div>
      {status && <p className="mt-2 text-xs text-[var(--lx-text-muted)]">{status}</p>}
    </Card>
  )
}

// ── Liquid-glass effect ───────────────────────────────────────────────────────

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors"
      style={{ background: checked ? 'var(--lx-accent)' : 'var(--lx-elevated)' }}
    >
      <span
        className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
        style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
      />
    </button>
  )
}

function GlassSlider({
  label,
  desc,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string
  desc: string
  value: number
  min: number
  max: number
  step: number
  display: string
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-[var(--lx-text)]">{label}</label>
        <span className="lx-mono text-xs text-[var(--lx-accent)]">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full mt-1.5 accent-[var(--lx-accent)] cursor-pointer"
      />
      <p className="text-[11px] text-[var(--lx-text-muted)] mt-0.5">{desc}</p>
    </div>
  )
}

const GLASS_MODES: { id: GlassMode; label: string }[] = [
  { id: 'standard', label: 'Standard' },
  { id: 'polar', label: 'Polar' },
  { id: 'prominent', label: 'Prominent' },
  { id: 'shader', label: 'Shader (Experimental)' },
]

function GlassEffectCard() {
  const { t } = useTranslation('ui')
  const cfg = useGlassConfig()

  return (
    <Card>
      <div className="flex items-center justify-between">
        <SectionTitle>{t('appearance.glass_title', { defaultValue: 'Glass effect' })}</SectionTitle>
        <Switch checked={cfg.enabled} onChange={(v) => setGlassConfig({ enabled: v })} />
      </div>

      <p className="text-xs text-[var(--lx-warning)] -mt-2 mb-3">
        ⚠️{' '}
        {t('appearance.glass_warn', {
          defaultValue:
            'Edge refraction only renders in Chromium-based browsers. Safari & Firefox show plain frosted glass.',
        })}
      </p>

      {cfg.enabled && (
        <div className="flex flex-col gap-5">
          {/* Scope: all tiles vs key tiles only */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[var(--lx-text)]">
                {t('appearance.glass_alltiles', { defaultValue: 'Apply to all tiles' })}
              </p>
              <p className="text-[11px] text-[var(--lx-text-muted)] mt-0.5">
                {t('appearance.glass_alltiles_desc', {
                  defaultValue:
                    'Glass on every dashboard tile, not just the stat tiles. Each tile adds a GPU pass — turn off if it feels laggy.',
                })}
              </p>
            </div>
            <Switch checked={cfg.allTiles} onChange={(v) => setGlassConfig({ allTiles: v })} />
          </div>

          {/* Live preview over the active backdrop */}
          <div
            className="relative rounded-xl overflow-hidden p-4"
            style={{
              minHeight: 110,
              backgroundImage: 'var(--lx-bg-image)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: 'var(--lx-bg)',
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <GlassSurface radius={cfg.cornerRadius}>
                <div className="px-4 py-3">
                  <p className="text-[11px] text-[var(--lx-text-muted)]">{t('dashboard.core')}</p>
                  <p className="text-base font-semibold text-[var(--lx-text)]">v0.4.0</p>
                </div>
              </GlassSurface>
              <GlassSurface radius={cfg.cornerRadius}>
                <div className="px-4 py-3">
                  <p className="text-[11px] text-[var(--lx-text-muted)]">{t('dashboard.vault')}</p>
                  <p className="text-base font-semibold text-[var(--lx-text)]">ready</p>
                </div>
              </GlassSurface>
            </div>
          </div>

          {/* Refraction mode */}
          <div>
            <label className="text-sm font-medium text-[var(--lx-text)]">
              {t('appearance.glass_mode', { defaultValue: 'Refraction Mode' })}
            </label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {GLASS_MODES.map((m) => {
                const active = cfg.mode === m.id
                return (
                  <button
                    key={m.id}
                    onClick={() => setGlassConfig({ mode: m.id })}
                    className="px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors"
                    style={{
                      borderColor: active ? 'var(--lx-accent)' : 'var(--lx-border-soft)',
                      background: active ? 'color-mix(in srgb, var(--lx-accent) 12%, transparent)' : 'transparent',
                      color: active ? 'var(--lx-accent)' : 'var(--lx-text-muted)',
                    }}
                  >
                    {m.label}
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] text-[var(--lx-text-muted)] mt-1">
              {t('appearance.glass_mode_desc', {
                defaultValue: 'Controls the refraction calculation method.',
              })}
            </p>
          </div>

          <GlassSlider
            label={t('appearance.glass_displacement', { defaultValue: 'Displacement Scale' })}
            desc={t('appearance.glass_displacement_desc', {
              defaultValue: 'Controls the intensity of edge distortion.',
            })}
            value={cfg.displacementScale}
            min={0}
            max={200}
            step={1}
            display={String(cfg.displacementScale)}
            onChange={(v) => setGlassConfig({ displacementScale: v })}
          />

          <GlassSlider
            label={t('appearance.glass_blur', { defaultValue: 'Blur Amount' })}
            desc={t('appearance.glass_blur_desc', {
              defaultValue: 'Controls backdrop blur intensity.',
            })}
            value={cfg.blurAmount}
            min={0}
            max={1}
            step={0.01}
            display={cfg.blurAmount.toFixed(2)}
            onChange={(v) => setGlassConfig({ blurAmount: v })}
          />

          <GlassSlider
            label={t('appearance.glass_saturation', { defaultValue: 'Saturation' })}
            desc={t('appearance.glass_saturation_desc', {
              defaultValue: 'Controls color saturation of the backdrop.',
            })}
            value={cfg.saturation}
            min={100}
            max={200}
            step={1}
            display={`${cfg.saturation}%`}
            onChange={(v) => setGlassConfig({ saturation: v })}
          />

          <GlassSlider
            label={t('appearance.glass_aberration', { defaultValue: 'Chromatic Aberration' })}
            desc={t('appearance.glass_aberration_desc', {
              defaultValue: 'RGB channel separation at the edges. 0 = off (much cheaper on the GPU).',
            })}
            value={cfg.aberrationIntensity}
            min={0}
            max={10}
            step={1}
            display={String(cfg.aberrationIntensity)}
            onChange={(v) => setGlassConfig({ aberrationIntensity: v })}
          />

          <GlassSlider
            label={t('appearance.glass_radius', { defaultValue: 'Corner Radius' })}
            desc={t('appearance.glass_radius_desc', {
              defaultValue: 'Controls the roundness of the glass corners.',
            })}
            value={cfg.cornerRadius}
            min={0}
            max={48}
            step={1}
            display={`${cfg.cornerRadius}px`}
            onChange={(v) => setGlassConfig({ cornerRadius: v })}
          />

          {/* Over Light */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[var(--lx-text)]">
                {t('appearance.glass_overlight', { defaultValue: 'Over Light' })}
              </p>
              <p className="text-[11px] text-[var(--lx-text-muted)] mt-0.5">
                {t('appearance.glass_overlight_desc', {
                  defaultValue: 'Darkens the glass for better contrast on bright backgrounds.',
                })}
              </p>
            </div>
            <Switch checked={cfg.overLight} onChange={(v) => setGlassConfig({ overLight: v })} />
          </div>

          <div>
            <button className="lx-btn lx-btn--ghost lx-btn--sm" onClick={() => resetGlassConfig()}>
              {t('appearance.glass_reset', { defaultValue: 'Reset to defaults' })}
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}
