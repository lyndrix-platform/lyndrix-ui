import { useTranslation } from 'react-i18next'
import { SliderField, PresetRow } from '../controls'
import GlassSurface from '../../../components/GlassSurface'
import {
  useGlassConfig,
  setGlassConfig,
  resetGlassConfig,
  type GlassMode,
} from '../../../lib/glassConfig'
// Effects = the liquid-glass config, relocated verbatim from the old
// appearance/GlassEffectCard.tsx. Glass is a BROWSER-ONLY effect facet — the
// engine has no glass token category, so these values are NEVER part of the
// draft or a saved theme pack. They persist to localStorage via glassConfig.ts.

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

// Effects is browser-only and does not touch the token draft, so it ignores the
// GroupProps every other group receives (a zero-arg component is assignable to
// the shared group component type).
export default function EffectsGroup() {
  const { t } = useTranslation('ui')
  const cfg = useGlassConfig()

  return (
    <div className="flex flex-col gap-4">
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
  )
}
