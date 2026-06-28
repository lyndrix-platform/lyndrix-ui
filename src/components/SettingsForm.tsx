import { useState } from 'react'
import type { EditableSettingMeta } from '../lib/types'
import {
  Card,
  Field,
  SectionTitle,
  SaveButton,
  StatusMsg,
  EnvBadge,
  EnvHint,
  inputCls,
} from '../pages/settings/shared'

type FieldValue = string | boolean

/** Optional i18n function. Falls back to the literal label when not provided. */
export type TFunc = (key: string, opts?: { defaultValue?: string }) => string

const identityT: TFunc = (key, opts) => opts?.defaultValue ?? key

function initialValue(meta: EditableSettingMeta, raw: unknown): FieldValue {
  if (meta.kind === 'bool') {
    if (typeof raw === 'boolean') return raw
    return ['1', 'true', 'yes', 'on'].includes(String(raw ?? '').toLowerCase())
  }
  return raw === null || raw === undefined ? '' : String(raw)
}

export interface SettingsFormProps {
  /** Field metadata (key/kind/options/category/…). */
  metas: EditableSettingMeta[]
  /** Current values keyed by field. */
  config: Record<string, unknown>
  /** Fields locked by an environment variable (rendered read-only). */
  envLocked?: string[]
  /** Persists the changed (non-locked) values. Receives only the diff-able set. */
  submitFn: (updates: Record<string, unknown>) => Promise<unknown>
  /** Optional translator; without it, labels/hints fall back to their literals. */
  t?: TFunc
  /** Called after a successful save (e.g. to invalidate caches). */
  onSaved?: () => void
}

/**
 * Generic, metadata-driven settings form. Decoupled from any specific endpoint
 * or i18n instance: the caller injects `submitFn` (where to save) and an optional
 * `t` (how to translate). The host app wires it to `/api/system/config`; plugins
 * wire it to their own settings endpoint. Shared with plugins via
 * `window.__lyndrix_ui`.
 */
export default function SettingsForm({
  metas,
  config,
  envLocked = [],
  submitFn,
  t = identityT,
  onSaved,
}: SettingsFormProps) {
  const locked = (field: string) => envLocked.includes(field)

  const [form, setForm] = useState<Record<string, FieldValue>>(() =>
    Object.fromEntries(metas.map((m) => [m.field, initialValue(m, config[m.field])])),
  )
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const set = (field: string, value: FieldValue) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  async function save() {
    const updates: Record<string, unknown> = {}
    for (const m of metas) {
      if (!locked(m.field)) updates[m.field] = form[m.field]
    }
    if (Object.keys(updates).length === 0) return
    setSaving(true)
    try {
      await submitFn(updates)
      setStatus({ ok: true, msg: t('common.saved', { defaultValue: 'Saved.' }) })
      onSaved?.()
    } catch (e) {
      setStatus({
        ok: false,
        msg: e instanceof Error ? e.message : t('common.error', { defaultValue: 'Error' }),
      })
    } finally {
      setSaving(false)
    }
  }

  // Group fields by category, preserving the given order.
  const categories: string[] = []
  const byCategory: Record<string, EditableSettingMeta[]> = {}
  for (const m of metas) {
    if (!(m.category in byCategory)) {
      byCategory[m.category] = []
      categories.push(m.category)
    }
    byCategory[m.category].push(m)
  }

  // Labels/hints resolve via the API-provided keys (ns:key), falling back to a
  // convention key, then to the literal label/description.
  const labelOf = (m: EditableSettingMeta) =>
    t(m.label_key ?? `settings:field.${m.field}`, { defaultValue: m.label })
  const hintOf = (m: EditableSettingMeta) => {
    const h = t(m.description_key ?? `settings:field_desc.${m.field}`, {
      defaultValue: m.description ?? '',
    })
    return h || undefined
  }
  const categoryOf = (c: string, m?: EditableSettingMeta) =>
    t(m?.category_key ?? `settings:category.${c}`, { defaultValue: c })

  if (metas.length === 0) {
    return (
      <Card>
        <p className="text-sm text-[var(--lx-text-muted)]">
          {t('settings.no_editable', { defaultValue: 'No configurable settings available.' })}
        </p>
      </Card>
    )
  }

  const allLocked = metas.every((m) => locked(m.field))

  return (
    <div className="flex flex-col gap-4">
      {categories.map((cat) => (
        <Card key={cat}>
          <SectionTitle>{categoryOf(cat, byCategory[cat][0])}</SectionTitle>
          <div className="flex flex-col gap-3">
            {byCategory[cat].map((m) => {
              const isLocked = locked(m.field)
              const envVar = m.env_var ?? m.field
              const envValue = isLocked
                ? m.sensitive
                  ? '***'
                  : String(config[m.field] ?? '')
                : undefined

              if (m.kind === 'bool') {
                return (
                  <div key={m.field} className="flex flex-col gap-1">
                    <label
                      className={[
                        'flex items-center gap-2.5 text-sm',
                        isLocked
                          ? 'text-[var(--lx-text-muted)] opacity-60 cursor-not-allowed'
                          : 'text-[var(--lx-text)] cursor-pointer',
                      ].join(' ')}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(form[m.field])}
                        disabled={isLocked}
                        className="accent-[var(--lx-accent)]"
                        onChange={(e) => set(m.field, e.target.checked)}
                      />
                      {labelOf(m)}
                      {isLocked && <EnvBadge />}
                    </label>
                    {isLocked && <EnvHint envVar={envVar} envValue={envValue} />}
                    {hintOf(m) && (
                      <p className="text-[10px] text-[var(--lx-text-muted)]">{hintOf(m)}</p>
                    )}
                  </div>
                )
              }

              return (
                <Field
                  key={m.field}
                  label={labelOf(m)}
                  hint={hintOf(m)}
                  locked={isLocked}
                  envVar={envVar}
                  envValue={envValue}
                >
                  {m.kind === 'select' ? (
                    <select
                      className={inputCls}
                      value={String(form[m.field] ?? '')}
                      disabled={isLocked}
                      onChange={(e) => set(m.field, e.target.value)}
                    >
                      {m.options.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : m.multiline ? (
                    <textarea
                      className={`${inputCls} min-h-[80px] resize-y font-mono text-xs`}
                      value={String(form[m.field] ?? '')}
                      disabled={isLocked}
                      onChange={(e) => set(m.field, e.target.value)}
                    />
                  ) : (
                    <input
                      className={inputCls}
                      type={m.kind === 'int' ? 'number' : 'text'}
                      value={String(form[m.field] ?? '')}
                      disabled={isLocked}
                      onChange={(e) => set(m.field, e.target.value)}
                    />
                  )}
                </Field>
              )
            })}
          </div>
        </Card>
      ))}
      {status && <StatusMsg ok={status.ok} msg={status.msg} />}
      {!allLocked && <SaveButton onClick={() => void save()} loading={saving} />}
    </div>
  )
}
