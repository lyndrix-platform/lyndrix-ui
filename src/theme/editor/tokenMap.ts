// Single source of truth for the editor's token model. Two responsibilities:
//
//   1. DEFAULT_TOKENS — the Phase-1 default tokens.json, copied VERBATIM from
//      lyndrix-core/app/assets/themes/default/tokens.json. Used to backfill any
//      category/key a loaded pack omits, so a v1 colour-only pack still opens
//      fully populated (mirrors the engine's per-key contract-default backfill).
//
//   2. tokensToVarDelta(edits) — turns edited tokens into a per-mode `--lx-*`
//      CSS-variable delta, mirroring lyndrix-core's ThemeEngine.resolve_css_variables
//      EXACTLY (colour key → var, radius.DEFAULT → --lx-radius, shadow.glow → also
//      the --lx-glow alias, typography.font_sans → --lx-font-sans, spacing.unit →
//      --lx-space-unit, …). Only EDITED tokens produce vars — un-edited tokens
//      stay server-resolved, so the engine remains authoritative and preview
//      parity is guaranteed for everything the user didn't touch.
//
// IMPORTANT — engine-composed vars are NOT token-derived, so we never fake them:
//   • --lx-border, --lx-border-soft, --lx-surface-glass are hardcoded rgba()
//     literals in the engine (not resolved from any colour token). Editing
//     `primary` will therefore NOT shift them in preview or in a saved pack.
//     That is engine parity, not a bug — do not derive them client-side.
//   • The `info` colour token has NO --lx-* CSS variable in the engine at all;
//     it only feeds NiceGUI's runtime (Quasar) palette. So editing `info`
//     produces no browser-scope preview/override, but it IS still carried in the
//     draft and lands in a saved tokens.json (step 4) where the engine's
//     resolve_runtime_palette() consumes it. COLOR_VAR_MAP[info] is [] on purpose.

import type { EditorEdits, ThemeTokens } from './draft'

// ── Phase-1 default tokens (verbatim from default/tokens.json) ──────────────────

export const DEFAULT_TOKENS: ThemeTokens = {
  colors: {
    primary: { light: '#0891b2', dark: '#00d4ff' },
    secondary: { light: '#0284c7', dark: '#0ea5e9' },
    accent: { light: '#7c3aed', dark: '#8b5cf6' },
    positive: { light: '#0891b2', dark: '#22d3ee' },
    negative: { light: '#ef4444', dark: '#f87171' },
    info: { light: '#0ea5e9', dark: '#00d4ff' },
    warning: { light: '#f59e0b', dark: '#fbbf24' },
    bg_body: { light: '#f1f5f9', dark: '#0a0e1a' },
    bg_surface: { light: '#ffffff', dark: '#0f1629' },
    bg_elevated: { light: '#e2e8f0', dark: '#162040' },
    text_body: { light: '#0f172a', dark: '#f0f6ff' },
    text_muted: { light: '#64748b', dark: '#94a3b8' },
    text_subtle: { light: '#94a3b8', dark: '#94a3b8' },
  },
  radius: {
    sm: '0.125rem',
    DEFAULT: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    full: '9999px',
  },
  spacing: {
    unit: '0.25rem',
  },
  typography: {
    font_sans:
      "'Lyndrix System Sans', 'JetBrainsMonoNL Nerd Font Propo', 'JetBrainsMono Nerd Font Propo', 'JetBrains Mono', 'Noto Sans', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    font_mono:
      "'Lyndrix System Mono', 'JetBrainsMonoNL Nerd Font Mono', 'JetBrainsMono Nerd Font Mono', 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
    text_scale: '1',
    text_2xs: 'calc(0.6875rem * var(--lx-text-scale))',
    text_3xs: 'calc(0.625rem * var(--lx-text-scale))',
  },
  shadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.25)',
    md: '0 8px 24px -12px rgb(0 0 0 / 0.45)',
    lg: '0 30px 80px -20px rgb(0 0 0 / 0.6)',
    glow: '0 0 30px rgb(0 212 255 / 0.3)',
  },
  blur: {
    xs: '10px',
    sm: '8px',
    md: '16px',
    lg: '24px',
  },
  transition: {
    fast: '150ms',
    base: '250ms',
    slow: '400ms',
    ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  gradient: {
    accent: 'linear-gradient(135deg, var(--lx-accent), var(--lx-accent-2), var(--lx-accent-3))',
    success: 'linear-gradient(90deg, var(--lx-state-success), var(--lx-chart-8))',
    warning: 'linear-gradient(90deg, var(--lx-warning), var(--lx-chart-4))',
    info: 'linear-gradient(90deg, var(--lx-accent-2), var(--lx-accent))',
    danger: 'linear-gradient(90deg, var(--lx-state-down), var(--lx-chart-5))',
  },
  border: {
    width: '1px',
    rail: '3px',
  },
  icon: {
    xs: '14px',
    sm: '16px',
    md: '18px',
    lg: '32px',
  },
  zindex: {
    dropdown: '1000',
    modal: '1100',
    toast: '1200',
  },
  effect: {
    glass_saturate: '160%',
    badge_bg_opacity: '0.15',
    badge_border_opacity: '0.30',
  },
  background_images: {
    light: 'background-light.webp',
    dark: 'background-dark.webp',
  },
}

