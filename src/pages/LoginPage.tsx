import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../lib/auth'
import LyndrixLogo from '../components/LyndrixLogo'

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

export default function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
    <div className="min-h-screen flex items-center justify-center bg-[var(--lx-bg)] relative overflow-hidden">
      {/* Dot grid */}
      <div style={gridBg} />

      {/* Glow orb — top right */}
      <div style={{
        position: 'absolute',
        top: '-200px', right: '-200px',
        width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(0, 212, 255, 0.15), transparent 70%)',
        filter: 'blur(80px)',
        opacity: 0.6,
        pointerEvents: 'none',
      }} />

      {/* Glow orb — bottom left */}
      <div style={{
        position: 'absolute',
        bottom: '-200px', left: '-200px',
        width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15), transparent 70%)',
        filter: 'blur(80px)',
        opacity: 0.5,
        pointerEvents: 'none',
      }} />

      {/* Login card */}
      <div
        className="relative z-10 w-full max-w-sm p-8 rounded-lg border border-[var(--lx-border-soft)] backdrop-blur-[16px]"
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
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--lx-text-muted)] uppercase tracking-wide">
              Benutzername
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              className="px-3 py-2 rounded-md bg-[var(--lx-elevated)] border border-[var(--lx-border-soft)] text-[var(--lx-text)] text-sm outline-none focus:border-[var(--lx-accent)] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--lx-text-muted)] uppercase tracking-wide">
              Passwort
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="px-3 py-2 rounded-md bg-[var(--lx-elevated)] border border-[var(--lx-border-soft)] text-[var(--lx-text)] text-sm outline-none focus:border-[var(--lx-accent)] transition-colors"
            />
          </div>

          {error && (
            <p className="text-sm text-[var(--lx-state-down)] bg-[var(--lx-elevated)] px-3 py-2 rounded-md">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 py-2 rounded-md font-semibold text-sm disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, var(--lx-accent), var(--lx-accent-2))',
              color: 'var(--lx-bg)',
            }}
          >
            {loading ? 'Anmelden…' : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  )
}
