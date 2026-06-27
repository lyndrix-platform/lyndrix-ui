import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import { useSSE } from '../lib/useSSE'
import LyndrixLogo from '../components/LyndrixLogo'
import type { VaultStatusResponse } from '../lib/types'

const gradientText: React.CSSProperties = {
  background: 'linear-gradient(135deg, var(--lx-accent), var(--lx-accent-2))',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}

const gridBg: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  backgroundImage: [
    'linear-gradient(rgba(0, 212, 255, 0.04) 1px, transparent 1px)',
    'linear-gradient(90deg, rgba(0, 212, 255, 0.04) 1px, transparent 1px)',
  ].join(','),
  backgroundSize: '40px 40px',
  maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%)',
}

export default function VaultUnsealPage() {
  const navigate = useNavigate()
  const [key, setKey] = useState('')
  const [unsealing, setUnsealing] = useState(false)

  const { data: vaultStatus, refetch } = useQuery({
    queryKey: ['vault-status-unseal'],
    queryFn: () => apiFetch<VaultStatusResponse>('/api/vault/status', { skipAuth: true }),
    refetchInterval: 5_000,
  })

  useSSE((topic) => {
    if (topic === 'vault:status_changed') {
      // Reuse the refetch result instead of issuing a second status request.
      void refetch().then(({ data }) => {
        if (!data) return
        if (data.ui_state === 'ready') navigate('/login', { replace: true })
        else if (data.ui_state === 'needs_init') navigate('/vault-setup', { replace: true })
      })
    }
  })

  const unsealMutation = useMutation({
    // Send the operator-supplied unseal key; the backend (VaultUnsealRequest)
    // falls back to stored material when no key is provided (auto-unseal).
    mutationFn: () =>
      apiFetch('/api/vault/unseal', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ key: key || null }),
      }),
    onMutate: () => setUnsealing(true),
    onSettled: () => setUnsealing(false),
  })

  // Navigation is a side effect — return a declarative redirect instead of
  // calling navigate() during render.
  if (vaultStatus && vaultStatus.ui_state === 'ready') return <Navigate to="/login" replace />
  if (vaultStatus && vaultStatus.ui_state === 'needs_init') return <Navigate to="/vault-setup" replace />

  const isAutoUnseal = vaultStatus && !vaultStatus.sealed

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--lx-bg)] relative overflow-hidden">
      <div style={gridBg} />

      <div style={{
        position: 'absolute', top: '-200px', right: '-200px',
        width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12), transparent 70%)',
        filter: 'blur(80px)', opacity: 0.5, pointerEvents: 'none',
      }} />

      <div
        className="relative z-10 w-full max-w-sm p-8 rounded-lg border border-[var(--lx-border-soft)] backdrop-blur-[16px]"
        style={{ background: 'var(--lx-surface-glass)' }}
      >
        <div className="flex items-center gap-3 mb-2">
          <LyndrixLogo size={36} />
          <h1 className="text-2xl font-semibold tracking-tight" style={gradientText}>
            Vault entsperren
          </h1>
        </div>
        <p className="text-sm text-[var(--lx-text-muted)] mb-6">
          {isAutoUnseal
            ? 'Auto-Unseal läuft… bitte warten.'
            : 'Die Vault ist versiegelt. Unseal-Schlüssel eingeben.'}
        </p>

        {isAutoUnseal ? (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-[var(--lx-accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); unsealMutation.mutate() }}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--lx-text-muted)] uppercase tracking-wide">
                Unseal-Schlüssel
              </label>
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Schlüssel eingeben…"
                className="px-3 py-2 rounded-md bg-[var(--lx-elevated)] border border-[var(--lx-border-soft)] text-[var(--lx-text)] text-sm outline-none focus:border-[var(--lx-accent)] transition-colors font-mono"
              />
            </div>

            {unsealMutation.isError && (
              <p className="text-sm text-[var(--lx-state-down)] bg-[var(--lx-elevated)] px-3 py-2 rounded-md">
                {unsealMutation.error instanceof Error
                  ? unsealMutation.error.message
                  : 'Entsperren fehlgeschlagen'}
              </p>
            )}

            {unsealMutation.isSuccess && (
              <p className="text-sm text-[var(--lx-state-up)] bg-[var(--lx-elevated)] px-3 py-2 rounded-md">
                Unseal-Anfrage gesendet. Warte auf Vault…
              </p>
            )}

            <button
              type="submit"
              disabled={unsealing || unsealMutation.isPending}
              className="py-2 rounded-md font-semibold text-sm disabled:opacity-40 transition-opacity hover:opacity-90"
              style={{
                background: 'linear-gradient(135deg, var(--lx-accent), var(--lx-accent-2))',
                color: 'var(--lx-bg)',
              }}
            >
              {unsealing ? 'Entsperre…' : 'Entsperren'}
            </button>
          </form>
        )}

        {vaultStatus && (
          <div className="mt-4 pt-4 border-t border-[var(--lx-border-soft)] flex items-center gap-2 text-xs text-[var(--lx-text-muted)]">
            <span
              className={`w-1.5 h-1.5 rounded-full inline-block ${
                vaultStatus.connected ? 'bg-[var(--lx-state-up)]' : 'bg-[var(--lx-state-down)]'
              }`}
            />
            Vault {vaultStatus.connected ? 'erreichbar' : 'nicht erreichbar'}
            <span className="mx-1">·</span>
            {vaultStatus.sealed ? 'versiegelt' : 'entsperrt'}
          </div>
        )}
      </div>
    </div>
  )
}
