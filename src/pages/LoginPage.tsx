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
      </div>
    </div>
  )
}
