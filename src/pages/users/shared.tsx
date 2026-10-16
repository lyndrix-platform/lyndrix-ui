// Small presentational building blocks shared by the user panel and the group
// editor. No data fetching here — every component is driven by props.
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { PermissionDefOut } from '../../lib/types'
import type { Origin, RoleDefOut } from './permissionModel'
import { groupByCategory, matchesQuery } from './permissionModel'

export const inputCls = 'lx-input'

export type Status = { ok: boolean; msg: string } | null

export function Badge({
  label,
  color = 'accent',
}: {
  label: string
  color?: 'accent' | 'muted' | 'down' | 'success'
}) {
  const cls = {
    accent: 'lx-badge--accent',
    muted: 'lx-badge--muted',
    down: 'lx-badge--down',
    success: 'lx-badge--success',
  }[color]
  return <span className={`lx-badge ${cls}`}>{label}</span>
}

export function ActionButton({
  onClick,
  label,
  danger,
  small,
  disabled,
}: {
  onClick: () => void
  label: string
  danger?: boolean
  small?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`lx-btn ${danger ? 'lx-btn--danger' : 'lx-btn--secondary'} ${small ? 'lx-btn--sm' : ''}`}
    >
      {label}
    </button>
  )
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className = '',
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  className?: string
}) {
  return (
    <input
      className={`${inputCls} text-xs py-1.5 ${className}`}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function ToggleSwitch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={[
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-40 shrink-0',
        checked ? 'bg-[var(--lx-accent)]' : 'bg-[var(--lx-border-soft)]',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-3.5 w-3.5 transform rounded-full bg-[var(--lx-on-accent-text)] shadow transition-transform duration-200',
          checked ? 'translate-x-4' : 'translate-x-1',
        ].join(' ')}
      />
    </button>
  )
}

export function StatusLine({ status }: { status: Status }) {
  if (!status) return null
  return (
    <p className={`text-xs ${status.ok ? 'text-[var(--lx-state-up)]' : 'text-[var(--lx-state-down)]'}`}>
      {status.msg}
    </p>
  )
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const dim = { sm: 'w-6 h-6 text-[10px]', md: 'w-7 h-7 text-xs', lg: 'w-10 h-10 text-sm' }[size]
  return (
    <div
      className={`${dim} rounded-full bg-[var(--lx-elevated-glass)] border border-[var(--lx-border-soft)] flex items-center justify-center font-medium text-[var(--lx-accent)] shrink-0`}
    >
      {(name[0] ?? '?').toUpperCase()}
    </div>
  )
}

/** Two-step inline confirmation for destructive actions. */
export function ConfirmAction({
  label,
  question,
  onConfirm,
  pending,
}: {
  label: string
  question: string
  onConfirm: () => void
  pending?: boolean
}) {
  const { t } = useTranslation('ui')
  const [armed, setArmed] = useState(false)
  if (!armed) return <ActionButton label={label} danger onClick={() => setArmed(true)} />
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-xs text-[var(--lx-state-down)]">{question}</span>
      <ActionButton small label={t('users_page.delete_yes')} danger disabled={pending} onClick={onConfirm} />
      <ActionButton small label={t('users_page.cancel')} onClick={() => setArmed(false)} />
    </div>
  )
}

// ── Origins ───────────────────────────────────────────────────────────────────

function originText(o: Origin, t: TFunction<'ui'>): string {
  switch (o.kind) {
    case 'role':
      return o.group
        ? t('users_page.origin_via_role_group', { role: o.roleLabel, group: o.group })
        : t('users_page.origin_via_role', { name: o.roleLabel })
    case 'group':
      return t('users_page.origin_via_group', { name: o.group })
    case 'implied':
      return t('users_page.origin_implied', { name: o.byLabel })
    case 'inherited':
      return t('users_page.origin_inherited')
  }
}

type ChipTone = 'direct' | 'role' | 'group' | 'muted'

const chipTone: Record<ChipTone, string> = {
  direct: 'border-[var(--lx-accent)] bg-[var(--lx-accent)] text-[var(--lx-on-accent-text)]',
  role: 'border-[var(--lx-accent)] text-[var(--lx-accent)]',
  group: 'border-[var(--lx-accent-2)] text-[var(--lx-accent-2)]',
  muted: 'border-[var(--lx-border-soft)] text-[var(--lx-text-muted)]',
}

