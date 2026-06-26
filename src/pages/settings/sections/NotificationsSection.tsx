import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { Lock, GripVertical, ChevronDown, Inbox } from 'lucide-react'
import { apiFetch } from '../../../lib/api'
import { Card, SectionTitle, StatusMsg, inputCls } from '../shared'

// ─── Types (mirror /api/notifications/*) ─────────────────────────────────────

interface NotifEndpoint {
  plugin_id: string
  plugin_name: string
  endpoint_name: string
  description: string
  active: boolean
  provider: string | null
  active_is_env_locked: boolean
  provider_is_env_locked: boolean
}

interface NotifProvider {
  provider_id: string
  display_name: string
  capabilities: string[]
}

interface ProviderConfigField {
  key: string
  label: string
  env_var: string
  sensitive: boolean
  placeholder: string
  is_env_locked: boolean
  current_value: string
  configured: boolean
}

interface Bucket {
  id: string
  name: string
  provider: NotifProvider | null
}

const DEFAULT_BUCKET = '__default__'
const epId = (ep: NotifEndpoint) => `${ep.plugin_id}/${ep.endpoint_name}`
const bucketOf = (provider: string | null) => provider ?? DEFAULT_BUCKET

// ─── Provider credential config (collapsible inside a bucket) ────────────────

function ProviderConfigPanel({ provider }: { provider: NotifProvider }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  const { data } = useQuery({
    queryKey: ['notif-provider-config', provider.provider_id],
    queryFn: () =>
      apiFetch<{ fields: ProviderConfigField[] }>(
        `/api/notifications/providers/${provider.provider_id}/config`,
      ),
  })

  const fields = data?.fields ?? []
  const editable = fields.filter((f) => !f.is_env_locked)

  const save = useMutation({
    mutationFn: () => {
      const values: Record<string, string> = {}
      for (const f of editable) {
        const v = form[f.key]
        if (v === undefined) continue
        if (f.sensitive && v.trim() === '') continue // blank secret keeps existing
        values[f.key] = v
      }
      return apiFetch(`/api/notifications/providers/${provider.provider_id}/config`, {
        method: 'PATCH',
        body: JSON.stringify({ values }),
      })
    },
    onSuccess: () => {
      setStatus({ ok: true, msg: 'Gespeichert.' })
      setForm({})
      void qc.invalidateQueries({ queryKey: ['notif-provider-config', provider.provider_id] })
    },
    onError: (e) => setStatus({ ok: false, msg: e instanceof Error ? e.message : 'Fehler' }),
  })

  if (fields.length === 0)
    return <p className="text-[11px] text-[var(--lx-text-muted)]">Keine Konfiguration.</p>

  return (
    <div className="flex flex-col gap-3 pt-1">
      {fields.map((f) => (
        <div key={f.key} className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-[var(--lx-text-muted)]">
              {f.label}
              {f.sensitive && f.configured && <span className="text-[var(--lx-state-up)]"> ✓</span>}
            </label>
            {f.is_env_locked && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                <Lock size={9} /> ENV
              </span>
            )}
          </div>
          <input
            className={inputCls}
            type={f.sensitive ? 'password' : 'text'}
            disabled={f.is_env_locked}
            placeholder={
              f.sensitive && f.configured
                ? '•••••••• (gesetzt — zum Ändern überschreiben)'
                : f.placeholder
            }
            value={
              f.is_env_locked
                ? f.sensitive
                  ? ''
                  : f.current_value
                : form[f.key] ?? (f.sensitive ? '' : f.current_value)
            }
            onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
          />
          {f.env_var && (
            <p className="text-[10px] text-[var(--lx-text-muted)] font-mono">{f.env_var}</p>
          )}
        </div>
      ))}
      {status && <StatusMsg ok={status.ok} msg={status.msg} />}
      {editable.length > 0 && (
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="lx-btn lx-btn--primary lx-btn--sm self-start"
        >
          {save.isPending ? 'Speichern…' : 'Speichern'}
        </button>
      )}
    </div>
  )
}

// ─── Endpoint chip (draggable handle + tap-fallback move + active toggle) ─────

