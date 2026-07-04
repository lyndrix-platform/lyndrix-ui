// SSO landing page (Identity 2.0). The core's OIDC callback redirects here
// with a ONE-TIME exchange code (?code=…&next=…) — never the session token
// itself. We redeem it, store the token and continue to the target route.
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { apiFetch, setToken } from '../lib/api'
import { preferencesClient } from '../lib/preferences'

interface ExchangeResponse {
  token: string
  username: string
  roles: string[]
  display_name: string | null
}

export default function AuthCallbackPage() {
  const { t } = useTranslation('ui')
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true
    const code = params.get('code') ?? ''
    const next = params.get('next') ?? '/dashboard'
    if (!code) {
      navigate('/login', { replace: true })
      return
    }
    apiFetch<ExchangeResponse>('/api/auth/token-exchange', {
      method: 'POST',
      body: JSON.stringify({ code }),
      skipAuth: true,
    })
      .then((data) => {
        setToken(data.token)
        // Pull account-scoped preferences immediately (theme layer etc.).
        void preferencesClient.getPreferences(true)
        navigate(next.startsWith('/') ? next : '/dashboard', { replace: true })
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e))
      })
  }, [params, navigate])

  return (
    <div className="min-h-screen grid place-items-center">
      {error ? (
        <div className="lx-card p-6 max-w-sm text-center">
          <p className="text-sm text-[var(--lx-state-down)] mb-3">
            {t('login.sso_failed', { defaultValue: 'SSO sign-in failed.' })}
          </p>
          <p className="text-xs text-[var(--lx-text-muted)] mb-4 break-all">{error}</p>
          <button className="lx-btn lx-btn--primary" onClick={() => navigate('/login')}>
            {t('login.back_to_login', { defaultValue: 'Back to login' })}
          </button>
        </div>
      ) : (
        <div className="flex gap-3 items-center">
          <div className="w-5 h-5 border-2 border-[var(--lx-accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--lx-text-muted)]">
            {t('login.sso_completing', { defaultValue: 'Completing sign-in…' })}
          </p>
        </div>
      )}
    </div>
  )
}