export function Chip({ label, tone, title }: { label: string; tone: ChipTone; title?: string }) {
  return (
    <span
      title={title ?? label}
      className={`inline-block max-w-[16rem] truncate px-1.5 py-px rounded-full border text-[10px] font-medium leading-4 ${chipTone[tone]}`}
    >
      {label}
    </span>
  )
}

/** Compact "where does this come from" chips; overflow collapses into "+n". */
export function OriginChips({ origins, max = 2 }: { origins: Origin[]; max?: number }) {
  const { t } = useTranslation('ui')
  if (origins.length === 0) return null
  const shown = origins.slice(0, max)
  const rest = origins.slice(max)
  const toneOf = (o: Origin): ChipTone => (o.kind === 'role' ? 'role' : o.kind === 'group' ? 'group' : 'muted')
  return (
    <>
      {shown.map((o, i) => (
        <Chip key={i} label={originText(o, t)} tone={toneOf(o)} />
      ))}
      {rest.length > 0 && (
        <Chip label={`+${rest.length}`} tone="muted" title={rest.map((o) => originText(o, t)).join('\n')} />
      )}
    </>
  )
}

// ── Role card ─────────────────────────────────────────────────────────────────

export function RoleCard({
  role,
  checked,
  viaGroups,
  onToggle,
  disabled,
  toggleTitle,
  isHeld,
  labelOf,
}: {
  role: RoleDefOut
  /** Assigned directly to the subject. */
  checked: boolean
  /** Groups of the subject that carry this role (users only). */
  viaGroups: string[]
  onToggle: () => void
  disabled?: boolean
  toggleTitle: string
  /** Whether the subject already holds a permission through OTHER sources. */
  isHeld: (permId: string) => boolean
  labelOf: (permId: string) => string
}) {
  const { t } = useTranslation('ui')
  const [open, setOpen] = useState(false)
  const active = checked || viaGroups.length > 0
  const covered = active ? 0 : role.permissions.filter(isHeld).length

  return (
    <div
      className={`rounded-lg border bg-[var(--lx-elevated-glass)] transition-colors ${
        active ? 'border-[var(--lx-accent)]' : 'border-[var(--lx-border-soft)]'
      }`}
    >
      <div className="flex items-start gap-3 px-3 py-2.5">
        <input
          type="checkbox"
          className="accent-[var(--lx-accent)] mt-0.5 shrink-0"
          checked={checked}
          disabled={disabled}
          onChange={onToggle}
          title={toggleTitle}
          aria-label={toggleTitle}
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm text-[var(--lx-text)]">{role.label}</span>
            {checked && <Chip label={t('users_page.origin_direct')} tone="direct" />}
            {viaGroups.map((g) => (
              <Chip key={g} label={t('users_page.origin_via_group', { name: g })} tone="group" />
            ))}
          </div>
          {role.description && (
            <p className="text-xs text-[var(--lx-text-muted)] mt-0.5">{role.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[10px] text-[var(--lx-text-muted)]">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="inline-flex items-center gap-0.5 hover:text-[var(--lx-text)]"
            >
              <span className="material-icons" style={{ fontSize: 14 }}>
                {open ? 'expand_less' : 'expand_more'}
              </span>
              {t('users_page.role_contains', { count: role.permissions.length })}
            </button>
            {covered > 0 && (
              <span>{t('users_page.role_coverage', { included: covered, total: role.permissions.length })}</span>
            )}
            {role.auto_map_groups.length > 0 && (
              <span className="truncate">
                {t('users_page.role_auto_map', { groups: role.auto_map_groups.join(', ') })}
              </span>
            )}
          </div>
        </div>
      </div>
      {open && (
        <ul className="px-3 pb-2.5 pl-9 flex flex-col gap-1">
          {role.permissions.map((p) => {
            const held = active || isHeld(p)
            return (
              <li key={p} className="flex items-baseline gap-2 text-xs min-w-0">
                <span
                  className={`material-icons shrink-0 ${held ? 'text-[var(--lx-accent)]' : 'text-[var(--lx-text-muted)]'}`}
                  style={{ fontSize: 14, position: 'relative', top: 2 }}
                  title={held ? t('users_page.already_included') : undefined}
                >
                  {held ? 'check' : 'radio_button_unchecked'}
                </span>
                <span className="text-[var(--lx-text)]">{labelOf(p)}</span>
                <span className="font-mono text-[10px] text-[var(--lx-text-muted)] truncate">{p}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ── Permission rows ───────────────────────────────────────────────────────────

export interface PermissionState {
  /** Granted directly to the subject (toggle on). */
  direct: boolean
  /** Non-direct sources — a non-empty list means "already included". */
  origins: Origin[]
}

export function PermissionRow({
  perm,
  state,
  onToggle,
  disabled,
}: {
  perm: PermissionDefOut
  state: PermissionState
  onToggle: () => void
  disabled?: boolean
}) {
  const { t } = useTranslation('ui')
  const included = state.origins.length > 0
  const lockedIncluded = included && !state.direct
  return (
    <div
      title={lockedIncluded ? t('users_page.permission_included_title') : perm.description || perm.id}
      className={`flex items-center gap-3 px-3 py-1.5 rounded-md border bg-[var(--lx-elevated-glass)] ${
        state.direct ? 'border-[var(--lx-accent)]' : 'border-[var(--lx-border-soft)]'
      } ${lockedIncluded ? 'opacity-75' : ''}`}
    >
      {lockedIncluded ? (
        <span
          className="material-icons text-[var(--lx-accent)] w-9 text-center shrink-0"
          style={{ fontSize: 18 }}
          aria-label={t('users_page.already_included')}
        >
          check_circle
        </span>
      ) : (
        <ToggleSwitch
          checked={state.direct}
          onChange={onToggle}
          disabled={disabled}
          label={perm.label || perm.id}
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[var(--lx-text)] truncate">{perm.label || perm.id}</p>
        <p className="font-mono text-[10px] text-[var(--lx-text-muted)] truncate">{perm.id}</p>
      </div>
      {included && (
        <div className="flex flex-wrap items-center justify-end gap-1 max-w-[50%]">
          {state.direct && (
            <span className="text-[10px] text-[var(--lx-text-muted)]">{t('users_page.also_label')}</span>
          )}
          <OriginChips origins={state.origins} />
        </div>
      )}
    </div>
  )
}

/** Catalog grouped by category with search and an optional "hide included" filter. */
export function PermissionCategoryList({
  perms,
  query,
  hideIncluded,
  stateOf,
  onToggle,
  disabled,
}: {
  perms: PermissionDefOut[]
  query: string
  hideIncluded: boolean
  stateOf: (perm: PermissionDefOut) => PermissionState
  onToggle: (permId: string) => void
  disabled?: boolean
}) {
  const { t } = useTranslation('ui')
  const q = query.trim().toLowerCase()
  const visible = perms.filter((p) => matchesQuery(q, p.label, p.id, p.category, p.plugin_id))
  const groups = groupByCategory(visible)
    .map(([cat, list]) => {
      const rows = list.map((p) => ({ perm: p, state: stateOf(p) }))
      const kept = hideIncluded ? rows.filter((r) => r.state.direct || r.state.origins.length === 0) : rows
      return { cat, rows: kept }
    })
    .filter((g) => g.rows.length > 0)

  if (groups.length === 0) {
    return <p className="text-xs text-[var(--lx-text-muted)]">{t('users_page.no_perms_found')}</p>
  }
  return (
    <div className="flex flex-col gap-4">
      {groups.map(({ cat, rows }) => (
        <div key={cat}>
          <p className="lx-eyebrow mb-1.5">
            {t(`users_page.category_${cat}`, { defaultValue: cat })}
            <span className="ml-1.5 font-normal normal-case tracking-normal">{rows.length}</span>
          </p>
          <div className="flex flex-col gap-1">
            {rows.map(({ perm, state }) => (
              <PermissionRow
                key={perm.id}
                perm={perm}
                state={state}
                onToggle={() => onToggle(perm.id)}
                disabled={disabled}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
