import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { apiFetch, ApiError } from '../lib/api'
import { toast } from '../lib/toast'
import type { PluginSettingField } from '../lib/types'

type RunState =
  | { phase: 'idle' }
  | { phase: 'confirm' }
  | { phase: 'running' }
  | { phase: 'done'; message: string; details: Record<string, unknown> }
  | { phase: 'error'; message: string }

/** Pulls a readable summary out of an action reply: its `message`, plus any
 *  numeric counters (deleted, monitors, heartbeats, …) as a compact list. */
function summarize(reply: unknown): { message: string; details: Record<string, unknown> } {
  const r = (reply && typeof reply === 'object' ? reply : {}) as Record<string, unknown>
  const details: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(r)) {
    if (k === 'message' || k === 'status') continue
    if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') details[k] = v
  }
  return { message: typeof r.message === 'string' ? r.message : '', details }
}

function ActionRow({ pluginId, field }: { pluginId: string; field: PluginSettingField }) {
  const { t } = useTranslation('ui')
  const [state, setState] = useState<RunState>({ phase: 'idle' })

  async function run() {
    setState({ phase: 'running' })
    try {
      const reply = await apiFetch<unknown>(`/api/plugins/${pluginId}${field.action ?? ''}`, {
        method: (field.method ?? 'POST').toUpperCase(),
      })
      const { message, details } = summarize(reply)
      setState({ phase: 'done', message, details })
      toast.success(message || t('plugin_actions.done'))
    } catch (e) {
      const msg = e instanceof ApiError || e instanceof Error ? e.message : String(e)
      setState({ phase: 'error', message: msg })
      toast.error(t('plugin_actions.failed', { error: msg }))
    }
  }

  const buttonClass = field.danger ? 'lx-btn lx-btn--danger lx-btn--sm' : 'lx-btn lx-btn--secondary lx-btn--sm'

  return (
    <li className="rounded-lg px-3 py-2.5 flex flex-col gap-2" style={{ background: 'var(--lx-elevated)' }}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--lx-text)]">{field.label}</p>
          {field.description && (
            <p className="text-xs text-[var(--lx-text-muted)] mt-0.5">{field.description}</p>
          )}
          {field.danger && (
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--lx-state-down)' }}>
              {t('plugin_actions.danger_hint')}
            </p>
          )}
        </div>
        {state.phase === 'running' ? (
          <span className="flex items-center gap-2 text-xs text-[var(--lx-accent)] shrink-0">
            <span className="lx-spinner" /> {t('plugin_actions.running')}
          </span>
        ) : state.phase === 'confirm' ? null : (
          <button
            type="button"
            className={buttonClass}
            onClick={() => (field.confirm ? setState({ phase: 'confirm' }) : void run())}
          >
            {t('plugin_actions.run')}
          </button>
        )}
      </div>

      {state.phase === 'confirm' && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--lx-text)]">
            {t('plugin_actions.confirm_question', { label: field.label })}
          </span>
          <button type="button" className="lx-btn lx-btn--danger lx-btn--sm" onClick={() => void run()}>
            {t('plugin_actions.confirm')}
          </button>
          <button type="button" className="lx-btn lx-btn--ghost lx-btn--sm" onClick={() => setState({ phase: 'idle' })}>
            {t('plugin_actions.cancel')}
          </button>
        </div>
      )}

      {state.phase === 'done' && (
        <p className="text-xs" style={{ color: 'var(--lx-state-up)' }}>
          {state.message || t('plugin_actions.done')}
          {Object.keys(state.details).length > 0 && (
            <span className="font-mono text-[var(--lx-text-muted)]">
              {' '}
              ({Object.entries(state.details).map(([k, v]) => `${k}: ${String(v)}`).join(', ')})
            </span>
          )}
        </p>
      )}
      {state.phase === 'error' && (
        <p className="text-xs" style={{ color: 'var(--lx-state-down)' }}>
          {t('plugin_actions.failed', { error: state.message })}
        </p>
      )}
    </li>
  )
}

/**
 * Buttons for `settings_schema` fields of kind "action" (core API ≥ 1.6),
 * grouped by category. Each calls the plugin's own route and shows the reply.
 */
export default function PluginActionsPanel({
  pluginId,
  actions,
}: {
  pluginId: string
  actions: PluginSettingField[]
}) {
  const { t } = useTranslation('ui')
  if (actions.length === 0) return null
  const groups = new Map<string, PluginSettingField[]>()
  for (const a of actions) {
    const cat = a.category || t('plugin_actions.section')
    groups.set(cat, [...(groups.get(cat) ?? []), a])
  }
  return (
    <div className="flex flex-col gap-4 mt-6">
      {[...groups.entries()].map(([category, fields]) => (
        <section key={category}>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--lx-text-muted)] mb-2">
            {category}
          </h4>
          <ul className="flex flex-col gap-1.5">
            {fields.map((f) => (
              <ActionRow key={f.key} pluginId={pluginId} field={f} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
