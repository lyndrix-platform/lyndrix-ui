import { useEffect } from 'react'
import { useGlassConfig, type GlassMode } from '../lib/glassConfig'
import {
  displacementMap,
  polarDisplacementMap,
  prominentDisplacementMap,
} from '../lib/liquidGlassMaps'

/**
 * ONE shared liquid-glass SVG filter for the whole app.
 *
 * This is the port of rdev/liquid-glass-react's `GlassFilter`, but mounted a
 * single time (in App) instead of once per glass element. The filter uses
 * relative units (`x=-35% width=170%`, `preserveAspectRatio`) and a *static*
 * displacement map, so the same `#lx-glass-filter` can be referenced by any
 * number of surfaces of any size via `filter: url(#lx-glass-filter)`.
 *
 * That's the whole trick that makes the effect viable on a grid of tiles: no
 * per-instance React component, ResizeObserver, or duplicate `<filter>` — the
 * thing that made the library itself lag and render black at ~15 instances.
 *
 * Parameters (displacement scale, chromatic aberration, refraction map) come
 * from the user's glass personalization and update live.
 */

export const LX_GLASS_FILTER_ID = 'lx-glass-filter'

function mapFor(mode: GlassMode): string {
  switch (mode) {
    case 'polar':
      return polarDisplacementMap
    case 'prominent':
      return prominentDisplacementMap
    // The library's "shader" mode generates a per-size map at runtime, which
    // can't be shared across tiles — fall back to the standard map here.
    case 'shader':
    case 'standard':
    default:
      return displacementMap
  }
}

export default function LiquidGlassDefs() {
  const cfg = useGlassConfig()

  // Drive the CSS-only "glass on all tiles" path (host + every plugin's
  // `.lx-card`) via a root class + vars the stylesheet reads. This is what
  // makes the effect reach plugin UIs without editing/rebuilding them.
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('lx-glass-all', cfg.enabled && cfg.allTiles)
    const blurPx = (cfg.overLight ? 12 : 4) + cfg.blurAmount * 32
    root.style.setProperty('--lx-glass-blur-amt', `${blurPx}px`)
    root.style.setProperty('--lx-glass-sat', `${cfg.saturation}%`)
  }, [cfg.enabled, cfg.allTiles, cfg.overLight, cfg.blurAmount, cfg.saturation])

  if (!cfg.enabled) return null

  const id = LX_GLASS_FILTER_ID
  const { displacementScale, aberrationIntensity } = cfg
  const href = mapFor(cfg.mode)
  const sign = -1 // non-shader direction (matches the library)

  // Chromatic aberration needs THREE displacement passes (one per RGB channel) +
  // blends/composites — that's the bulk of the GPU cost and where the coloured
  // edge fringe comes from. When the user keeps aberration at 0 we render a
  // single displacement pass instead: ~3× cheaper and a clean (un-fringed) edge.
  // The displacement map is neutral-grey in the centre, so a single pass already
  // gives edge-only refraction with a sharp middle.
  const useAberration = aberrationIntensity > 0

  return (
    <svg
      aria-hidden="true"
      style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}
    >
      <defs>
        <filter
          id={id}
          x="-35%"
          y="-35%"
          width="170%"
          height="170%"
          colorInterpolationFilters="sRGB"
        >
          <feImage
            x="0"
            y="0"
            width="100%"
            height="100%"
            result="DISPLACEMENT_MAP"
            href={href}
            preserveAspectRatio="xMidYMid slice"
          />

          {!useAberration ? (
            /* Cheap path — single displacement of the backdrop. */
            <feDisplacementMap
              in="SourceGraphic"
              in2="DISPLACEMENT_MAP"
              scale={displacementScale * sign}
              xChannelSelector="R"
              yChannelSelector="B"
            />
          ) : (
            <>
              {/* Edge mask derived from the displacement map itself. */}
              <feColorMatrix
                in="DISPLACEMENT_MAP"
                type="matrix"
                values="0.3 0.3 0.3 0 0 0.3 0.3 0.3 0 0 0.3 0.3 0.3 0 0 0 0 0 1 0"
                result="EDGE_INTENSITY"
              />
              <feComponentTransfer in="EDGE_INTENSITY" result="EDGE_MASK">
                <feFuncA type="discrete" tableValues={`0 ${aberrationIntensity * 0.05} 1`} />
              </feComponentTransfer>

              {/* Undisplaced original for the clean center. */}
              <feOffset in="SourceGraphic" dx="0" dy="0" result="CENTER_ORIGINAL" />

              {/* Per-channel displacement → chromatic aberration. */}
              <feDisplacementMap
                in="SourceGraphic"
                in2="DISPLACEMENT_MAP"
                scale={displacementScale * sign}
                xChannelSelector="R"
                yChannelSelector="B"
                result="RED_DISPLACED"
              />
              <feColorMatrix
                in="RED_DISPLACED"
                type="matrix"
                values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0"
                result="RED_CHANNEL"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="DISPLACEMENT_MAP"
                scale={displacementScale * (sign - aberrationIntensity * 0.05)}
                xChannelSelector="R"
                yChannelSelector="B"
                result="GREEN_DISPLACED"
              />
              <feColorMatrix
                in="GREEN_DISPLACED"
                type="matrix"
                values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0"
                result="GREEN_CHANNEL"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="DISPLACEMENT_MAP"
                scale={displacementScale * (sign - aberrationIntensity * 0.1)}
                xChannelSelector="R"
                yChannelSelector="B"
                result="BLUE_DISPLACED"
              />
              <feColorMatrix
                in="BLUE_DISPLACED"
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0"
                result="BLUE_CHANNEL"
              />

              <feBlend in="GREEN_CHANNEL" in2="BLUE_CHANNEL" mode="screen" result="GB_COMBINED" />
              <feBlend in="RED_CHANNEL" in2="GB_COMBINED" mode="screen" result="RGB_COMBINED" />

              <feGaussianBlur
                in="RGB_COMBINED"
                stdDeviation={Math.max(0.1, 0.5 - aberrationIntensity * 0.1)}
                result="ABERRATED_BLURRED"
              />

              {/* Aberration only at the edges; clean original in the center. */}
              <feComposite in="ABERRATED_BLURRED" in2="EDGE_MASK" operator="in" result="EDGE_ABERRATION" />
              <feComponentTransfer in="EDGE_MASK" result="INVERTED_MASK">
                <feFuncA type="table" tableValues="1 0" />
              </feComponentTransfer>
              <feComposite in="CENTER_ORIGINAL" in2="INVERTED_MASK" operator="in" result="CENTER_CLEAN" />
              <feComposite in="EDGE_ABERRATION" in2="CENTER_CLEAN" operator="over" />
            </>
          )}
        </filter>
      </defs>
    </svg>
  )
}
