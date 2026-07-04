import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { apiFetch, getToken } from '../../../../lib/api'
import { useTheme } from '../../../../theme/ThemeProvider'
import { Card, SectionTitle } from '../../shared'

/**
 * Per-user background image for the current mode. Backed by `/api/me/background`,
 * so it is account-scoped and syncs across the user's devices (unlike the other
 * browser-scoped controls in this section). Behaviour is unchanged from the
 * original AppearanceSection — only lifted into its own file with a scope caption.
 */
export default function BackgroundCard() {
  const { t } = useTranslation('ui')
  const { themeId, userBg, refreshUserBg } = useTheme()
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const hasCustom = !!userBg[themeId]
  const modeLabel = t(themeId === 'dark' ? 'appearance.dark' : 'appearance.light')

  async function upload(file: File) {
    setBusy(true)
    setStatus(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const token = getToken()
      const r = await fetch(`/api/me/background?mode=${themeId}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      })
      if (!r.ok) {
        const b = await r.json().catch(() => null)
        throw new Error((b && (b.detail as string)) || `HTTP ${r.status}`)
      }
      refreshUserBg()
      setStatus(t('appearance.bg_uploaded', { defaultValue: 'Background updated.' }))
    } catch (e) {
      setStatus(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    setStatus(null)
    try {
      await apiFetch(`/api/me/background/${themeId}`, { method: 'DELETE' })
      refreshUserBg()
      setStatus(t('appearance.bg_removed', { defaultValue: 'Background removed.' }))
    } catch (e) {
      setStatus(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <SectionTitle>{t('appearance.background', { defaultValue: 'Background image' })}</SectionTitle>
      <p className="text-[10px] uppercase tracking-wide text-[var(--lx-text-subtle)] mb-1">
        {t('appearance.scope_account_caption', {
          defaultValue: 'My account · syncs across devices',
        })}
      </p>
      <p className="text-xs text-[var(--lx-text-muted)] mb-3">
        {t('appearance.background_hint', {
          defaultValue:
            'Personal backdrop for {{mode}} mode, shown behind the glass surfaces. Stored on the server.',
          mode: modeLabel,
        })}
      </p>
      <div
        className="h-28 rounded-lg border border-[var(--lx-glass-border)] mb-3 overflow-hidden"
        style={{
          backgroundImage: 'var(--lx-bg-image, none)',
          backgroundColor: 'var(--lx-bg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <label
          className={`lx-btn lx-btn--secondary lx-btn--sm cursor-pointer ${
            busy ? 'opacity-60 pointer-events-none' : ''
          }`}
        >
          {busy
            ? t('common.saving')
            : hasCustom
              ? t('appearance.bg_replace', { defaultValue: 'Replace image' })
              : t('appearance.bg_upload', { defaultValue: 'Upload image' })}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void upload(f)
              e.target.value = ''
            }}
          />
        </label>
        {hasCustom && (
          <button
            className="lx-btn lx-btn--ghost lx-btn--sm"
            disabled={busy}
            onClick={() => void remove()}
          >
            {t('appearance.bg_remove', { defaultValue: 'Remove' })}
          </button>
        )}
      </div>
      {status && <p className="mt-2 text-xs text-[var(--lx-text-muted)]">{status}</p>}
    </Card>
  )
}
