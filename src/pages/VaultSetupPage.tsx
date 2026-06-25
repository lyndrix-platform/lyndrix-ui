import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

export default function VaultSetupPage() {
  const navigate = useNavigate()
  const [confirmed, setConfirmed] = useState(false)
  const [done, setDone] = useState(false)

  const { data: vaultStatus, refetch } = useQuery({
    queryKey: ['vault-status-setup'],
    queryFn: () => apiFetch<VaultStatusResponse>('/api/vault/status', { skipAuth: true }),
    refetchInterval: 5_000,
  })

  useSSE((topic) => {
    if (topic === 'vault:status_changed') {
      refetch().then(() => {
        void apiFetch<VaultStatusResponse>('/api/vault/status', { skipAuth: true }).then((s) => {
          if (s.ui_state === 'needs_unseal') navigate('/vault-unseal', { replace: true })
          else if (s.ui_state === 'ready') navigate('/login', { replace: true })
        })
      })
    }
  })

  const initMutation = useMutation({
    mutationFn: () => apiFetch('/api/vault/init', { method: 'POST', skipAuth: true }),
    onSuccess: () => setDone(true),
  })

  if (vaultStatus && vaultStatus.ui_state !== 'needs_init') {
    if (vaultStatus.ui_state === 'needs_unseal') navigate('/vault-unseal', { replace: true })
    else navigate('/', { replace: true })
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--lx-bg)] relative overflow-hidden">
      <div style={gridBg} />

      <div style={{
        position: 'absolute', top: '-200px', right: '-200px',
        width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(0, 212, 255, 0.12), transparent 70%)',
        filter: 'blur(80px)', opacity: 0.5, pointerEvents: 'none',
      }} />

      <div style={{
        position: 'absolute', bottom: '-200px', left: '-200px',
        width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12), transparent 70%)',
        filter: 'blur(80px)', opacity: 0.5, pointerEvents: 'none',
      }} />

      <div
        className="relative z-10 w-full max-w-md p-8 rounded-lg border border-[var(--lx-border-soft)] backdrop-blur-[16px]"
        style={{ background: 'var(--lx-surface-glass)' }}
      >
        <div className="flex items-center gap-3 mb-2">
          <LyndrixLogo size={36} />
          <h1 className="text-2xl font-semibold tracking-tight" style={gradientText}>
            Lyndrix Setup
          </h1>
        </div>
        <p className="text-sm text-[var(--lx-text-muted)] mb-6">Vault-Initialisierung</p>

        {done ? (
          <div className="flex flex-col gap-3">
            <div className="p-3 rounded-md bg-[var(--lx-state-up)]/10 border border-[var(--lx-state-up)]/30 text-sm text-[var(--lx-state-up)]">
              Vault wurde erfolgreich initialisiert. Warte auf Status-Update…
            </div>
            <div className="flex justify-center pt-2">
              <div className="w-5 h-5 border-2 border-[var(--lx-accent)] border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="p-3 rounded-md bg-[var(--lx-state-paused)]/10 border border-[var(--lx-state-paused)]/30 text-sm text-[var(--lx-text)]">
              <p className="font-medium text-[var(--lx-state-paused)] mb-1">Achtung</p>
              <p className="text-[var(--lx-text-muted)]">
                Die Vault-Initialisierung generiert die Root-Schlüssel und speichert sie verschlüsselt.
                Dieser Schritt kann nicht rückgängig gemacht werden.
              </p>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer text-sm text-[var(--lx-text-muted)]">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 accent-[var(--lx-accent)]"
              />
              <span>Ich verstehe, dass dieser Vorgang die Vault-Root-Schlüssel generiert.</span>
            </label>

            {initMutation.isError && (
              <p className="text-sm text-[var(--lx-state-down)] bg-[var(--lx-elevated)] px-3 py-2 rounded-md">
                {initMutation.error instanceof Error ? initMutation.error.message : 'Initialisierung fehlgeschlagen'}
              </p>
            )}

            <button
              onClick={() => initMutation.mutate()}
              disabled={!confirmed || initMutation.isPending}
              className="mt-1 py-2 rounded-md font-semibold text-sm disabled:opacity-40 transition-opacity hover:opacity-90"
              style={{
                background: 'linear-gradient(135deg, var(--lx-accent), var(--lx-accent-2))',
                color: 'var(--lx-bg)',
              }}
            >
              {initMutation.isPending ? 'Initialisiere…' : 'Vault initialisieren'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