/** Deep-clone the default tokens (so callers can mutate/backfill safely). */
export function cloneDefaultTokens(): ThemeTokens {
  return JSON.parse(JSON.stringify(DEFAULT_TOKENS)) as ThemeTokens
}

/**
 * Merge a partially-populated pack (`GET /api/themes/{id}` → tokens) over the
 * Phase-1 defaults so every category/key is present. Mirrors the engine's
 * per-key backfill: a v1 colour-only pack opens fully populated. Colours are
 * merged per-key so a pack that ships only, say, `primary` keeps default values
 * for the other 12 keys.
 */
export function backfillTokens(loaded: Partial<ThemeTokens> | null | undefined): ThemeTokens {
  const base = cloneDefaultTokens()
  if (!loaded) return base
  const out: ThemeTokens = base
  if (loaded.colors) {
    for (const [k, v] of Object.entries(loaded.colors)) {
      out.colors[k] = { ...(out.colors[k] ?? { light: '#000000', dark: '#000000' }), ...v }
    }
  }
  for (const g of ['radius', 'spacing', 'typography', 'shadow', 'blur', 'transition', 'gradient', 'border', 'icon', 'zindex', 'effect'] as const) {
    const src = loaded[g]
    if (src) out[g] = { ...out[g], ...src }
  }
  if (loaded.background_images) {
    out.background_images = { ...out.background_images, ...loaded.background_images }
  }
  return out
}

// ── Colour key → --lx-* var map (mirrors engine.resolve_css_variables) ──────────
// A colour key can drive MORE THAN ONE var: `warning` writes both
// --lx-state-paused and --lx-warning, exactly like the engine. `info` maps to
// nothing (see the header note). `text_subtle` drives --lx-state-unknown.

export const COLOR_VAR_MAP: Record<string, string[]> = {
  // Accents
  primary: ['--lx-accent'],
  secondary: ['--lx-accent-2'],
  accent: ['--lx-accent-3'],
  // Surfaces
  bg_body: ['--lx-bg'],
  bg_surface: ['--lx-surface'],
  bg_elevated: ['--lx-elevated'],
  // Text
  text_body: ['--lx-text'],
  text_muted: ['--lx-text-muted'],
  text_subtle: ['--lx-state-unknown'],
  // States
  positive: ['--lx-state-up'],
  negative: ['--lx-state-down'],
  warning: ['--lx-state-paused', '--lx-warning'],
  info: [], // no engine CSS var — feeds NiceGUI runtime palette only.
}

/** Ordered colour keys (drives the Colours group + any iteration order). */
export const COLOR_KEYS: string[] = Object.keys(DEFAULT_TOKENS.colors)

// ── Non-colour category → --lx-* var maps (mirror the engine's _*_VARS) ─────────

