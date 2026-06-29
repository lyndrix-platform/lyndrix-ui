import { useGlassConfig } from '../lib/glassConfig'
import { LX_GLASS_FILTER_ID } from './LiquidGlassDefs'

// Edge refraction (filter: url(#…)) only renders in Chromium. Firefox/Safari
// keep the backdrop blur + saturation but skip the SVG displacement.
const IS_FIREFOX =
  typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('firefox')

export interface GlassSurfaceProps {
  children: React.ReactNode
  className?: string
  /** Corner radius override (defaults to the user's glass config). */
  radius?: number
  /** Apply the `.lx-card-hover` lift. */
  hover?: boolean
  onClick?: () => void
  style?: React.CSSProperties
}

/**
 * GlassSurface — the reusable liquid-glass panel.
 *
 * Layout-wise it's just a `position: relative; overflow: hidden` box, so it
 * drops into grids/flex like any card. Behind sharp content sits a `warp`
 * layer (`position:absolute; inset:0`) carrying `backdrop-filter` (frost +
 * saturation) and the shared `filter: url(#lx-glass-filter)` (edge refraction).
 *
 * When the effect is disabled (user toggle) it renders the plain CSS `.lx-card`
 * glass instead — identical layout, zero filter cost.
 */
export default function GlassSurface({
  children,
  className = '',
  radius,
  hover = false,
  onClick,
  style,
}: GlassSurfaceProps) {
  const cfg = useGlassConfig()
  const cornerRadius = radius ?? cfg.cornerRadius

  if (!cfg.enabled) {
    return (
      <div
        className={`lx-card ${hover ? 'lx-card-hover' : ''} ${onClick ? 'cursor-pointer' : ''} ${className}`}
        style={{ borderRadius: cornerRadius, ...style }}
        onClick={onClick}
      >
        {children}
      </div>
    )
  }

  const blurPx = (cfg.overLight ? 12 : 4) + cfg.blurAmount * 32
  const backdrop = `blur(${blurPx}px) saturate(${cfg.saturation}%)`

  return (
    <div
      className={`lx-glass-surface relative overflow-hidden ${hover ? 'lx-card-hover' : ''} ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      style={{ borderRadius: cornerRadius, ...style }}
      onClick={onClick}
    >
      {/* Warp layer — frosts and refracts the backdrop behind the surface. */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: cornerRadius,
          backdropFilter: backdrop,
          WebkitBackdropFilter: backdrop,
          filter: IS_FIREFOX ? undefined : `url(#${LX_GLASS_FILTER_ID})`,
          pointerEvents: 'none',
        }}
      />
      {/* Sharp content above the warp. */}
      <div className="relative" style={{ zIndex: 1 }}>
        {children}
      </div>
    </div>
  )
}
