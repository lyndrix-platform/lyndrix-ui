// Shared preview surface for the theme editor.
//
// Every block here is STATELESS and paints purely from `--lx-*` CSS variables, so
// it re-skins live off the editor's top-layer draft (`#lx-editor-draft`, written by
// ThemeProvider.setDraftVars) exactly like the real app. That lets the SAME blocks
// back both the desktop side panel (FullPreview / contextual) and the mobile
// inline preview (GroupPreview) — no duplicated markup, no prop plumbing.
//
//   • GroupPreview({ group })  → the CONTEXTUAL slice for the active group.
//   • FullPreview              → the whole curated canvas (every block).
//
// Kept out of the group panels themselves so a group can stay a pure control list.

import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import GlassSurface from '../../components/GlassSurface'
import type { GroupId } from './groups/common'

// ── Layout helpers ──────────────────────────────────────────────────────────────

/** Eyebrow label above a preview block. */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--lx-text-muted)]">
      {children}
    </p>
  )
}

/** A titled preview block. */
function Blk({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <Eyebrow>{title}</Eyebrow>
      {children}
    </section>
  )
}

// ── Individual blocks (each keyed to a token family) ─────────────────────────────

function TypeSample({ t }: { t: TFunction }) {
  return (
    <div>
      <h3 className="text-lg font-semibold" style={{ color: 'var(--lx-text)' }}>
        {t('editor.preview.heading', { defaultValue: 'Live preview' })}
      </h3>
      <p className="text-sm" style={{ color: 'var(--lx-text)' }}>
        {t('editor.preview.body', {
          defaultValue: 'Body text renders in the sans stack at the current text scale.',
        })}
      </p>
      <p className="text-xs" style={{ color: 'var(--lx-text-muted)' }}>
        {t('editor.preview.muted', { defaultValue: 'Muted secondary text.' })}
      </p>
      <p className="lx-mono text-xs mt-1" style={{ color: 'var(--lx-text-muted)' }}>
        {t('editor.preview.mono', { defaultValue: 'const mono = "0123";' })}
      </p>
    </div>
  )
}

function TypeRamp({ t }: { t: TFunction }) {
  const rows: [string, string][] = [
    ['text-2xl', t('editor.preview.type_display', { defaultValue: 'Display' })],
    ['text-lg', t('editor.preview.type_heading', { defaultValue: 'Heading' })],
    ['text-sm', t('editor.preview.type_body', { defaultValue: 'Body copy' })],
    ['text-xs', t('editor.preview.type_meta', { defaultValue: 'Meta / caption' })],
  ]
  return (
    <div className="flex flex-col gap-1">
      {rows.map(([cls, label]) => (
        <div key={cls} className={`${cls} font-semibold`} style={{ color: 'var(--lx-text)' }}>
          {label}
        </div>
      ))}
      <p className="lx-mono text-xs mt-1" style={{ color: 'var(--lx-text-muted)' }}>
        {t('editor.preview.mono', { defaultValue: 'const mono = "0123";' })}
      </p>
    </div>
  )
}

function ButtonRow({ t }: { t: TFunction }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button className="lx-btn lx-btn--primary lx-btn--sm">
        {t('editor.preview.primary_btn', { defaultValue: 'Primary' })}
      </button>
      <button className="lx-btn lx-btn--secondary lx-btn--sm">
        {t('editor.preview.secondary_btn', { defaultValue: 'Secondary' })}
      </button>
      <button className="lx-btn lx-btn--ghost lx-btn--sm">
        {t('editor.preview.ghost_btn', { defaultValue: 'Ghost' })}
      </button>
    </div>
  )
}

function InputSample({ t }: { t: TFunction }) {
  return (
    <input
      className="lx-input text-sm"
      placeholder={t('editor.preview.input', { defaultValue: 'Input field' })}
      readOnly
    />
  )
}

function BadgeRow() {
  const badges = ['up', 'down', 'paused', 'unknown', 'success', 'accent', 'muted']
  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((b) => (
        <span key={b} className={`lx-badge lx-badge--${b}`}>
          <span className="lx-dot" />
          {b}
        </span>
      ))}
    </div>
  )
}

/** Success / marked / on-accent — the semantic extras edited in the Colours group. */
function SemanticSwatches({ t }: { t: TFunction }) {
  return (
    <div className="flex flex-wrap gap-2">
      <span
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium"
        style={{ background: 'var(--lx-state-success)', color: 'var(--lx-on-accent-text)' }}
      >
        {t('editor.preview.success', { defaultValue: 'success' })}
      </span>
      <span
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium"
        style={{ background: 'var(--lx-state-marked)', color: 'var(--lx-on-accent-text)' }}
      >
        {t('editor.preview.marked', { defaultValue: 'selected' })}
      </span>
      <span
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold"
        style={{ background: 'var(--lx-accent)', color: 'var(--lx-on-accent-text)' }}
      >
        {t('editor.preview.on_accent', { defaultValue: 'on accent' })}
      </span>
    </div>
  )
}

