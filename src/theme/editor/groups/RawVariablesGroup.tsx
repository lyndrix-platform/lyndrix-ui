import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, RotateCcw, Cpu } from 'lucide-react'
import { GroupSubhead } from '../controls'
import { toHex } from '../colorUtil'
import { cssVarTools, type CssVarTools } from './cssVars'
import type { GroupProps } from './common'

// Completeness panel: a raw override for EVERY `--lx-*` variable, backed by the
// css_variables[mode] escape-hatch. This is the only way to reach vars with no
// semantic control — including engine-COMPOSED literals (--lx-border,
// --lx-border-soft, --lx-surface-glass) and shell-only glass/popover vars that
// resolve_css_variables never emits. Writes flow through the same draft path as
// every other control (live preview + saved into css_variables).
//
// The panel classifies each section so it can render the right control (colour
// swatch, gradient bar, or plain text), tag the section by kind, and flag the
// engine-composed group explicitly.

type Kind = 'colour' | 'dimension' | 'gradient' | 'effect' | 'engine' | 'mixed'

interface Section {
  titleKey: string
  title: string
  kind: Kind
  vars: string[]
  /** Extra caption, e.g. for the engine-composed section. */
  noteKey?: string
  note?: string
}

const SECTIONS: Section[] = [
  {
    titleKey: 'editor.raw.surfaces',
    title: 'Surfaces & text',
    kind: 'colour',
    vars: ['--lx-bg', '--lx-surface', '--lx-elevated', '--lx-text', '--lx-text-muted', '--lx-on-accent-text'],
  },
  {
    titleKey: 'editor.raw.accents',
    title: 'Accents',
    kind: 'colour',
    vars: ['--lx-accent', '--lx-accent-2', '--lx-accent-3'],
  },
  {
    titleKey: 'editor.raw.states',
    title: 'States',
    kind: 'colour',
    vars: [
      '--lx-state-up', '--lx-state-down', '--lx-state-paused', '--lx-state-unknown',
      '--lx-state-success', '--lx-state-marked', '--lx-warning',
    ],
  },
  {
    titleKey: 'editor.raw.charts',
    title: 'Chart hues',
    kind: 'colour',
    vars: Array.from({ length: 8 }, (_, i) => `--lx-chart-${i + 1}`),
  },
  {
    titleKey: 'editor.raw.gradients',
    title: 'Gradients',
    kind: 'gradient',
    vars: ['--lx-gradient-accent', '--lx-gradient-success', '--lx-gradient-warning', '--lx-gradient-info', '--lx-gradient-danger'],
  },
  {
    titleKey: 'editor.raw.terminal',
    title: 'Terminal / log',
    kind: 'colour',
    vars: ['--lx-terminal-bg', '--lx-terminal-fg', '--lx-terminal-accent', '--lx-log-bg', '--lx-log-fg', '--lx-log-accent'],
  },
  {
    titleKey: 'editor.raw.borders',
    title: 'Borders & glass (shell-only)',
    kind: 'engine',
    noteKey: 'editor.raw.borders_note',
    note: 'Shell-only glass/popover vars no colour token drives. The main glass/border surfaces (--lx-surface-glass, --lx-border, …) moved to Colors → "Glass & borders" — edit them there.',
    vars: [
      '--lx-border-width', '--lx-rail-width',
      '--lx-glass-highlight', '--lx-glass-shadow', '--lx-glass-blur', '--lx-glass-saturate',
      '--lx-popover-glass', '--lx-popover-shadow',
    ],
  },
  {
    titleKey: 'editor.raw.radius',
    title: 'Radius',
    kind: 'dimension',
    vars: ['--lx-radius-sm', '--lx-radius', '--lx-radius-md', '--lx-radius-lg', '--lx-radius-xl', '--lx-radius-2xl', '--lx-radius-3xl', '--lx-radius-full'],
  },
  {
    titleKey: 'editor.raw.shadow',
    title: 'Shadow & blur',
    kind: 'effect',
    vars: ['--lx-shadow-sm', '--lx-shadow-md', '--lx-shadow-lg', '--lx-shadow-glow', '--lx-glow', '--lx-blur-xs', '--lx-blur-sm', '--lx-blur-md', '--lx-blur-lg'],
  },
  {
    titleKey: 'editor.raw.type',
    title: 'Typography',
    kind: 'mixed',
    vars: ['--lx-font-sans', '--lx-font-mono', '--lx-text-scale', '--lx-text-2xs', '--lx-text-3xs'],
  },
  {
    titleKey: 'editor.raw.motion',
    title: 'Motion',
    kind: 'dimension',
    vars: ['--lx-transition-fast', '--lx-transition-base', '--lx-transition-slow', '--lx-ease'],
  },
  {
    titleKey: 'editor.raw.misc',
    title: 'Misc',
    kind: 'mixed',
    vars: [
      '--lx-space-unit', '--lx-icon-xs', '--lx-icon-sm', '--lx-icon-md', '--lx-icon-lg',
      '--lx-z-dropdown', '--lx-z-modal', '--lx-z-toast', '--lx-scrim',
      '--lx-badge-bg-opacity', '--lx-badge-border-opacity',
      '--lx-bg-image', '--lx-bg-image-size', '--lx-bg-image-position',
    ],
  },
]

