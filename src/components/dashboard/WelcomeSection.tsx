import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Check, Pencil, X } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import { useGreeting } from '../../lib/useGreeting'
import type { MeResponse } from '../../lib/auth'
import type { HealthResponse, VaultStatusResponse } from '../../lib/types'

interface Props {
  me: MeResponse | undefined
  health: HealthResponse | undefined
  vaultStatus: VaultStatusResponse | undefined
}

export default function WelcomeSection({ me, health, vaultStatus }: Props) {
  const { t } = useTranslation('ui')
  const { greeting } = useGreeting()
  const queryClient = useQueryClient()

  const displayName = me?.full_name || me?.username || '…'
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const mutation = useMutation({
    mutationFn: (full_name: string) =>
      apiFetch(`/api/users/${me?.username}`, {
        method: 'PATCH',
        body: JSON.stringify({ full_name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
      setEditing(false)
    },
  })

  function startEdit() {
    setDraft(me?.full_name ?? '')
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    mutation.reset()
  }

  function saveEdit() {
    if (draft.trim()) mutation.mutate(draft.trim())
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') saveEdit()
    if (e.key === 'Escape') cancelEdit()
  }

  const vaultLabel = vaultStatus?.ui_state ?? '…'
  const coreVersion = health?.core_version ? `v${health.core_version}` : '…'
  const roles = me?.roles?.join(', ') ?? ''

  // The aggregate health status is "unknown" whenever no plugin implements
  // health() — which is the normal case — so only error/degraded are real
  // problems. Treat everything else (ok, unknown) as healthy.
  const coreHealthy = !!health && health.status !== 'error' && health.status !== 'degraded'

  return (
    <div className="flex flex-col gap-1">
      {/* Greeting row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                className={[
                  'bg-transparent border-b border-[var(--lx-accent)] outline-none',
                  'text-2xl font-light text-[var(--lx-text)] w-48',
                ].join(' ')}
              />
              <button
                onClick={saveEdit}
                disabled={mutation.isPending}
                className="text-[var(--lx-accent)] hover:opacity-80 transition-opacity disabled:opacity-40"
                title={t('dashboard.save_name')}
              >
                <Check size={16} />
              </button>
              <button
                onClick={cancelEdit}
                className="text-[var(--lx-text-muted)] hover:text-[var(--lx-text)] transition-colors"
                title={t('dashboard.cancel_edit')}
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h1 className="text-2xl font-light text-[var(--lx-text)]">
                {greeting},{' '}
                <span
                  className="font-semibold"
                  style={{
                    background: 'linear-gradient(135deg, var(--lx-accent), var(--lx-accent-2))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {displayName}
                </span>
              </h1>
              <button
                onClick={startEdit}
                className="text-[var(--lx-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity hover:text-[var(--lx-text)]"
                title={t('dashboard.edit_name')}
              >
                <Pencil size={13} />
              </button>
            </div>
          )}
        </div>

        {/* System status — top right */}
        <p className="text-xs text-[var(--lx-text-muted)] shrink-0 pt-1.5">
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle ${
              coreHealthy ? 'bg-[var(--lx-state-up)]' : 'bg-[var(--lx-state-down)]'
            }`}
          />
          Core {coreVersion} · Vault {vaultLabel}
        </p>
      </div>

      {/* Sub-line */}
      <p className="text-xs text-[var(--lx-text-muted)]">
        @{me?.username ?? '…'}
        {roles && <> · {roles}</>}
        {me?.email && <> · {me.email}</>}
      </p>
    </div>
  )
}