function ChartStrip() {
  return (
    <div className="flex h-8 w-full overflow-hidden rounded-md border border-[var(--lx-border-soft)]">
      {Array.from({ length: 8 }, (_, i) => (
        <span key={i} className="flex-1" style={{ background: `var(--lx-chart-${i + 1})` }} />
      ))}
    </div>
  )
}

/** Mini bar chart cycling the 8 categorical hues — shows them in situ. */
function MiniBarChart() {
  const bars = [60, 85, 45, 95, 70, 40, 80, 55]
  return (
    <div
      className="flex items-end gap-1.5 h-24 rounded-lg p-2.5 border border-[var(--lx-border-soft)]"
      style={{ background: 'var(--lx-surface)' }}
    >
      {bars.map((h, i) => (
        <span
          key={i}
          className="flex-1 rounded-t-sm"
          style={{ height: `${h}%`, background: `var(--lx-chart-${i + 1})` }}
        />
      ))}
    </div>
  )
}

function GradientAccentBar({ t }: { t: TFunction }) {
  return (
    <div
      className="h-10 rounded-lg"
      style={{ background: 'var(--lx-gradient-accent)' }}
      aria-label={t('editor.preview.gradient', { defaultValue: 'Accent gradient' })}
    />
  )
}

function GradientFamily() {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(['success', 'warning', 'info', 'danger'] as const).map((g) => (
        <div key={g} className="flex flex-col gap-1">
          <div className="h-6 rounded-md" style={{ background: `var(--lx-gradient-${g})` }} />
          <span className="text-[10px]" style={{ color: 'var(--lx-text-muted)' }}>
            {g}
          </span>
        </div>
      ))}
    </div>
  )
}

function TerminalSample() {
  return (
    <div className="lx-terminal text-[11px]">
      <div>
        <span className="lx-terminal-accent">lyndrix@core</span>:~$ systemctl status vault
      </div>
      <div>● vault.service — Lyndrix secrets backend</div>
      <div>
        &nbsp;&nbsp;Active: <span className="lx-terminal-accent">active (running)</span>
      </div>
      <div>&nbsp;&nbsp;boot: vault:opened → db:connected → iam:ready</div>
    </div>
  )
}

function IconRamp() {
  return (
    <div className="flex items-end gap-3">
      {(['--lx-icon-xs', '--lx-icon-sm', '--lx-icon-md', '--lx-icon-lg'] as const).map((v) => (
        <span
          key={v}
          className="rounded-md shrink-0"
          style={{ width: `var(${v})`, height: `var(${v})`, background: 'var(--lx-accent)' }}
          aria-label={v}
        />
      ))}
    </div>
  )
}