function EndpointChip({
  ep,
  buckets,
  onMove,
  onToggle,
}: {
  ep: NotifEndpoint
  buckets: Bucket[]
  onMove: (ep: NotifEndpoint, provider: string | null) => void
  onToggle: (ep: NotifEndpoint, active: boolean) => void
}) {
  const locked = ep.provider_is_env_locked
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: epId(ep),
    disabled: locked,
  })

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border border-[var(--lx-border-soft)] bg-[var(--lx-surface)] ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      {locked ? (
        <Lock size={14} className="text-amber-400 shrink-0" />
      ) : (
        <button
          {...listeners}
          {...attributes}
          aria-label="Ziehen zum Zuweisen"
          className="cursor-grab touch-none text-[var(--lx-text-muted)] hover:text-[var(--lx-text)] shrink-0"
        >
          <GripVertical size={14} />
        </button>
      )}

      <div className="min-w-0 flex-1">
        <span className="block text-sm text-[var(--lx-text)] truncate">{ep.endpoint_name}</span>
        <span className="text-[10px] text-[var(--lx-text-muted)] font-mono">{ep.plugin_name}</span>
      </div>

      <label className="flex items-center gap-1 text-[10px] text-[var(--lx-text-muted)] shrink-0">
        <input
          type="checkbox"
          className="w-3.5 h-3.5 accent-[var(--lx-accent)]"
          checked={ep.active}
          disabled={ep.active_is_env_locked}
          onChange={(e) => onToggle(ep, e.target.checked)}
        />
        aktiv
        {ep.active_is_env_locked && <Lock size={10} className="text-amber-400" />}
      </label>

      {/* tap fallback (mobile / no-drag): pick the target bucket */}
      <select
        className={`${inputCls} !py-1 !text-[11px] shrink-0`}
        style={{ width: 116 }}
        title="Provider zuweisen"
        value={bucketOf(ep.provider)}
        disabled={locked}
        onChange={(e) => onMove(ep, e.target.value === DEFAULT_BUCKET ? null : e.target.value)}
      >
        {buckets.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </div>
  )
}

// ─── Bucket (droppable) ──────────────────────────────────────────────────────

