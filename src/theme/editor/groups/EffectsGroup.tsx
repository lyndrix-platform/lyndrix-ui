import { useTranslation } from 'react-i18next'
import { SliderField, TextField, PresetRow, GroupSubhead } from '../controls'
import GlassSurface from '../../../components/GlassSurface'
import { effectiveScalar, isScalarEdited } from '../draft'
import { cssVarTools } from './cssVars'
import type { GroupProps } from './common'
import {
  useGlassConfig,
  setGlassConfig,
  resetGlassConfig,
  type GlassMode,
} from '../../../lib/glassConfig'
// Effects has two halves:
//  1. THEME effect tokens (saved with the pack): the `effect` token category
//     (--lx-glass-saturate, --lx-badge-bg/border-opacity) + the css_variables
//     scrim. These re-skin every viewer of the theme.
//  2. The liquid-glass config (BROWSER-ONLY) — the engine has no glass token
//     category, so these values are NEVER part of the draft/pack; they persist
//     to localStorage via glassConfig.ts.

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

const GLASS_MODES: { id: GlassMode; label: string }[] = [
  { id: 'standard', label: 'Standard' },
  { id: 'polar', label: 'Polar' },
  { id: 'prominent', label: 'Prominent' },
  { id: 'shader', label: 'Shader (Experimental)' },
]

export default function EffectsGroup({ draft, dispatch, mode, baseCssVars }: GroupProps) {
  const { t } = useTranslation('ui')
  const cfg = useGlassConfig()
  const css = cssVarTools(draft, dispatch, mode, baseCssVars)

  const saturate = parseFloat(effectiveScalar(draft, 'effect', 'glass_saturate')) || 0
  const badgeBg = parseFloat(effectiveScalar(draft, 'effect', 'badge_bg_opacity')) || 0
  const badgeBorder = parseFloat(effectiveScalar(draft, 'effect', 'badge_border_opacity')) || 0

  return (
    <div className="flex flex-col gap-6">
      {/* ── Theme effect tokens (saved with the pack) ─────────────────────── */}
      <div className="flex flex-col gap-4">
        <GroupSubhead>{t('editor.effects.theme', { defaultValue: 'Theme effect tokens' })}</GroupSubhead>

        <SliderField
          label={t('editor.effects.glass_saturate', { defaultValue: 'Glass saturation' })}
          desc={t('editor.effects.glass_saturate_desc', {
            defaultValue: 'Backdrop-filter saturate() behind frosted surfaces (theme-wide).',
          })}
          value={saturate}
          min={100}
          max={220}
          step={5}
          display={`${saturate}%`}
          edited={isScalarEdited(draft, 'effect', 'glass_saturate')}
          onChange={(v) => dispatch({ type: 'SET_TOKEN', group: 'effect', key: 'glass_saturate', value: `${v}%` })}
          onReset={() => dispatch({ type: 'RESET_TOKEN', group: 'effect', key: 'glass_saturate' })}
        />

        {/* Badge tint opacities — live preview via .lx-badge--* fills. */}
        <div className="flex flex-wrap gap-2">
          <span className="lx-badge lx-badge--unknown"><span className="lx-dot" />unknown</span>
          <span className="lx-badge lx-badge--success"><span className="lx-dot" />success</span>
        </div>
        <SliderField
          label={t('editor.effects.badge_bg', { defaultValue: 'Badge fill opacity' })}
          value={badgeBg}
          min={0}
          max={0.6}
          step={0.01}
          display={badgeBg.toFixed(2)}
          edited={isScalarEdited(draft, 'effect', 'badge_bg_opacity')}
          onChange={(v) => dispatch({ type: 'SET_TOKEN', group: 'effect', key: 'badge_bg_opacity', value: String(v) })}
          onReset={() => dispatch({ type: 'RESET_TOKEN', group: 'effect', key: 'badge_bg_opacity' })}
        />
        <SliderField
          label={t('editor.effects.badge_border', { defaultValue: 'Badge border opacity' })}
          value={badgeBorder}
          min={0}
          max={0.8}
          step={0.01}
          display={badgeBorder.toFixed(2)}
          edited={isScalarEdited(draft, 'effect', 'badge_border_opacity')}
          onChange={(v) => dispatch({ type: 'SET_TOKEN', group: 'effect', key: 'badge_border_opacity', value: String(v) })}
          onReset={() => dispatch({ type: 'RESET_TOKEN', group: 'effect', key: 'badge_border_opacity' })}
        />

        <TextField
          label={t('editor.effects.scrim', { defaultValue: 'Modal scrim' })}
          desc={t('editor.effects.scrim_desc', {
            defaultValue: 'Overlay behind modals. Saved as a css_variables override.',
          })}
          mono
          value={css.value('--lx-scrim')}
          edited={css.edited('--lx-scrim')}
          onChange={(v) => css.set('--lx-scrim', v)}
          onReset={() => css.reset('--lx-scrim')}
        />
        {/* Scrim preview swatch */}
        <div
          className="h-8 rounded-lg border border-[var(--lx-border-soft)]"
          style={{ background: css.value('--lx-scrim') }}
          aria-label={t('editor.effects.scrim', { defaultValue: 'Modal scrim' })}
        />
      </div>

      {/* ── Liquid-glass config (browser only) ───────────────────────────── */}
      <div className="border-t border-[var(--lx-border-soft)] pt-4 flex flex-col gap-4">
      <GroupSubhead>{t('editor.effects.glass', { defaultValue: 'Liquid glass' })}</GroupSubhead>
      <p className="text-[11px] text-[var(--lx-accent)]">
        {t('editor.effects.scope_note', {
          defaultValue: 'This browser only — not saved to a theme pack.',
        })}
      </p>

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--lx-text)]">
          {t('appearance.glass_title', { defaultValue: 'Glass effect' })}
        </span>
        <Switch checked={cfg.enabled} onChange={(v) => setGlassConfig({ enabled: v })} />
      </div>

      <p className="text-xs text-[var(--lx-warning)] -mt-2">
        ⚠️{' '}
        {t('appearance.glass_warn', {
          defaultValue:
            'Edge refraction only renders in Chromium-based browsers. Safari & Firefox show plain frosted glass.',
        })}
      </p>

      {cfg.enabled && (
        <div className="flex flex-col gap-5">
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

          <PresetRow
            label={t('appearance.glass_mode', { defaultValue: 'Refraction Mode' })}
            activeValue={cfg.mode}
            presets={GLASS_MODES.map((m) => ({ label: m.label, value: m.id }))}
            onPick={(v) => setGlassConfig({ mode: v as GlassMode })}
          />

          <SliderField
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
          <SliderField
            label={t('appearance.glass_blur', { defaultValue: 'Blur Amount' })}
            desc={t('appearance.glass_blur_desc', { defaultValue: 'Controls backdrop blur intensity.' })}
            value={cfg.blurAmount}
            min={0}
            max={1}
            step={0.01}
            display={cfg.blurAmount.toFixed(2)}
            onChange={(v) => setGlassConfig({ blurAmount: v })}
          />
          <SliderField
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
          <SliderField
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
          <SliderField
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
      </div>
    </div>
  )
}