/** Active-nav rail sample + a couple of rows — shows the rail-width token. */
function RailSample({ t }: { t: TFunction }) {
  return (
    <div
      className="rounded-lg overflow-hidden border border-[var(--lx-border-soft)]"
      style={{ background: 'var(--lx-surface)' }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium"
        style={{
          color: 'var(--lx-accent)',
          borderLeft: 'var(--lx-rail-width) solid var(--lx-accent)',
          background: 'color-mix(in srgb, var(--lx-accent) 10%, transparent)',
        }}
      >
        {t('editor.preview.rail_active', { defaultValue: 'Active nav item' })}
      </div>
      <div
        className="flex items-center gap-2 px-3 py-2 text-sm"
        style={{ color: 'var(--lx-text-muted)', borderLeft: 'var(--lx-rail-width) solid transparent' }}
      >
        {t('editor.preview.rail_idle', { defaultValue: 'Idle nav item' })}
      </div>
    </div>
  )
}

function ShadowChips() {
  const keys = ['sm', 'md', 'lg', 'glow'] as const
  return (
    <div className="flex flex-wrap items-center gap-4 px-1 py-2">
      {keys.map((k) => (
        <div key={k} className="flex flex-col items-center gap-1.5">
          <span
            className="w-11 h-11 rounded-lg bg-[var(--lx-surface)] border border-[var(--lx-border-soft)]"
            style={{ boxShadow: `var(--lx-shadow-${k})` }}
          />
          <span className="text-[10px]" style={{ color: 'var(--lx-text-muted)' }}>
            {k}
          </span>
        </div>
      ))}
    </div>
  )
}

/** A frosted tile over the themed backdrop — shows blur/glass depth. */
function GlassTile({ t }: { t: TFunction }) {
  return (
    <div
      className="rounded-xl overflow-hidden p-3"
      style={{
        backgroundImage: 'var(--lx-bg-image)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: 'var(--lx-elevated)',
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="lx-card p-3">
          <p className="text-[11px]" style={{ color: 'var(--lx-text-muted)' }}>
            {t('editor.preview.card', { defaultValue: 'Card' })}
          </p>
          <p className="text-sm font-semibold" style={{ color: 'var(--lx-text)' }}>
            surface
          </p>
        </div>
        <GlassSurface>
          <div className="px-3 py-3">
            <p className="text-[11px]" style={{ color: 'var(--lx-text-muted)' }}>
              {t('editor.preview.glass', { defaultValue: 'Glass' })}
            </p>
            <p className="text-sm font-semibold" style={{ color: 'var(--lx-text)' }}>
              tile
            </p>
          </div>
        </GlassSurface>
      </div>
    </div>
  )
}

function ScrimSample({ t }: { t: TFunction }) {
  return (
    <div className="relative h-24 rounded-lg overflow-hidden border border-[var(--lx-border-soft)]">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'var(--lx-bg-image)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: 'var(--lx-elevated)',
        }}
      />
      <div className="absolute inset-0" style={{ background: 'var(--lx-scrim)' }} />
      <div className="absolute inset-0 grid place-items-center">
        <span className="lx-card px-3 py-2 text-xs font-medium" style={{ color: 'var(--lx-text)' }}>
          {t('editor.preview.modal', { defaultValue: 'Modal over scrim' })}
        </span>
      </div>
    </div>
  )
}

/** Shape: rounded surfaces at a few radii + a bordered field. */
function ShapeSample({ t }: { t: TFunction }) {
  const radii: [string, string][] = [
    ['var(--lx-radius-sm)', 'sm'],
    ['var(--lx-radius-lg)', 'lg'],
    ['var(--lx-radius-2xl)', '2xl'],
    ['var(--lx-radius-full)', 'full'],
  ]
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        {radii.map(([r, label]) => (
          <div key={label} className="flex flex-col items-center gap-1.5">
            <span
              className="w-12 h-12 border"
              style={{
                borderRadius: r,
                borderWidth: 'var(--lx-border-width)',
                borderColor: 'var(--lx-border)',
                background: 'var(--lx-surface)',
              }}
            />
            <span className="text-[10px]" style={{ color: 'var(--lx-text-muted)' }}>
              {label}
            </span>
          </div>
        ))}
      </div>
      <button className="lx-btn lx-btn--primary lx-btn--sm self-start">
        {t('editor.preview.rounded_btn', { defaultValue: 'Rounded button' })}
      </button>
    </div>
  )
}

/** Density: a stack whose gaps scale with --lx-space-unit. */
function DensitySample({ t }: { t: TFunction }) {
  return (
    <div className="flex flex-col" style={{ gap: 'calc(var(--lx-space-unit) * 3)' }}>
      {[
        t('editor.preview.row_one', { defaultValue: 'List row one' }),
        t('editor.preview.row_two', { defaultValue: 'List row two' }),
        t('editor.preview.row_three', { defaultValue: 'List row three' }),
      ].map((label, i) => (
        <div
          key={i}
          className="rounded-md border border-[var(--lx-border-soft)] text-sm"
          style={{
            color: 'var(--lx-text)',
            background: 'var(--lx-surface)',
            padding: 'calc(var(--lx-space-unit) * 2) calc(var(--lx-space-unit) * 3)',
          }}
        >
          {label}
        </div>
      ))}
    </div>
  )
}

/** Motion: an always-running slide whose duration tracks --lx-transition-base. */
function MotionSample({ t }: { t: TFunction }) {
  return (
    <div className="flex flex-col gap-2">
      <style>{`@keyframes lxEditorSlide{0%,100%{transform:translateX(0)}50%{transform:translateX(calc(100% - 1.5rem))}}`}</style>
      <div
        className="relative h-6 rounded-full overflow-hidden border border-[var(--lx-border-soft)]"
        style={{ background: 'var(--lx-surface)' }}
      >
        <span
          className="absolute top-1/2 left-1 -translate-y-1/2 h-4 w-6 rounded-full"
          style={{
            background: 'var(--lx-gradient-accent)',
            animation: 'lxEditorSlide var(--lx-transition-slow, 400ms) var(--lx-ease) infinite',
          }}
        />
      </div>
      <p className="text-[10px]" style={{ color: 'var(--lx-text-muted)' }}>
        {t('editor.preview.motion_note', { defaultValue: 'Loops at the slow-transition duration.' })}
      </p>
    </div>
  )
}

// ── Contextual composition per group ─────────────────────────────────────────────

/**
 * The focused preview for one group — a small, relevant slice of the canvas.
 * Rendered under the controls on mobile and in the "Focus" side panel on desktop.
 * Paints entirely from CSS vars, so it tracks the live draft with no props.
 */
