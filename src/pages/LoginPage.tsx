import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../lib/auth'

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
    <div className="min-h-screen flex items-center justify-center bg-[var(--lx-bg)]">
      <div className="w-full max-w-sm p-8 rounded-lg border border-[var(--lx-border-soft)] bg-[var(--lx-surface)]">
        <h1 className="text-2xl font-semibold text-[var(--lx-text)] mb-2 tracking-tight">
          Lyndrix
        </h1>
        <p className="text-sm text-[var(--lx-text-muted)] mb-6">Sign in to your account</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--lx-text-muted)] uppercase tracking-wide">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              className="px-3 py-2 rounded bg-[var(--lx-elevated)] border border-[var(--lx-border-soft)] text-[var(--lx-text)] text-sm outline-none focus:border-[var(--lx-accent)] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--lx-text-muted)] uppercase tracking-wide">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="px-3 py-2 rounded bg-[var(--lx-elevated)] border border-[var(--lx-border-soft)] text-[var(--lx-text)] text-sm outline-none focus:border-[var(--lx-accent)] transition-colors"
            />
          </div>

          {error && (
            <p className="text-sm text-[var(--lx-state-down)] bg-[var(--lx-elevated)] px-3 py-2 rounded">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 py-2 rounded font-medium text-sm bg-[var(--lx-accent)] text-[var(--lx-bg)] hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
