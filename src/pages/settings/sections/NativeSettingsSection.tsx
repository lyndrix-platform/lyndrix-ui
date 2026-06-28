import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, SectionTitle, Field, StatusMsg, inputCls } from '../shared'
import { BackendSwitcher, isNativeApp, type NativeAppInfo } from '../../../lib/nativeBridge'
import {
  getUiScale,
  setUiScale,
  UI_SCALE_DEFAULT,
  UI_SCALE_MIN,
  UI_SCALE_MAX,
  UI_SCALE_STEP,
} from '../../../lib/uiScale'

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-[var(--lx-border-soft)] last:border-0">
      <span className="text-xs text-[var(--lx-text-muted)] uppercase tracking-wide">{label}</span>
      <span className="text-sm text-[var(--lx-text)] font-mono break-all text-right">{value}</span>
    </div>
  )
}

function isValidHttps(value: string): boolean {
  try {
    const u = new URL(value.trim())
    return u.protocol === 'https:' && !!u.host
  } catch {
    return false
  }
}

/**
 * Native-only settings: switch which Lyndrix instance the app loads (and therefore talks to), plus
 * app info. Only mounted inside the Capacitor shell (gated in the registry), but defends itself too.
 */
export default function NativeSettingsSection() {
  const { t } = useTranslation('ui')
  const [url, setUrl] = useState('')
  const [defaultUrl, setDefaultUrl] = useState('')
  const [info, setInfo] = useState<NativeAppInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)
  const [scale, setScale] = useState(getUiScale)

  useEffect(() => {
    if (!isNativeApp()) return
    BackendSwitcher.getServerUrl()
      .then((r) => {
        setUrl(r.url)
        setDefaultUrl(r.default)
      })
      .catch(() => {})
    BackendSwitcher.getInfo().then(setInfo).catch(() => {})
  }, [])

  if (!isNativeApp()) return null

  async function apply() {
    const v = url.trim()
    if (!isValidHttps(v)) {
      setStatus({ ok: false, msg: t('native_section.invalid_url') })
      return
    }
    setLoading(true)
    // The native side persists the origin and recreates the Activity, so the WebView tears down and
    // reloads onto the new server — code after this call usually never runs.
    setStatus({ ok: true, msg: t('native_section.reconnecting') })
    try {
      await BackendSwitcher.setServerUrl({ url: v })
    } catch (e) {
      setLoading(false)
      setStatus({ ok: false, msg: String(e) })
    }
  }

  // UI scale applies live (root font-size) and persists immediately — no reload needed.
  function changeScale(v: number) {
    setScale(setUiScale(v))
  }

  function resetScale() {
    setScale(setUiScale(UI_SCALE_DEFAULT))
  }

  async function reset() {
    setLoading(true)
    setStatus({ ok: true, msg: t('native_section.reconnecting') })
    try {
      await BackendSwitcher.resetServerUrl()
    } catch (e) {
      setLoading(false)
      setStatus({ ok: false, msg: String(e) })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <SectionTitle>{t('native_section.backend_title')}</SectionTitle>
        <Field
          label={t('native_section.backend_label')}
          hint={t('native_section.backend_hint', { url: defaultUrl || '—' })}
        >
          <input
            className={inputCls}
            type="url"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="https://lyndrix.example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </Field>
        <div className="flex items-center gap-2 mt-4">
          <button className="lx-btn lx-btn--primary" onClick={apply} disabled={loading}>
            {t('native_section.apply')}
          </button>
          <button className="lx-btn lx-btn--ghost" onClick={reset} disabled={loading}>
            {t('native_section.reset')}
          </button>
        </div>
        {status && <StatusMsg ok={status.ok} msg={status.msg} />}
      </Card>

      <Card>
        <SectionTitle>{t('native_section.app_info_title')}</SectionTitle>
        <InfoRow
          label={t('native_section.version')}
          value={info ? `${info.versionName} (${info.versionCode})` : '—'}
        />
        <InfoRow label={t('native_section.package')} value={info?.packageName ?? '—'} />
      </Card>

      <Card>
        <SectionTitle>{t('native_section.ui_scale_title')}</SectionTitle>
        <Field label={t('native_section.ui_scale_label')} hint={t('native_section.ui_scale_hint')}>
          <div className="flex items-center gap-3">
            <input
              className="flex-1 accent-[var(--lx-accent)]"
              type="range"
              min={UI_SCALE_MIN}
              max={UI_SCALE_MAX}
              step={UI_SCALE_STEP}
              value={scale}
              onChange={(e) => changeScale(Number(e.target.value))}
            />
            <span className="w-12 text-right text-sm font-mono tabular-nums text-[var(--lx-text)]">
              {Math.round(scale * 100)}%
            </span>
          </div>
        </Field>
        <div className="flex items-center gap-2 mt-4">
          <button className="lx-btn lx-btn--ghost" onClick={resetScale} disabled={scale === UI_SCALE_DEFAULT}>
            {t('native_section.ui_scale_reset')}
          </button>
        </div>
      </Card>

      {/* Offline mode — reserved v2 extension point; intentionally disabled for now. */}
      <Card>
        <SectionTitle>{t('native_section.offline_title')}</SectionTitle>
        <p className="text-xs text-[var(--lx-text-muted)]">{t('native_section.offline_soon')}</p>
      </Card>
    </div>
  )
}