export function GroupPreview({ group }: { group: GroupId }) {
  const { t } = useTranslation('ui')

  switch (group) {
    case 'colors':
      return (
        <div className="flex flex-col gap-4">
          <TypeSample t={t} />
          <ButtonRow t={t} />
          <InputSample t={t} />
          <Blk title={t('editor.preview.badges', { defaultValue: 'State badges' })}>
            <BadgeRow />
          </Blk>
          <Blk title={t('editor.preview.semantic', { defaultValue: 'Semantic extras' })}>
            <SemanticSwatches t={t} />
          </Blk>
        </div>
      )
    case 'shape':
      return (
        <div className="flex flex-col gap-4">
          <ShapeSample t={t} />
          <ButtonRow t={t} />
          <InputSample t={t} />
        </div>
      )
    case 'density':
      return (
        <div className="flex flex-col gap-4">
          <DensitySample t={t} />
          <ButtonRow t={t} />
        </div>
      )
    case 'typography':
      return <TypeRamp t={t} />
    case 'depth':
      return (
        <div className="flex flex-col gap-4">
          <Blk title={t('editor.preview.shadows', { defaultValue: 'Shadow tiers' })}>
            <ShadowChips />
          </Blk>
          <Blk title={t('editor.preview.glass', { defaultValue: 'Blur / glass' })}>
            <GlassTile t={t} />
          </Blk>
        </div>
      )
    case 'motion':
      return <MotionSample t={t} />
    case 'gradient':
      return (
        <div className="flex flex-col gap-4">
          <Blk title={t('editor.preview.gradient', { defaultValue: 'Accent gradient' })}>
            <GradientAccentBar t={t} />
          </Blk>
          <Blk title={t('editor.preview.gradient_family', { defaultValue: 'Semantic stripes' })}>
            <GradientFamily />
          </Blk>
        </div>
      )
    case 'charts':
      return (
        <div className="flex flex-col gap-4">
          <ChartStrip />
          <MiniBarChart />
        </div>
      )
    case 'terminal':
      return <TerminalSample />
    case 'sizing':
      return (
        <div className="flex flex-col gap-4">
          <Blk title={t('editor.preview.icons', { defaultValue: 'Icon sizes' })}>
            <IconRamp />
          </Blk>
          <Blk title={t('editor.preview.rail', { defaultValue: 'Nav rail' })}>
            <RailSample t={t} />
          </Blk>
        </div>
      )
    case 'effects':
      return (
        <div className="flex flex-col gap-4">
          <Blk title={t('editor.preview.badges', { defaultValue: 'Badges' })}>
            <BadgeRow />
          </Blk>
          <Blk title={t('editor.preview.glass', { defaultValue: 'Glass' })}>
            <GlassTile t={t} />
          </Blk>
          <Blk title={t('editor.preview.scrim', { defaultValue: 'Modal scrim' })}>
            <ScrimSample t={t} />
          </Blk>
        </div>
      )
    case 'background':
      return (
        <div className="flex flex-col gap-4">
          <GlassTile t={t} />
        </div>
      )
    case 'raw':
      // Raw touches everything → show the whole canvas.
      return <FullPreview />
    default:
      return <FullPreview />
  }
}

/** The complete curated canvas — every block, for the "Full" preview view. */
export function FullPreview() {
  const { t } = useTranslation('ui')
  return (
    <div className="flex flex-col gap-4">
      <TypeSample t={t} />
      <ButtonRow t={t} />
      <InputSample t={t} />
      <Blk title={t('editor.preview.badges', { defaultValue: 'State badges' })}>
        <BadgeRow />
      </Blk>
      <Blk title={t('editor.preview.icons', { defaultValue: 'Icon sizes' })}>
        <IconRamp />
      </Blk>
      <Blk title={t('editor.preview.charts', { defaultValue: 'Chart palette' })}>
        <ChartStrip />
      </Blk>
      <Blk title={t('editor.preview.gradient_family', { defaultValue: 'Semantic stripes' })}>
        <GradientFamily />
      </Blk>
      <Blk title={t('editor.preview.terminal', { defaultValue: 'Terminal' })}>
        <TerminalSample />
      </Blk>
      <Blk title={t('editor.preview.surfaces', { defaultValue: 'Surfaces & glass' })}>
        <GlassTile t={t} />
      </Blk>
      <Blk title={t('editor.preview.gradient', { defaultValue: 'Accent gradient' })}>
        <GradientAccentBar t={t} />
      </Blk>
    </div>
  )
}

/**
 * A framed preview surface used on desktop (side panel) and mobile (inline).
 * The frame paints the page background so the sample reads as a mini-app.
 */
export function PreviewCanvas({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col gap-4 rounded-2xl p-4 border border-[var(--lx-glass-border)]"
      style={{ background: 'var(--lx-bg)' }}
    >
      {children}
    </div>
  )
}
