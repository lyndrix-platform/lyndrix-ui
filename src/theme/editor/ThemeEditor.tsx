import { useCallback, useEffect, useReducer, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Palette,
  Square,
  AlignJustify,
  Type,
  Layers,
  Activity,
  Blend,
  Sparkles,
  Image as ImageIcon,
  BarChart3,
  Terminal,
  Ruler,
  SlidersHorizontal,
  Moon,
  Sun,
  X,
  ChevronDown,
  Lock,
  Plus,
  Save,
  Monitor,
} from 'lucide-react'
import { apiFetch, ApiError } from '../../lib/api'
import { setBrowserOverrideVars } from '../../lib/browserOverrides'
import { getThemeVars, setThemeVars, type ThemeVars } from '../../lib/themeStore'
import { ACCOUNT_SCOPE_ENABLED } from '../../lib/preferences'
import { toast } from '../../lib/toast'
import type { ThemeOut } from '../../lib/types'
import { useTheme } from '../ThemeProvider'
import { tokensToVarDelta, backfillTokens } from './tokenMap'
import {
  draftReducer,
  initialDraft,
  dirtyCount,
  dirtyCountByGroup,
  cssVarsDirtyByRail,
  mergeTokens,
  type ThemeTokens,
} from './draft'
import { buildThemeZip, uploadThemePack, fetchAssetBytes, type PackAsset } from './packZip'
import EditorPreview from './EditorPreview'
import ColorsGroup from './groups/ColorsGroup'
import ShapeGroup from './groups/ShapeGroup'
import DensityGroup from './groups/DensityGroup'
import TypographyGroup from './groups/TypographyGroup'
import DepthGroup from './groups/DepthGroup'
import MotionGroup from './groups/MotionGroup'
import GradientGroup from './groups/GradientGroup'
import DataChartsGroup from './groups/DataChartsGroup'
import TerminalGroup from './groups/TerminalGroup'
import SizingGroup from './groups/SizingGroup'
import EffectsGroup from './groups/EffectsGroup'
import BackgroundGroup from './groups/BackgroundGroup'
import RawVariablesGroup from './groups/RawVariablesGroup'
import type { GroupId, GroupProps } from './groups/common'

type GroupComponent = (p: GroupProps) => React.ReactElement

const GROUPS: { id: GroupId; label: string; labelKey: string; Icon: typeof Palette; Component: GroupComponent }[] = [
  { id: 'colors', label: 'Colours', labelKey: 'editor.group.colors', Icon: Palette, Component: ColorsGroup },
  { id: 'shape', label: 'Shape', labelKey: 'editor.group.shape', Icon: Square, Component: ShapeGroup },
  { id: 'density', label: 'Density', labelKey: 'editor.group.density', Icon: AlignJustify, Component: DensityGroup },
  { id: 'typography', label: 'Typography', labelKey: 'editor.group.typography', Icon: Type, Component: TypographyGroup },
  { id: 'depth', label: 'Depth', labelKey: 'editor.group.depth', Icon: Layers, Component: DepthGroup },
  { id: 'motion', label: 'Motion', labelKey: 'editor.group.motion', Icon: Activity, Component: MotionGroup },
  { id: 'gradient', label: 'Gradient', labelKey: 'editor.group.gradient', Icon: Blend, Component: GradientGroup },
  { id: 'charts', label: 'Data / Charts', labelKey: 'editor.group.charts', Icon: BarChart3, Component: DataChartsGroup },
  { id: 'terminal', label: 'Terminal', labelKey: 'editor.group.terminal', Icon: Terminal, Component: TerminalGroup },
  { id: 'sizing', label: 'Sizing', labelKey: 'editor.group.sizing', Icon: Ruler, Component: SizingGroup },
  { id: 'effects', label: 'Effects', labelKey: 'editor.group.effects', Icon: Sparkles, Component: EffectsGroup },
  { id: 'background', label: 'Background', labelKey: 'editor.group.background', Icon: ImageIcon, Component: BackgroundGroup },
  { id: 'raw', label: 'Advanced — raw variables', labelKey: 'editor.group.raw', Icon: SlidersHorizontal, Component: RawVariablesGroup },
]