function BucketCard({
  bucket,
  endpoints,
  buckets,
  onMove,
  onToggle,
}: {
  bucket: Bucket
  endpoints: NotifEndpoint[]
  buckets: Bucket[]
  onMove: (ep: NotifEndpoint, provider: string | null) => void
  onToggle: (ep: NotifEndpoint, active: boolean) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: bucket.id })
  const [showConfig, setShowConfig] = useState(false)

  return (
    <div
      ref={setNodeRef}
      className={`lx-card p-4 flex flex-col gap-3 transition-colors ${
        isOver ? 'border-[var(--lx-accent)] ring-1 ring-[var(--lx-accent)]' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="lx-section-title">{bucket.name}</span>
        {bucket.provider ? (
          <span className="text-[10px] text-[var(--lx-text-muted)] font-mono">
            {bucket.provider.provider_id}
          </span>
        ) : (
          <span className="text-[10px] text-[var(--lx-text-muted)]">globaler Standard</span>
        )}
        <span className="ml-auto text-[10px] text-[var(--lx-text-muted)]">
          {endpoints.length} Endpunkt{endpoints.length === 1 ? '' : 'e'}
        </span>
      </div>

      {bucket.provider && (
        <div>
          <button
            onClick={() => setShowConfig((v) => !v)}
            className="flex items-center gap-1 text-[11px] text-[var(--lx-text-muted)] hover:text-[var(--lx-text)]"
          >
            <ChevronDown size={12} className={showConfig ? 'rotate-180 transition-transform' : 'transition-transform'} />
            Konfiguration
          </button>
          {showConfig && <ProviderConfigPanel provider={bucket.provider} />}
        </div>
      )}

      <div className="flex flex-col gap-2 min-h-[52px]">
        {endpoints.length === 0 ? (
          <div className="flex items-center justify-center gap-2 h-[52px] rounded-lg border border-dashed border-[var(--lx-border-soft)] text-[11px] text-[var(--lx-text-muted)]">
            <Inbox size={14} /> Endpunkte hierher ziehen
          </div>
        ) : (
          endpoints.map((ep) => (
            <EndpointChip key={epId(ep)} ep={ep} buckets={buckets} onMove={onMove} onToggle={onToggle} />
          ))
        )}
      </div>
    </div>
  )
}

// ─── Section ─────────────────────────────────────────────────────────────────

export default function NotificationsSection(_: {
  config: Record<string, unknown>
  envLocked: string[]
}) {
  const qc = useQueryClient()
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  )

  const endpointsQ = useQuery({
    queryKey: ['notif-endpoints'],
    queryFn: () => apiFetch<{ endpoints: NotifEndpoint[] }>('/api/notifications/endpoints'),
  })
  const providersQ = useQuery({
    queryKey: ['notif-providers'],
    queryFn: () =>
      apiFetch<{ providers: NotifProvider[]; global_default: string | null }>(
        '/api/notifications/providers',
      ),
  })

  const providers = providersQ.data?.providers ?? []
  const endpoints = endpointsQ.data?.endpoints ?? []

  const move = useMutation({
    mutationFn: ({ ep, provider }: { ep: NotifEndpoint; provider: string | null }) =>
      apiFetch(`/api/notifications/endpoints/${ep.plugin_id}/${ep.endpoint_name}`, {
        method: 'PATCH',
        body: JSON.stringify({ provider }),
      }),
    onMutate: async ({ ep, provider }) => {
      await qc.cancelQueries({ queryKey: ['notif-endpoints'] })
      const prev = qc.getQueryData<{ endpoints: NotifEndpoint[] }>(['notif-endpoints'])
      qc.setQueryData<{ endpoints: NotifEndpoint[] }>(['notif-endpoints'], (old) =>
        old
          ? { ...old, endpoints: old.endpoints.map((e) => (epId(e) === epId(ep) ? { ...e, provider } : e)) }
          : old,
      )
      return { prev }
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['notif-endpoints'], ctx.prev)
      setStatus({ ok: false, msg: e instanceof Error ? e.message : 'Zuweisung fehlgeschlagen' })
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ['notif-endpoints'] }),
  })

  const toggle = useMutation({
    mutationFn: ({ ep, active }: { ep: NotifEndpoint; active: boolean }) =>
      apiFetch(`/api/notifications/endpoints/${ep.plugin_id}/${ep.endpoint_name}`, {
        method: 'PATCH',
        body: JSON.stringify({ active }),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['notif-endpoints'] }),
    onError: (e) => setStatus({ ok: false, msg: e instanceof Error ? e.message : 'Fehler' }),
  })

  const onMove = (ep: NotifEndpoint, provider: string | null) => {
    if ((ep.provider ?? null) === provider) return
    move.mutate({ ep, provider })
  }
  const onToggle = (ep: NotifEndpoint, active: boolean) => toggle.mutate({ ep, active })

  function onDragStart(e: DragStartEvent) {
    setDragId(String(e.active.id))
  }
  function onDragEnd(e: DragEndEvent) {
    setDragId(null)
    const { active, over } = e
    if (!over) return
    const ep = endpoints.find((x) => epId(x) === active.id)
    if (!ep || ep.provider_is_env_locked) return
    const target = over.id === DEFAULT_BUCKET ? null : String(over.id)
    onMove(ep, target)
  }

  if (endpointsQ.isLoading || providersQ.isLoading) {
    return <p className="text-sm text-[var(--lx-text-muted)]">Lade…</p>
  }
  if (endpointsQ.isError) {
    return <StatusMsg ok={false} msg={(endpointsQ.error as Error)?.message ?? 'Fehler beim Laden'} />
  }

  const buckets: Bucket[] = [
    { id: DEFAULT_BUCKET, name: 'Standard', provider: null },
    ...providers.map((p) => ({ id: p.provider_id, name: p.display_name, provider: p })),
  ]
  const dragEp = dragId ? endpoints.find((e) => epId(e) === dragId) ?? null : null

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <SectionTitle>Benachrichtigungs-Provider</SectionTitle>
        <p className="text-[11px] text-[var(--lx-text-muted)] -mt-2">
          Ziehe einen Endpunkt in einen Provider-Bucket, um ihn dort zuzustellen (auf dem Handy:
          per Touch ziehen oder das Auswahlfeld nutzen). Der <span className="font-mono">Standard</span>
          -Bucket verwendet den globalen Default-Provider.
        </p>
      </Card>

      {status && <StatusMsg ok={status.ok} msg={status.msg} />}

      {endpoints.length === 0 ? (
        <p className="text-sm text-[var(--lx-text-muted)]">Keine Endpunkte registriert.</p>
      ) : (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            {buckets.map((b) => (
              <BucketCard
                key={b.id}
                bucket={b}
                endpoints={endpoints.filter((e) => bucketOf(e.provider) === b.id)}
                buckets={buckets}
                onMove={onMove}
                onToggle={onToggle}
              />
            ))}
          </div>
          <DragOverlay>
            {dragEp ? (
              <div className="px-2.5 py-2 rounded-lg border border-[var(--lx-accent)] bg-[var(--lx-elevated)] text-sm text-[var(--lx-text)] shadow-lg">
                {dragEp.endpoint_name}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}
