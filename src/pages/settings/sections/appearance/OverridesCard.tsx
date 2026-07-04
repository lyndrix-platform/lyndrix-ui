import { useReducer } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import {
  useBrowserOverrides,
  countByFacet,
  hasAnyOverride,
  isColourVar,
  clearBrowserOverrideVar,
  resetBrowserOverrides,
} from '../../../../lib/browserOverrides'
import { useGlassConfig, resetGlassConfig, GLASS_DEFAULTS, type GlassConfig } from '../../../../lib/glassConfig'
import { getUiScale, setUiScale, UI_SCALE_DEFAULT } from '../../../../lib/uiScale'
import { Card, SectionTitle } from '../../shared'

/** True when the glass config differs from the shipped defaults on any key. */
function glassCustomised(cfg: GlassConfig): boolean {
  return (Object.keys(GLASS_DEFAULTS) as (keyof GlassConfig)[]).some(
    (k) => cfg[k] !== GLASS_DEFAULTS[k],
  )
}

/** A single facet chip: label + count/state and an ✕ that resets just that facet. */
function FacetChip({
  label,
  onReset,
}: {
  label: string
  onReset: () => void
}) {
  return (
    <span className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full border border-[var(--lx-border-soft)] bg-[var(--lx-elevated)] text-xs text-[var(--lx-text)]">
      {label}
      <button
        onClick={onReset}
        className="grid place-items-center w-4 h-4 rounded-full text-[var(--lx-text-muted)] hover:text-[var(--lx-state-down)] hover:bg-[var(--lx-state-down)]/10"
        title="Reset"
      >
        <X size={11} />
      </button>
    </span>
  )
}

/**
 * "My overrides — this browser": surfaces every browser-scoped customisation as a
 * resettable facet chip (colours, non-colour tokens, glass, UI scale). All resets
 * are local (localStorage / in-memory stores) — nothing hits the server.
 */
export default function OverridesCard() {
  const { t } = useTranslation('ui')
  const [, setSearchParams] = useSearchParams()
  const overrides = useBrowserOverrides()
  const glass = useGlassConfig()

  // Deep-link into the editor's Colours group (browser overrides are mostly
  // colours/tokens); AppearanceSection portals the editor on this param.
  function editInEditor() {
    setSearchParams((prev) => {
      prev.set('editor', 'theme')
      prev.set('group', 'colors')
      return prev
    })
  }
  // getUiScale() reads localStorage synchronously; this tick forces a re-read after
  // we reset the scale (it can also be changed from QuickRow while mounted).
  const [, bump] = useReducer((n: number) => n + 1, 0)

  const { colour, other } = countByFacet()
  const scale = getUiScale()
  const scaleCustom = scale !== UI_SCALE_DEFAULT
  const glassCustom = glassCustomised(glass)

  const anything = hasAnyOverride() || glassCustom || scaleCustom

  function resetFacet(pred: (v: string) => boolean) {
    ;(['light', 'dark'] as const).forEach((mode) => {
      Object.keys(overrides[mode]).forEach((v) => {
        if (pred(v)) clearBrowserOverrideVar(mode, v)
      })
    })
  }

  function resetAll() {
    resetBrowserOverrides()
    resetGlassConfig()
    setUiScale(UI_SCALE_DEFAULT)
    bump()
  }

  return (
    <Card>
      <SectionTitle>
        {t('appearance.overrides_title', { defaultValue: 'My overrides — this browser' })}
      </SectionTitle>

      {!anything ? (
        <p className="text-xs text-[var(--lx-text-muted)]">
          {t('appearance.overrides_none', {
            defaultValue: 'No personal overrides. Your theme is showing as-is.',
          })}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {colour > 0 && (
            <FacetChip
              label={t('appearance.facet_colours', {
                defaultValue: 'Colours: {{n}}',
                n: colour,
              })}
              onReset={() => resetFacet(isColourVar)}
            />
          )}
          {other > 0 && (
            <FacetChip
              label={t('appearance.facet_tokens', {
                defaultValue: 'Tokens: {{n}}',
                n: other,
              })}
              onReset={() => resetFacet((v) => !isColourVar(v))}
            />
          )}
          {glassCustom && (
            <FacetChip
              label={t('appearance.facet_glass', { defaultValue: 'Glass customised' })}
              onReset={() => resetGlassConfig()}
            />
          )}
          {scaleCustom && (
            <FacetChip
              label={t('appearance.facet_scale', {
                defaultValue: 'Scale: {{n}}%',
                n: Math.round(scale * 100),
              })}
              onReset={() => {
                setUiScale(UI_SCALE_DEFAULT)
                bump()
              }}
            />
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mt-4">
        <button className="lx-btn lx-btn--secondary lx-btn--sm" onClick={editInEditor}>
          {t('appearance.edit_in_editor', { defaultValue: 'Edit in Theme Editor' })}
        </button>
        {anything && (
          <button className="lx-btn lx-btn--ghost lx-btn--sm" onClick={resetAll}>
            {t('appearance.reset_all', { defaultValue: 'Reset all overrides' })}
          </button>
        )}
      </div>
    </Card>
  )
}