export const RADIUS_VARS: Record<string, string> = {
  sm: '--lx-radius-sm',
  DEFAULT: '--lx-radius',
  md: '--lx-radius-md',
  lg: '--lx-radius-lg',
  xl: '--lx-radius-xl',
  '2xl': '--lx-radius-2xl',
  '3xl': '--lx-radius-3xl',
  full: '--lx-radius-full',
}
export const SPACING_VARS: Record<string, string> = { unit: '--lx-space-unit' }
export const TYPOGRAPHY_VARS: Record<string, string> = {
  font_sans: '--lx-font-sans',
  font_mono: '--lx-font-mono',
  text_scale: '--lx-text-scale',
  text_2xs: '--lx-text-2xs',
  text_3xs: '--lx-text-3xs',
}
export const SHADOW_VARS: Record<string, string> = {
  sm: '--lx-shadow-sm',
  md: '--lx-shadow-md',
  lg: '--lx-shadow-lg',
  glow: '--lx-shadow-glow',
}
export const BLUR_VARS: Record<string, string> = {
  xs: '--lx-blur-xs',
  sm: '--lx-blur-sm',
  md: '--lx-blur-md',
  lg: '--lx-blur-lg',
}
export const TRANSITION_VARS: Record<string, string> = {
  fast: '--lx-transition-fast',
  base: '--lx-transition-base',
  slow: '--lx-transition-slow',
  ease: '--lx-ease',
}
export const GRADIENT_VARS: Record<string, string> = {
  accent: '--lx-gradient-accent',
  success: '--lx-gradient-success',
  warning: '--lx-gradient-warning',
  info: '--lx-gradient-info',
  danger: '--lx-gradient-danger',
}
export const BORDER_VARS: Record<string, string> = {
  width: '--lx-border-width',
  rail: '--lx-rail-width',
}

/** (edits key, var map) pairs for the flat non-colour categories. */
const SCALAR_CATEGORIES: ReadonlyArray<
  [keyof Omit<EditorEdits, 'colors' | 'background_images'>, Record<string, string>]
> = [
  ['radius', RADIUS_VARS],
  ['spacing', SPACING_VARS],
  ['typography', TYPOGRAPHY_VARS],
  ['shadow', SHADOW_VARS],
  ['blur', BLUR_VARS],
  ['transition', TRANSITION_VARS],
  ['gradient', GRADIENT_VARS],
  ['border', BORDER_VARS],
]

export interface VarDelta {
  light: Record<string, string>
  dark: Record<string, string>
}

/**
 * Turn the current edits into a per-mode `--lx-*` delta.
 *
 * Colours are per-mode (each edited leaf writes only its own mode). Non-colour
 * tokens are mode-INDEPENDENT in the engine (same value in both modes), so we
 * write them into BOTH the light and dark deltas. This is load-bearing: the
 * light block is scoped `:root[data-theme="light"]` (specificity (0,2,0)),
 * which outranks a plain `:root` block (0,1,0) regardless of source order — so a
 * non-colour var written only to dark would be shadowed by the theme's light
 * block in light mode. Writing both modes guarantees the draft wins everywhere.
 *
 * shadow.glow additionally writes the legacy --lx-glow alias, exactly as the
 * engine does (`css["--lx-glow"] = css["--lx-shadow-glow"]`).
 */
export function tokensToVarDelta(edits: EditorEdits): VarDelta {
  const light: Record<string, string> = {}
  const dark: Record<string, string> = {}

  // Colours — per mode.
  for (const [key, pair] of Object.entries(edits.colors)) {
    const vars = COLOR_VAR_MAP[key]
    if (!vars || vars.length === 0) continue
    if (pair.light != null) for (const v of vars) light[v] = pair.light
    if (pair.dark != null) for (const v of vars) dark[v] = pair.dark
  }

  // Non-colour categories — same value in both modes.
  for (const [group, map] of SCALAR_CATEGORIES) {
    const values = edits[group]
    for (const [key, val] of Object.entries(values)) {
      const v = map[key]
      if (!v || val == null) continue
      light[v] = val
      dark[v] = val
      if (group === 'shadow' && key === 'glow') {
        light['--lx-glow'] = val
        dark['--lx-glow'] = val
      }
    }
  }

  return { light, dark }
}
