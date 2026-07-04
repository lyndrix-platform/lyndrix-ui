// NOTE: explicit `.js` extension required — tailwindcss ships this as a CJS
// file without an "exports" map entry for the extensionless specifier, so
// strict Node ESM resolution (used by Vite's config loader) needs it spelled
// out or the import silently mis-resolves (surfaces as a confusing unrelated
// postcss/sucrase parse error deep in vite build).
import defaultTheme from 'tailwindcss/defaultTheme.js'

// Theming v2 Phase 1 — point the Tailwind scales at the `--lx-*` design tokens
// the core engine emits (GET /api/themes/{id}/css-vars), so existing utility
// classes (rounded-xl, p-4, shadow, gap-3, font-mono, duration-...) become
// theme-driven automatically instead of baking in fixed rem/px values. The
// bundled defaults in src/index.css mirror the same var *values* so offline /
// first-paint (before ThemeProvider injects the server payload) looks right.
// See lyndrix-core/docs/theming-v2-plan.md + the Phase 1 token contract.

/**
 * Re-expresses Tailwind's default numeric spacing scale as multiples of the
 * themeable `--lx-space-unit` (default 0.25rem — Tailwind's own base step),
 * so every padding/margin/gap/width/height utility stays pixel-identical by
 * default but rescales globally when a theme changes the unit. `px` stays a
 * literal 1px.
 */
function themedSpacing() {
  const scale = {}
  for (const key of Object.keys(defaultTheme.spacing)) {
    scale[key] = key === 'px' ? '1px' : `calc(var(--lx-space-unit) * ${key})`
  }
  return scale
}

/**
 * Wraps Tailwind's default fontSize scale so every step scales with the
 * themeable `--lx-text-scale` multiplier (default 1 = unchanged).
 */
function themedFontSize() {
  const scale = {}
  for (const [key, value] of Object.entries(defaultTheme.fontSize)) {
    const [size, rest] = value
    scale[key] = [`calc(${size} * var(--lx-text-scale))`, rest]
  }
  return scale
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', './.design-sync/previews/**/*.tsx'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--lx-font-sans)'],
        mono: ['var(--lx-font-mono)'],
      },
      colors: {
        lx: {
          bg: 'var(--lx-bg)',
          surface: 'var(--lx-surface)',
          elevated: 'var(--lx-elevated)',
          accent: 'var(--lx-accent)',
          'accent-2': 'var(--lx-accent-2)',
          'accent-3': 'var(--lx-accent-3)',
          text: 'var(--lx-text)',
          'text-muted': 'var(--lx-text-muted)',
          border: 'var(--lx-border)',
          'border-soft': 'var(--lx-border-soft)',
          // T0 — semantic state extensions + on-accent foreground.
          'state-up': 'var(--lx-state-up)',
          'state-down': 'var(--lx-state-down)',
          'state-paused': 'var(--lx-state-paused)',
          'state-unknown': 'var(--lx-state-unknown)',
          'state-success': 'var(--lx-state-success)',
          'state-marked': 'var(--lx-state-marked)',
          'on-accent': 'var(--lx-on-accent-text)',
          // T0 — categorical 8-hue palette (qualitative data).
          'chart-1': 'var(--lx-chart-1)',
          'chart-2': 'var(--lx-chart-2)',
          'chart-3': 'var(--lx-chart-3)',
          'chart-4': 'var(--lx-chart-4)',
          'chart-5': 'var(--lx-chart-5)',
          'chart-6': 'var(--lx-chart-6)',
          'chart-7': 'var(--lx-chart-7)',
          'chart-8': 'var(--lx-chart-8)',
        },
      },
      // Aligned to Tailwind's own default radius scale (the contract's values
      // *are* the Tailwind defaults), so rounded-* utilities keep working and
      // become theme-driven at the same time.
      borderRadius: {
        sm: 'var(--lx-radius-sm)',
        DEFAULT: 'var(--lx-radius)',
        md: 'var(--lx-radius-md)',
        lg: 'var(--lx-radius-lg)',
        xl: 'var(--lx-radius-xl)',
        '2xl': 'var(--lx-radius-2xl)',
        '3xl': 'var(--lx-radius-3xl)',
        full: 'var(--lx-radius-full)',
      },
      spacing: themedSpacing(),
      // Base scale rides --lx-text-scale; the 2xs/3xs micro steps ride the
      // dedicated --lx-text-2xs/3xs tokens (which already fold in the scale).
      fontSize: {
        ...themedFontSize(),
        '2xs': ['var(--lx-text-2xs)', { lineHeight: '1rem' }],
        '3xs': ['var(--lx-text-3xs)', { lineHeight: '0.875rem' }],
      },
      boxShadow: {
        sm: 'var(--lx-shadow-sm)',
        DEFAULT: 'var(--lx-shadow-md)',
        lg: 'var(--lx-shadow-lg)',
        glow: 'var(--lx-shadow-glow)',
      },
      backdropBlur: {
        xs: 'var(--lx-blur-xs)',
        sm: 'var(--lx-blur-sm)',
        md: 'var(--lx-blur-md)',
        lg: 'var(--lx-blur-lg)',
      },
      blur: {
        xs: 'var(--lx-blur-xs)',
        sm: 'var(--lx-blur-sm)',
        md: 'var(--lx-blur-md)',
        lg: 'var(--lx-blur-lg)',
      },
      transitionDuration: {
        fast: 'var(--lx-transition-fast)',
        DEFAULT: 'var(--lx-transition-base)',
        slow: 'var(--lx-transition-slow)',
      },
      transitionTimingFunction: {
        DEFAULT: 'var(--lx-ease)',
      },
      zIndex: {
        dropdown: 'var(--lx-z-dropdown)',
        modal: 'var(--lx-z-modal)',
        toast: 'var(--lx-z-toast)',
      },
    },
  },
  plugins: [],
}
