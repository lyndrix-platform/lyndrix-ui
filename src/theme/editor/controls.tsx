// Reusable editor controls. Kept presentational + fully controlled — every value
// and change flows through the draft reducer in ThemeEditor. All styling reuses
// the platform's --lx-* tokens + .lx-input/.lx-btn classes so the controls
// themselves re-skin live with the draft they are editing.

import { useEffect, useRef, useState } from 'react'
import { toHex } from './colorUtil'

// ── ColorField ───────────────────────────────────────────────────────────────

export function ColorField({
  label,
  value,
  edited,
  onChange,
  onReset,
  note,
}: {
  label: string
  /** Effective value (edit ?? base) — any CSS colour string. */
  value: string
  /** Whether this key has an active edit (shows the reset affordance). */
  edited: boolean
  onChange: (hex: string) => void
  onReset: () => void
  /** Optional caption, e.g. the "no live preview" note for `info`. */
  note?: string
}) {
  const hex = toHex(value)
  return (
    <div className="flex items-center gap-3">
      <label className="relative shrink-0 w-8 h-8 rounded-md border border-[var(--lx-border-soft)] overflow-hidden cursor-pointer">
        <span className="absolute inset-0" style={{ background: value }} />
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer"
          aria-label={label}
        />
      </label>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--lx-text)] truncate">{label}</span>
          {edited && (
            <button
              onClick={onReset}
              className="text-[10px] text-[var(--lx-text-muted)] hover:text-[var(--lx-accent)]"
            >
              reset
            </button>
          )}
        </div>
        {note && <p className="text-[10px] text-[var(--lx-text-muted)] leading-tight">{note}</p>}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="lx-input lx-mono !w-28 shrink-0 text-xs !py-1.5"
      />
    </div>
  )
}

// ── SliderField (generalised GlassSlider) ──────────────────────────────────────

export function SliderField({
  label,
  desc,
  value,
  min,
  max,
  step,
  display,
  edited,
  onChange,
  onReset,
}: {
  label: string
  desc?: string
  value: number
  min: number
  max: number
  step: number
  /** Formatted current value shown on the right. */
  display: string
  edited?: boolean
  onChange: (v: number) => void
  onReset?: () => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-[var(--lx-text)]">{label}</label>
        <span className="flex items-center gap-2">
          {edited && onReset && (
            <button
              onClick={onReset}
              className="text-[10px] text-[var(--lx-text-muted)] hover:text-[var(--lx-accent)]"
            >
              reset
            </button>
          )}
          <span className="lx-mono text-xs text-[var(--lx-accent)] tabular-nums">{display}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full mt-1.5 accent-[var(--lx-accent)] cursor-pointer"
      />
      {desc && <p className="text-[11px] text-[var(--lx-text-muted)] mt-0.5">{desc}</p>}
    </div>
  )
}

// ── TextField ──────────────────────────────────────────────────────────────────

export function TextField({
  label,
  value,
  desc,
  mono,
  edited,
  onChange,
  onReset,
}: {
  label: string
  value: string
  desc?: string
  mono?: boolean
  edited?: boolean
  onChange: (v: string) => void
  onReset?: () => void
}) {
  // Local buffer so typing doesn't fight the reducer on every keystroke; commit
  // on blur / Enter. Keeps live preview snappy without re-rendering the tree per key.
  const [buf, setBuf] = useState(value)
  const dirty = useRef(false)
  useEffect(() => {
    if (!dirty.current) setBuf(value)
  }, [value])
  function commit(v: string) {
    dirty.current = false
    onChange(v)
  }
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-[var(--lx-text-muted)]">{label}</label>
        {edited && onReset && (
          <button
            onClick={onReset}
            className="text-[10px] text-[var(--lx-text-muted)] hover:text-[var(--lx-accent)]"
          >
            reset
          </button>
        )}
      </div>
      <input
        type="text"
        value={buf}
        spellCheck={false}
        onChange={(e) => {
          dirty.current = true
          setBuf(e.target.value)
        }}
        onBlur={() => commit(buf)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit(buf)
        }}
        className={`lx-input text-xs ${mono ? 'lx-mono' : ''}`}
      />
      {desc && <p className="text-[10px] text-[var(--lx-text-muted)]">{desc}</p>}
    </div>
  )
}

// ── NumberField (plain numeric input, e.g. z-index — no visual preview) ─────────

export function NumberField({
  label,
  value,
  min,
  max,
  step,
  desc,
  edited,
  onChange,
  onReset,
}: {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  desc?: string
  edited?: boolean
  onChange: (v: number) => void
  onReset?: () => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-[var(--lx-text-muted)]">{label}</label>
        {edited && onReset && (
          <button
            onClick={onReset}
            className="text-[10px] text-[var(--lx-text-muted)] hover:text-[var(--lx-accent)]"
          >
            reset
          </button>
        )}
      </div>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step ?? 1}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="lx-input lx-mono text-xs !py-1.5"
      />
      {desc && <p className="text-[10px] text-[var(--lx-text-muted)]">{desc}</p>}
    </div>
  )
}

// ── SelectField ─────────────────────────────────────────────────────────────────

export function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-[var(--lx-text-muted)]">{label}</label>
      <select className="lx-input text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

// ── PresetRow (quick-apply chips) ────────────────────────────────────────────────

export function PresetRow({
  label,
  presets,
  activeValue,
  onPick,
}: {
  label?: string
  presets: { label: string; value: string }[]
  /** When set, the chip whose value matches is highlighted. */
  activeValue?: string
  onPick: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <span className="text-[11px] font-medium text-[var(--lx-text-muted)]">{label}</span>
      )}
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => {
          const active = activeValue != null && activeValue === p.value
          return (
            <button
              key={p.label}
              onClick={() => onPick(p.value)}
              className="px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors"
              style={{
                borderColor: active ? 'var(--lx-accent)' : 'var(--lx-border-soft)',
                background: active
                  ? 'color-mix(in srgb, var(--lx-accent) 12%, transparent)'
                  : 'transparent',
                color: active ? 'var(--lx-accent)' : 'var(--lx-text-muted)',
              }}
            >
              {p.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Small section sub-heading used inside group panels. */
export function GroupSubhead({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--lx-text-muted)] mt-1">
      {children}
    </h4>
  )
}
