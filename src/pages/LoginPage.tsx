import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { KeyRound } from 'lucide-react'
import { login } from '../lib/auth'
import { apiFetch } from '../lib/api'
import LyndrixLogo from '../components/LyndrixLogo'

interface AuthProviderInfo {
  id: string
  kind: 'credentials' | 'redirect'
  label: string
}

/** Kick off the SSO flow: the core validates our origin against its CORS
 *  allowlist, binds PKCE+state to this flow and redirects to the IdP. */
function startSso(next = '/dashboard') {
  const cb = `${window.location.origin}/auth/callback`
  window.location.href = `/api/auth/oidc/start?redirect_uri=${encodeURIComponent(cb)}&next=${encodeURIComponent(next)}`
}

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
    'linear-gradient(color-mix(in srgb, var(--lx-accent) 4%, transparent) 1px, transparent 1px)',
    'linear-gradient(90deg, color-mix(in srgb, var(--lx-accent) 4%, transparent) 1px, transparent 1px)',
  ].join(','),
  backgroundSize: '40px 40px',
  maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%)',
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Which providers are configured (unauthenticated discovery). The
  // credentials form serves local + LDAP alike (the core runs the full
  // provider chain); each redirect provider gets its own SSO button.
  const { data: providerData } = useQuery({
    queryKey: ['auth-providers'],
    queryFn: () =>
      apiFetch<{ providers: AuthProviderInfo[] }>('/api/auth/providers', { skipAuth: true }),
    staleTime: 60_000,
    retry: 1,
  })
  const ssoProviders = (providerData?.providers ?? []).filter((p) => p.kind === 'redirect')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(username, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Dot grid */}
      <div style={gridBg} />

      {/* Glow orb — top right */}
      <div style={{
        position: 'absolute',
        top: '-200px', right: '-200px',
        width: '600px', height: '600px',
        background: 'radial-gradient(circle, color-mix(in srgb, var(--lx-accent) 15%, transparent), transparent 70%)',
        filter: 'blur(80px)',
        opacity: 0.6,
        pointerEvents: 'none',
      }} />

      {/* Glow orb — bottom left */}
      <div style={{
        position: 'absolute',
        bottom: '-200px', left: '-200px',
        width: '400px', height: '400px',
        background: 'radial-gradient(circle, color-mix(in srgb, var(--lx-accent-3) 15%, transparent), transparent 70%)',
        filter: 'blur(80px)',
        opacity: 0.5,
        pointerEvents: 'none',
      }} />

      {/* Login card */}
      <div
        className="relative z-10 w-full max-w-sm p-8 rounded-lg border border-[var(--lx-border-soft)] backdrop-blur-[var(--lx-blur-md)]"
        style={{ background: 'var(--lx-surface-glass)' }}
      >
        <div className="flex items-center gap-3 mb-3">
          <LyndrixLogo size={36} />
          <h1 className="text-2xl font-semibold tracking-tight" style={gradientText}>
            Lyndrix
          </h1>
        </div>
        <p className="text-sm text-[var(--lx-text-muted)] mb-6">Melden Sie sich an</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="lx-label">Benutzername</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              className="lx-input"
            />
          </div>

          <div>
            <label className="lx-label">Passwort</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="lx-input"
            />
          </div>

          {error && (
            <p className="text-sm text-[var(--lx-state-down)] bg-[var(--lx-state-down)]/10 border border-[var(--lx-state-down)]/20 px-3 py-2 rounded-md">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="lx-btn lx-btn--primary lx-btn--block mt-2">
            {loading ? 'Anmelden…' : 'Anmelden'}
          </button>
        </form>

        {ssoProviders.length > 0 && (
          <div className="mt-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-[var(--lx-border-soft)]" />
              <span className="text-[11px] uppercase tracking-wide text-[var(--lx-text-muted)]">oder</span>
              <div className="h-px flex-1 bg-[var(--lx-border-soft)]" />
            </div>
            <div className="flex flex-col gap-2">
              {ssoProviders.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => startSso()}
                  className="lx-btn lx-btn--secondary lx-btn--block inline-flex items-center justify-center gap-2"
                >
                  <KeyRound size={15} />
                  {`Mit ${p.label} anmelden`}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