// ── Value classification (drives which control a row renders) ────────────────────

const COLOUR_RE = /^(#([0-9a-f]{3}|[0-9a-f]{6})|rgba?\(|hsla?\()/i

function isColour(v: string): boolean {
  const s = v.trim()
  if (COLOUR_RE.test(s)) return true
  // rgb() with no alpha and space syntax (rgb(0 0 0 / .5)) — caught by rgba? above.
  return false
}
function isGradient(v: string): boolean {
  return /gradient\(/i.test(v)
}

const KIND_LABELS: Record<Kind, { key: string; label: string }> = {
  colour: { key: 'editor.raw.kind_colour', label: 'colour' },
  dimension: { key: 'editor.raw.kind_dimension', label: 'dimension' },
  gradient: { key: 'editor.raw.kind_gradient', label: 'gradient' },
  effect: { key: 'editor.raw.kind_effect', label: 'effect' },
  engine: { key: 'editor.raw.kind_engine', label: 'engine-composed' },
  mixed: { key: 'editor.raw.kind_mixed', label: 'mixed' },
}

// ── One variable row ─────────────────────────────────────────────────────────────

function RawVarRow({ name, css }: { name: string; css: CssVarTools }) {
  const { t } = useTranslation('ui')
  const value = css.value(name)
  const edited = css.edited(name)
  const colour = isColour(value)
  const gradient = isGradient(value)

  const reset = edited ? (
    <button
      onClick={() => css.reset(name)}
      title={t('editor.reset', { defaultValue: 'Reset' })}
      className="inline-flex items-center gap-1 text-[10px] text-[var(--lx-text-muted)] hover:text-[var(--lx-accent)] shrink-0"
    >
      <RotateCcw size={11} />
      {t('editor.reset', { defaultValue: 'Reset' })}
    </button>
  ) : null

  // Compact single-line row for colours; two-line for everything else (values
  // like gradients / font stacks / calc() need the full width).
  if (colour) {
    return (
      <div className="flex items-center gap-2.5">
        <label className="relative shrink-0 w-7 h-7 rounded-md border border-[var(--lx-border-soft)] overflow-hidden cursor-pointer">
          <span className="absolute inset-0" style={{ background: value }} />
          <input
            type="color"
            value={toHex(value)}
            onChange={(e) => css.set(name, e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer"
            aria-label={name}
          />
        </label>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <code className="lx-mono text-[11px] text-[var(--lx-text)] truncate">{name}</code>
            {edited && <span className="w-1.5 h-1.5 rounded-full bg-[var(--lx-accent)] shrink-0" />}
          </div>
          {reset}
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => css.set(name, e.target.value)}
          spellCheck={false}
          className="lx-input lx-mono !w-28 shrink-0 text-xs !py-1.5"
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        {gradient && (
          <span
            className="shrink-0 w-7 h-7 rounded-md border border-[var(--lx-border-soft)]"
            style={{ background: value }}
          />
        )}
        <code className="lx-mono text-[11px] text-[var(--lx-text)] truncate">{name}</code>
        {edited && <span className="w-1.5 h-1.5 rounded-full bg-[var(--lx-accent)] shrink-0" />}
        <span className="ml-auto">{reset}</span>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => css.set(name, e.target.value)}
        spellCheck={false}
        className="lx-input lx-mono text-xs !py-1.5"
      />
    </div>
  )
}

// ── Kind tag chip ────────────────────────────────────────────────────────────────

function KindTag({ kind }: { kind: Kind }) {
  const { t } = useTranslation('ui')
  const { key, label } = KIND_LABELS[kind]
  const engine = kind === 'engine'
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
      style={{
        borderColor: engine ? 'var(--lx-warning)' : 'var(--lx-border-soft)',
        color: engine ? 'var(--lx-warning)' : 'var(--lx-text-muted)',
        background: engine ? 'color-mix(in srgb, var(--lx-warning) 10%, transparent)' : 'transparent',
      }}
    >
      {engine && <Cpu size={9} />}
      {t(key, { defaultValue: label })}
    </span>
  )
}

// ── Panel ────────────────────────────────────────────────────────────────────────

export default function RawVariablesGroup({ draft, dispatch, mode, baseCssVars }: GroupProps) {
  const { t } = useTranslation('ui')
  const css = cssVarTools(draft, dispatch, mode, baseCssVars)
  const [filter, setFilter] = useState('')
  const q = filter.trim().toLowerCase()

  const sections = useMemo(
    () =>
      SECTIONS.map((s) => ({
        ...s,
        matched: q ? s.vars.filter((v) => v.toLowerCase().includes(q)) : s.vars,
      })).filter((s) => s.matched.length > 0),
    [q],
  )

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[11px] text-[var(--lx-text-muted)]">
        {t('editor.raw.intro', {
          defaultValue:
            'Override ANY --lx-* variable directly (current {{mode}} mode). Includes engine-composed vars with no semantic control. Saved into the pack’s css_variables.',
          mode: t(`appearance.${mode}`, { defaultValue: mode }),
        })}
      </p>

      {/* Sticky search so the (long) list stays filterable while scrolling. The
          blurred backdrop keeps scrolled rows from bleeding through behind it. */}
      <div
        className="sticky top-0 z-10 -mx-4 sm:-mx-5 px-4 sm:px-5 py-2 -mt-2 backdrop-blur-md"
        style={{ background: 'color-mix(in srgb, var(--lx-bg) 75%, transparent)' }}
      >
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--lx-text-muted)] pointer-events-none"
          />
          <input
            className="lx-input text-sm !pl-9"
            placeholder={t('editor.raw.filter', { defaultValue: 'Filter variables…' })}
            value={filter}
            spellCheck={false}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      {sections.length === 0 && (
        <p className="text-xs text-[var(--lx-text-muted)] py-4 text-center">
          {t('editor.raw.no_match', { defaultValue: 'No variables match “{{q}}”.', q: filter })}
        </p>
      )}

      {sections.map((section) => (
        <div
          key={section.title}
          className="rounded-xl border border-[var(--lx-border-soft)] p-3 flex flex-col gap-3"
          style={{ background: 'color-mix(in srgb, var(--lx-surface) 40%, transparent)' }}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <GroupSubhead>{t(section.titleKey, { defaultValue: section.title })}</GroupSubhead>
            <KindTag kind={section.kind} />
            <span className="ml-auto text-[10px] text-[var(--lx-text-subtle)] tabular-nums">
              {section.matched.length}
            </span>
          </div>
          {section.note && (
            <p className="text-[10px] text-[var(--lx-text-muted)] leading-snug -mt-1">
              {t(section.noteKey ?? '', { defaultValue: section.note })}
            </p>
          )}
          <div className="flex flex-col gap-2.5">
            {section.matched.map((name) => (
              <RawVarRow key={name} name={name} css={css} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