function themeIds(themes: ThemeOut[] | undefined): string[] {
  return (themes ?? []).map((t) => (typeof t === 'string' ? t : t.id))
}

export interface ThemeEditorProps {
  /** Theme id to load as the editing base (defaults to the pinned React theme). */
  initialBase?: string
  /** Group to open first (deep-link). */
  initialGroup?: GroupId
  /** Remove the editor search param / close the overlay. */
  onClose: () => void
}

/**
 * Full-screen theme editor overlay. Opened by AppearanceSection when the
 * `?editor=theme` search param is present. Owns a token draft, previews it live
 * across the whole app via ThemeProvider.setDraftVars, and can persist the delta
 * to the browser-override store ("Apply to this browser"). The draft <style>
 * layer is torn down on unmount, on close, and on Reset — it must never leak.
 */
export default function ThemeEditor({ initialBase, initialGroup, onClose }: ThemeEditorProps) {
  const { t } = useTranslation('ui')
  const { themeId, setTheme, selectedThemeId, setSelectedTheme, setDraftVars } = useTheme()
  const qc = useQueryClient()
  const [draft, dispatch] = useReducer(draftReducer, undefined, initialDraft)
  const [activeGroup, setActiveGroup] = useState<GroupId>(initialGroup ?? 'colors')
  const [baseId, setBaseId] = useState(initialBase ?? selectedThemeId ?? 'default')
  const [loading, setLoading] = useState(false)
  const [confirmingClose, setConfirmingClose] = useState(false)

  // Verbatim components.json of the loaded base — written straight into a saved
  // pack. Null when the base couldn't be loaded (offline open) → Save-as-theme is
  // disabled because a pack MUST ship a components.json.
  const [baseComponents, setBaseComponents] = useState<Record<string, unknown> | null>(null)
  // Whether the base pack's background images are copied into a saved pack
  // (BackgroundGroup checkbox). Default on, per the plan.
  const [carryOverAssets, setCarryOverAssets] = useState(true)
  // The base theme's server-RESOLVED --lx-* map (per mode) — authoritative seed
  // for controls that edit engine-hardcoded/composed vars via css_variables
  // (charts, terminal, states, raw panel). Seeded from cache, refreshed on load.
  const [baseCssVars, setBaseCssVars] = useState<ThemeVars | null>(
    () => getThemeVars(baseId ?? 'default'),
  )

  // ── Save-as-theme flow state ──────────────────────────────────────────────────
  const [saveMenuOpen, setSaveMenuOpen] = useState(false)
  // Name dialog: null = closed. `name` seeds the input (empty for "new", the base
  // id for "overwrite").
  const [saveDialog, setSaveDialog] = useState<{ name: string } | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  // Set to an id when a save would clobber an existing theme → inline confirm.
  const [confirmOverwrite, setConfirmOverwrite] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  // Post-save activation panel (id + any validation warnings to surface).
  const [saved, setSaved] = useState<{ id: string; warnings: string[] } | null>(null)
  // Pending all-users (PUT /api/themes/active) activation → confirm gate.
  const [systemActivate, setSystemActivate] = useState<string | null>(null)
  // Set once a write (save/activate) is denied (403) → hides save affordances.
  const [writeDenied, setWriteDenied] = useState(false)

  const dirty = dirtyCount(draft.edits)
  // Map the per-token-category counts onto the rail's groups (a rail group can
  // span several categories, e.g. Shape = radius + border, Depth = shadow + blur).
  const byCategory = dirtyCountByGroup(draft.edits)
  // Raw css_variables edits are bucketed onto whichever semantic group owns them
  // (charts/terminal/colors/effects) with the remainder falling to the raw panel.
  const cssRail = cssVarsDirtyByRail(draft.edits)
  // border.rail belongs to Sizing; border.width to Shape — split the shared count.
  const railWidthEdits = draft.edits.border.width != null ? 1 : 0
  const railRailEdits = draft.edits.border.rail != null ? 1 : 0
  const railCounts: Partial<Record<GroupId, number>> = {
    colors: (byCategory.colors ?? 0) + (cssRail.colors ?? 0) || undefined,
    shape: (byCategory.radius ?? 0) + railWidthEdits || undefined,
    density: byCategory.spacing,
    typography: byCategory.typography,
    depth: (byCategory.shadow ?? 0) + (byCategory.blur ?? 0) || undefined,
    motion: byCategory.transition,
    gradient: byCategory.gradient,
    charts: cssRail.charts,
    terminal: cssRail.terminal,
    sizing: (byCategory.icon ?? 0) + (byCategory.zindex ?? 0) + railRailEdits || undefined,
    effects: (byCategory.effect ?? 0) + (cssRail.effects ?? 0) || undefined,
    background: byCategory.background_images,
    raw: cssRail.raw,
  }

  const { data: themes } = useQuery({
    queryKey: ['themes'],
    queryFn: () => apiFetch<{ themes: ThemeOut[] }>('/api/themes').then((r) => r.themes),
  })
  const ids = themeIds(themes)

  // Load a base pack's tokens → draft. On failure, fall back to the Phase-1
  // defaults (which reproduce today's look) so the controls still populate; the
  // live app preview keeps using the cached css-vars ThemeProvider already paints.
  const loadBase = useCallback(async (id: string) => {
    setLoading(true)
    // Seed the resolved-vars fallback from cache immediately (no flash), then
    // revalidate against core below so semantic css_variables controls show the
    // real current colours for this base.
    setBaseCssVars(getThemeVars(id))
    void apiFetch<{ css_variables: ThemeVars }>(`/api/themes/${encodeURIComponent(id)}/css-vars`)
      .then((body) => {
        if (body?.css_variables) setBaseCssVars(body.css_variables)
      })
      .catch(() => {
        /* best-effort — controls fall back to DEFAULT_CSS_VARS */
      })
    try {
      const data = await apiFetch<{
        tokens: Partial<ThemeTokens>
        components: Record<string, unknown>
      }>(`/api/themes/${encodeURIComponent(id)}`)
      dispatch({ type: 'LOAD_BASE', baseThemeId: id, base: backfillTokens(data.tokens) })
      // Keep the base's components verbatim so a saved pack can ship them unchanged.
      setBaseComponents(data.components ?? null)
    } catch {
      dispatch({ type: 'LOAD_BASE', baseThemeId: id, base: backfillTokens(null) })
      // Components unavailable → Save-as-theme stays disabled (needs components.json).
      setBaseComponents(null)
      toast.error(
        t('editor.load_failed', {
          defaultValue: 'Could not load "{{id}}" tokens — starting from defaults.',
          id,
        }),
      )
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadBase(baseId)
  }, [baseId, loadBase])

  // Live preview: recompute the top-layer draft delta whenever edits change,
  // debounced so dragging a slider doesn't thrash the DOM. An empty delta
  // removes the layer, so RESET_ALL cleans itself up here.
  useEffect(() => {
    const delta = tokensToVarDelta(draft.edits)
    const handle = window.setTimeout(() => setDraftVars(delta), 50)
    return () => window.clearTimeout(handle)
  }, [draft.edits, setDraftVars])

  // Hard cleanup: the draft layer must never outlive the editor.
  useEffect(() => {
    return () => setDraftVars(null)
  }, [setDraftVars])

  const closeNow = useCallback(() => {
    setDraftVars(null)
    onClose()
  }, [setDraftVars, onClose])

  const requestClose = useCallback(() => {
    if (dirty > 0) {
      setConfirmingClose(true)
      return
    }
    closeNow()
  }, [dirty, closeNow])

  // Esc closes (with the same dirty guard).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [requestClose])

  // "Apply to this browser": persist the delta into the browser-override store
  // (per mode), then drop the draft layer. The overrides paint identically, so
  // there is no flash, and they surface as facet chips in the Overrides card.
  function applyToBrowser() {
    const delta = tokensToVarDelta(draft.edits)
    if (Object.keys(delta.light).length) setBrowserOverrideVars('light', delta.light)
    if (Object.keys(delta.dark).length) setBrowserOverrideVars('dark', delta.dark)
    dispatch({ type: 'RESET_ALL' })
    toast.success(t('editor.applied_browser', { defaultValue: 'Applied to this browser.' }))
    closeNow()
  }

  // ── Save as theme pack (POST /api/themes) ─────────────────────────────────────
  const NAME_RE = /^[a-z0-9][a-z0-9_-]{1,40}$/

  function openSaveNew() {
    setSaveMenuOpen(false)
    setNameError(null)
    setConfirmOverwrite(null)
    setSaveDialog({ name: '' })
  }
  function openOverwriteBase() {
    setSaveMenuOpen(false)
    setNameError(null)
    // Base always exists → the name dialog's collision confirm gates the write.
    setConfirmOverwrite(null)
    setSaveDialog({ name: baseId })
  }

  // Validate the typed id, then either surface a collision confirm or save.
  function submitName() {
    const id = (saveDialog?.name ?? '').trim()
    if (!NAME_RE.test(id) || id === 'default') {
      setNameError(
        t('editor.save.name_invalid', {
          defaultValue:
            'Use 2–41 characters: lowercase letters, digits, - or _ (and not "default").',
        }),
      )
      return
    }
    if (ids.includes(id) && confirmOverwrite !== id) {
      setConfirmOverwrite(id) // require an explicit overwrite confirm first
      return
    }
    void doSave(id)
  }

  // Merge base⊕edits → tokens.json, attach the verbatim components.json, optionally
  // carry over the base pack's background images, zip it, and upload it.
  async function doSave(id: string) {
    if (!baseComponents) return
    setSaving(true)
    try {
      const tokens = backfillTokens(mergeTokens(draft.base, draft.edits))

      const assets: PackAsset[] = []
      if (carryOverAssets) {
        const wanted = new Set<string>()
        for (const f of [tokens.background_images.light, tokens.background_images.dark]) {
          // Only real image filenames — skip empty/url() values.
          if (f && /\.(png|jpe?g|webp)$/i.test(f)) wanted.add(f)
        }
        let missing = 0
        for (const filename of wanted) {
          const bytes = await fetchAssetBytes(draft.baseThemeId, filename)
          if (bytes) assets.push({ name: filename, bytes })
          else missing += 1
        }
        if (missing > 0) {
          toast.info(
            t('editor.save.assets_missing', {
              defaultValue: 'Could not copy {{n}} background image(s) from the base theme.',
              n: missing,
            }),
          )
        }
      }

      const zip = buildThemeZip(tokens, baseComponents, assets)
      const { warnings } = await uploadThemePack(id, zip)

      qc.invalidateQueries({ queryKey: ['themes'] })
      toast.success(t('editor.save.saved', { defaultValue: 'Saved theme “{{id}}”.', id }))
      setSaveDialog(null)
      setConfirmOverwrite(null)
      setNameError(null)
      setSaved({ id, warnings: warnings ?? [] })
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        setWriteDenied(true)
        setSaveDialog(null)
        toast.error(
          t('editor.save.denied', {
            defaultValue: 'You do not have permission to save themes.',
          }),
        )
      } else if (e instanceof ApiError && e.status === 401) {
        // uploadThemePack already cleared the session + redirected.
      } else {
        toast.error(e instanceof Error ? e.message : t('common.error', { defaultValue: 'Error' }))
      }
    } finally {
      setSaving(false)
    }
  }

  // Fetch the engine-authoritative css-vars for a saved theme and cache them, so
  // ThemeProvider paints the real server composition (never the client delta).
  async function recacheThemeVars(id: string) {
    try {
      const body = await apiFetch<{ css_variables: ThemeVars }>(
        `/api/themes/${encodeURIComponent(id)}/css-vars`,
      )
      if (body?.css_variables) setThemeVars(id, body.css_variables)
    } catch {
      // Best-effort: ThemeProvider will re-fetch on selection anyway.
    }
  }

  // Wrap up after a save: drop the draft layer, clear edits and close the editor.
  function finishAfterSave() {
    setSaved(null)
    setSystemActivate(null)
    dispatch({ type: 'RESET_ALL' })
    closeNow()
  }

  // "Activate now → this browser": re-cache engine vars, pin the React theme,
  // then close. Pinning triggers ThemeProvider to paint from the fresh cache.
  async function activateBrowser(id: string) {
    await recacheThemeVars(id)
    setSelectedTheme(id)
    finishAfterSave()
  }

  // "Activate now → system default": the ONLY PUT /api/themes/active path here,
  // always behind the all-users confirm gate (never clobber NiceGUI silently).
  async function confirmSystemActivate() {
    const id = systemActivate
    if (!id) return
    try {
      await recacheThemeVars(id)
      await apiFetch('/api/themes/active', {
        method: 'PUT',
        body: JSON.stringify({ theme_id: id }),
      })
      qc.invalidateQueries({ queryKey: ['theme-active'] })
      toast.success(
        t('editor.save.activated_system', {
          defaultValue: '“{{id}}” is now the system default.',
          id,
        }),
      )
      finishAfterSave()
    } catch (e) {
      setSystemActivate(null)
      if (e instanceof ApiError && e.status === 403) {
        setWriteDenied(true)
        toast.error(
          t('editor.save.denied', { defaultValue: 'You do not have permission to save themes.' }),
        )
      } else if (!(e instanceof ApiError && e.status === 401)) {
        toast.error(e instanceof Error ? e.message : t('common.error', { defaultValue: 'Error' }))
      }
    }
  }

  const canSave = baseComponents !== null && !writeDenied

  const active = GROUPS.find((g) => g.id === activeGroup) ?? GROUPS[0]
  const ActiveComponent = active.Component

  return (
    <div
      className="fixed inset-0 z-[100] flex"
      style={{
        // Translucent, blurred scrim so the app + starfield bleed through softly
        // — matches the shell's "liquid glass over the themed backdrop" language
        // instead of the old flat opaque panel.
        background: 'color-mix(in srgb, var(--lx-bg) 66%, transparent)',
        backdropFilter: 'blur(22px) saturate(150%)',
        WebkitBackdropFilter: 'blur(22px) saturate(150%)',
      }}
    >
      {/* Floating glass editor panel — one cohesive frosted surface (the shell's
          .lx-glass recipe: surface-glass + backdrop blur + glass rim + shadow),
          full-bleed on mobile, inset with rounded corners on ≥sm like a shell card. */}
      <div className="lx-glass flex flex-col flex-1 min-h-0 overflow-hidden sm:m-4 sm:rounded-2xl">
        {/* Gradient accent bar — echoes the shell's section accents */}
        <div className="h-1 shrink-0" style={{ background: 'var(--lx-gradient-accent)' }} />

        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-[var(--lx-glass-border)] shrink-0">
        <Palette size={18} className="text-[var(--lx-accent)] shrink-0" />
        <h2 className="text-sm font-semibold text-[var(--lx-text)] mr-2">
          {t('editor.title', { defaultValue: 'Theme Editor' })}
        </h2>

        <label className="flex items-center gap-1.5 text-xs text-[var(--lx-text-muted)]">
          {t('editor.base', { defaultValue: 'Base' })}
          <select
            className="lx-input text-xs !py-1 !w-auto"
            value={baseId}
            onChange={(e) => setBaseId(e.target.value)}
            disabled={loading}
          >
            {ids.length === 0 && <option value={baseId}>{baseId}</option>}
            {ids.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>

        {/* Mode toggle — flips the real app + which colour palette is edited */}
        <div className="flex items-center gap-1 ml-1">
          {(['dark', 'light'] as const).map((m) => {
            const Icon = m === 'dark' ? Moon : Sun
            const on = themeId === m
            return (
              <button
                key={m}
                onClick={() => setTheme(m)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors"
                style={{
                  borderColor: on ? 'var(--lx-accent)' : 'var(--lx-glass-border)',
                  background: on ? 'color-mix(in srgb, var(--lx-accent) 12%, transparent)' : 'transparent',
                  color: on ? 'var(--lx-accent)' : 'var(--lx-text-muted)',
                }}
              >
                <Icon size={13} />
                {t(`appearance.${m}`, { defaultValue: m })}
              </button>
            )
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={requestClose}
            className="lx-icon-btn"
            title={t('editor.close', { defaultValue: 'Close' })}
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Body: rail | controls | preview */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[200px_minmax(0,1fr)_360px]">
        {/* Group rail */}
        <nav className="border-r border-[var(--lx-glass-border)] overflow-y-auto p-2 hidden md:block">
          {GROUPS.map((g) => {
            const on = g.id === activeGroup
            const count = railCounts[g.id]
            return (
              <button
                key={g.id}
                onClick={() => setActiveGroup(g.id)}
                className={[
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors',
                  on
                    ? 'bg-[var(--lx-accent)]/10 text-[var(--lx-accent)]'
                    : 'text-[var(--lx-text-muted)] hover:text-[var(--lx-text)] hover:bg-[var(--lx-elevated)]',
                ].join(' ')}
              >
                <g.Icon size={15} className="shrink-0" />
                <span className="truncate">{t(g.labelKey, { defaultValue: g.label })}</span>
                {count ? (
                  <span className="ml-auto text-[10px] font-semibold text-[var(--lx-accent)] tabular-nums">
                    {count}
                  </span>
                ) : null}
              </button>
            )
          })}
        </nav>

        {/* Mobile group chips */}
        <div className="md:hidden flex gap-2 overflow-x-auto p-2 border-b border-[var(--lx-glass-border)]">
          {GROUPS.map((g) => (
            <button
              key={g.id}
              onClick={() => setActiveGroup(g.id)}
              className={[
                'shrink-0 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors',
                g.id === activeGroup
                  ? 'border-[var(--lx-accent)] bg-[var(--lx-accent)]/10 text-[var(--lx-accent)]'
                  : 'border-[var(--lx-glass-border)] text-[var(--lx-text-muted)]',
              ].join(' ')}
            >
              {t(g.labelKey, { defaultValue: g.label })}
            </button>
          ))}
        </div>

        {/* Active group controls */}
        <section className="overflow-y-auto p-5 min-w-0">
          <h3 className="text-sm font-semibold text-[var(--lx-text)] mb-4 flex items-center gap-2">
            <active.Icon size={16} className="text-[var(--lx-accent)]" />
            {t(active.labelKey, { defaultValue: active.label })}
          </h3>
          <ActiveComponent
            draft={draft}
            dispatch={dispatch}
            mode={themeId}
            baseCssVars={baseCssVars}
            carryOverAssets={carryOverAssets}
            onCarryOverChange={setCarryOverAssets}
          />
        </section>

        {/* Sticky preview (desktop) / stacked (below controls on md) */}
        <aside className="hidden lg:block border-l border-[var(--lx-glass-border)] overflow-y-auto p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--lx-text-muted)] mb-3">
            {t('editor.preview.label', { defaultValue: 'Preview' })}
          </p>
          <EditorPreview />
        </aside>
      </div>

      {/* Footer */}
      <footer className="flex flex-wrap items-center gap-2 px-4 py-3 border-t border-[var(--lx-glass-border)] shrink-0">
        <button
          className="lx-btn lx-btn--ghost lx-btn--sm"
          disabled={dirty === 0}
          onClick={() => dispatch({ type: 'RESET_ALL' })}
        >
          {t('editor.reset_draft', { defaultValue: 'Reset draft' })}
        </button>
        <span className="text-xs text-[var(--lx-text-muted)]">
          {t('editor.n_changes', { defaultValue: '{{n}} changes', n: dirty })}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            className="lx-btn lx-btn--primary lx-btn--sm"
            disabled={dirty === 0}
            onClick={applyToBrowser}
          >
            {t('editor.apply_browser', { defaultValue: 'Apply to this browser' })}
          </button>
          {/* Save-as-theme pack export */}
          <div className="relative">
            <button
              className={`lx-btn lx-btn--secondary lx-btn--sm ${!canSave ? 'opacity-60 cursor-not-allowed' : ''}`}
              disabled={!canSave || saving}
              title={
                baseComponents === null
                  ? t('editor.save.needs_components', {
                      defaultValue: 'Base pack could not be loaded — saving needs its components.json.',
                    })
                  : writeDenied
                    ? t('editor.save.denied', {
                        defaultValue: 'You do not have permission to save themes.',
                      })
                    : undefined
              }
              onClick={() => setSaveMenuOpen((v) => !v)}
            >
              {t('editor.save_theme', { defaultValue: 'Save as theme…' })}
              <ChevronDown size={14} className="ml-1 inline" />
            </button>

            {saveMenuOpen && canSave && (
              <>
                {/* Click-away backdrop */}
                <div className="fixed inset-0 z-10" onClick={() => setSaveMenuOpen(false)} />
                <div className="lx-popover absolute right-0 bottom-full mb-2 z-20 w-56 p-1">
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-[var(--lx-text)] hover:bg-[var(--lx-elevated)] text-left transition-colors"
                    onClick={openSaveNew}
                  >
                    <Plus size={14} className="shrink-0 text-[var(--lx-accent)]" />
                    {t('editor.save.new', { defaultValue: 'Save as new theme' })}
                  </button>
                  {baseId !== 'default' && (
                    <button
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-[var(--lx-text)] hover:bg-[var(--lx-elevated)] text-left transition-colors"
                      onClick={openOverwriteBase}
                    >
                      <Save size={14} className="shrink-0 text-[var(--lx-accent)]" />
                      {t('editor.save.overwrite', {
                        defaultValue: 'Overwrite “{{id}}”',
                        id: baseId,
                      })}
                    </button>
                  )}
                  {/* Phase-2 seam: account-scoped save (disabled) */}
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-[var(--lx-text-subtle)] opacity-60 cursor-not-allowed text-left"
                    disabled={!ACCOUNT_SCOPE_ENABLED}
                    title={t('editor.save.account_locked', {
                      defaultValue: 'Requires Theming v2 Phase 2',
                    })}
                  >
                    <Lock size={14} className="shrink-0" />
                    {t('editor.save.account', { defaultValue: 'Apply to my account' })}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </footer>
      </div>

      {/* Dirty-close confirm */}
      {confirmingClose && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-black/40 backdrop-blur-sm p-4">
          <div className="lx-glass rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-sm font-semibold text-[var(--lx-text)] mb-2">
              {t('editor.discard_title', { defaultValue: 'Discard unsaved changes?' })}
            </h3>
            <p className="text-xs text-[var(--lx-text-muted)] mb-4">
              {t('editor.discard_body', {
                defaultValue: 'You have {{n}} unapplied changes. Closing will discard them.',
                n: dirty,
              })}
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="lx-btn lx-btn--ghost lx-btn--sm"
                onClick={() => setConfirmingClose(false)}
              >
                {t('editor.keep_editing', { defaultValue: 'Keep editing' })}
              </button>
              <button className="lx-btn lx-btn--danger lx-btn--sm" onClick={closeNow}>
                {t('editor.discard', { defaultValue: 'Discard' })}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save name dialog */}
      {saveDialog && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/40 backdrop-blur-sm p-4">
          <div className="lx-glass rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-sm font-semibold text-[var(--lx-text)] mb-2">
              {t('editor.save.title', { defaultValue: 'Save as theme' })}
            </h3>
            <label className="block text-xs text-[var(--lx-text-muted)] mb-1.5">
              {t('editor.save.name_label', { defaultValue: 'Theme id' })}
            </label>
            <input
              className="lx-input w-full text-sm"
              autoFocus
              value={saveDialog.name}
              placeholder="my-theme"
              spellCheck={false}
              onChange={(e) => {
                setSaveDialog({ name: e.target.value })
                setNameError(null)
                setConfirmOverwrite(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitName()
              }}
            />
            <p className="mt-1.5 text-[11px] text-[var(--lx-text-subtle)]">
              {t('editor.save.name_hint', {
                defaultValue: 'Lowercase letters, digits, - and _ . Used as the pack filename.',
              })}
            </p>
            {nameError && (
              <p className="mt-1.5 text-[11px] text-[var(--lx-state-down)]">{nameError}</p>
            )}
            {confirmOverwrite && (
              <p className="mt-2 text-[11px] text-[var(--lx-warning)]">
                ⚠️{' '}
                {t('editor.save.overwrite_warn', {
                  defaultValue: 'A theme “{{id}}” already exists — saving will overwrite it.',
                  id: confirmOverwrite,
                })}
              </p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="lx-btn lx-btn--ghost lx-btn--sm"
                onClick={() => {
                  setSaveDialog(null)
                  setNameError(null)
                  setConfirmOverwrite(null)
                }}
                disabled={saving}
              >
                {t('appearance.cancel', { defaultValue: 'Cancel' })}
              </button>
              <button className="lx-btn lx-btn--primary lx-btn--sm" onClick={submitName} disabled={saving}>
                {saving
                  ? t('common.saving', { defaultValue: 'Saving…' })
                  : confirmOverwrite
                    ? t('editor.save.confirm_overwrite', { defaultValue: 'Overwrite & save' })
                    : t('editor.save.do_save', { defaultValue: 'Save theme' })}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-save activation panel */}
      {saved && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/40 backdrop-blur-sm p-4">
          <div className="lx-glass rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-sm font-semibold text-[var(--lx-text)] mb-1">
              {t('editor.save.done_title', { defaultValue: 'Saved “{{id}}”', id: saved.id })}
            </h3>
            <p className="text-xs text-[var(--lx-text-muted)] mb-3">
              {t('editor.save.done_body', { defaultValue: 'Activate it now, or keep editing.' })}
            </p>

            {saved.warnings.length > 0 && (
              <div className="mb-3 p-2.5 rounded-md bg-[var(--lx-warning)]/10 border border-[var(--lx-warning)]/30">
                <p className="text-[11px] font-medium text-[var(--lx-warning)] mb-1">
                  {t('editor.save.warnings', {
                    defaultValue: '{{n}} validation warning(s):',
                    n: saved.warnings.length,
                  })}
                </p>
                <ul className="list-disc pl-4 text-[11px] text-[var(--lx-text-muted)] space-y-0.5 max-h-28 overflow-y-auto">
                  {saved.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                className="lx-btn lx-btn--primary lx-btn--sm justify-start"
                onClick={() => void activateBrowser(saved.id)}
              >
                <Monitor size={14} className="mr-1.5 inline" />
                {t('editor.save.use_browser', { defaultValue: 'Use in this browser' })}
              </button>
              {!writeDenied && (
                <button
                  className="lx-btn lx-btn--secondary lx-btn--sm justify-start"
                  onClick={() => setSystemActivate(saved.id)}
                >
                  ⚠️{' '}
                  {t('editor.save.use_system', {
                    defaultValue: 'Set as system default (all users)',
                  })}
                </button>
              )}
              <button className="lx-btn lx-btn--ghost lx-btn--sm justify-start" onClick={() => setSaved(null)}>
                {t('editor.save.keep_editing', { defaultValue: 'Keep editing' })}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* All-users activation confirm (the only PUT /api/themes/active path here) */}
      {systemActivate && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-black/40 backdrop-blur-sm p-4">
          <div className="lx-glass rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-sm font-semibold text-[var(--lx-text)] mb-2">
              {t('editor.save.system_confirm_title', { defaultValue: 'Change the system default?' })}
            </h3>
            <p className="text-xs text-[var(--lx-text-muted)] mb-4">
              {t('editor.save.system_confirm_body', {
                defaultValue:
                  'Applying “{{id}}” as the system default changes the theme for all users (including the NiceGUI UI).',
                id: systemActivate,
              })}
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="lx-btn lx-btn--ghost lx-btn--sm"
                onClick={() => setSystemActivate(null)}
              >
                {t('appearance.cancel', { defaultValue: 'Cancel' })}
              </button>
              <button
                className="lx-btn lx-btn--primary lx-btn--sm"
                onClick={() => void confirmSystemActivate()}
              >
                {t('editor.save.system_confirm_apply', { defaultValue: 'Apply for all' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
