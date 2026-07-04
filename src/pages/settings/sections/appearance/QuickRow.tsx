import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Moon, Sun } from 'lucide-react'
import i18nInstance, { LANG_KEY, loadCatalog, useSupportedLanguages } from '../../../../lib/i18n'
import { useTheme } from '../../../../theme/ThemeProvider'
import {
  getUiScale,
  setUiScale,
  UI_SCALE_DEFAULT,
  UI_SCALE_MIN,
  UI_SCALE_MAX,
  UI_SCALE_STEP,
} from '../../../../lib/uiScale'
import { Card } from '../../shared'

// Endonyms for the languages we ship; falls back to the upper-cased code for any
// other locale core may advertise.
const LANG_ENDONYMS: Record<string, string> = { de: 'Deutsch', en: 'English' }

/** Small label shown above each quick control (lighter than SectionTitle). */
function QuickLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--lx-text-muted)]">
      {children}
    </span>
  )
}

/** Pill button used by the Mode / Language segmented controls. */
function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex items-center justify-center gap-2 flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
        active
          ? 'border-[var(--lx-accent)] bg-[var(--lx-accent)]/10 text-[var(--lx-accent)]'
          : 'border-[var(--lx-border-soft)] bg-[var(--lx-elevated)] text-[var(--lx-text-muted)] hover:text-[var(--lx-text)] hover:border-[var(--lx-accent)]/40',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

/**
 * Compact "quick" row: Mode (Dark/Light), Language, and the browser-only UI-scale
 * slider. 3 columns on desktop, stacked on mobile. Every control here is
 * browser-scoped — none touch the server.
 */
export default function QuickRow() {
  const { t } = useTranslation('ui')
  const { themeId, setTheme } = useTheme()
  const { supported } = useSupportedLanguages()
  const currentLang = i18nInstance.language
  const [scale, setScale] = useState(getUiScale)

  async function handleLangChange(lang: string) {
    // Load/cache the new locale's catalog before switching so the UI doesn't
    // flash untranslated keys.
    await loadCatalog(lang)
    await i18nInstance.changeLanguage(lang)
    try {
      localStorage.setItem(LANG_KEY, lang)
    } catch {
      // best-effort persistence
    }
  }

  // UI scale applies live (root font-size) and persists immediately — no reload.
  function changeScale(v: number) {
    setScale(setUiScale(v))
  }

  return (
    <Card>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Mode */}
        <div className="flex flex-col gap-2">
          <QuickLabel>{t('appearance.color_scheme')}</QuickLabel>
          <div className="flex gap-2">
            {(['dark', 'light'] as const).map((id) => {
              const Icon = id === 'dark' ? Moon : Sun
              const label = id === 'dark' ? t('appearance.dark') : t('appearance.light')
              return (
                <Pill key={id} active={themeId === id} onClick={() => setTheme(id)}>
                  <Icon size={15} />
                  {label}
                </Pill>
              )
            })}
          </div>
        </div>

        {/* Language */}
        <div className="flex flex-col gap-2">
          <QuickLabel>{t('appearance.language')}</QuickLabel>
          <div className="flex gap-2">
            {supported.map((lang) => (
              <Pill
                key={lang}
                active={currentLang === lang}
                onClick={() => void handleLangChange(lang)}
              >
                {LANG_ENDONYMS[lang] ?? lang.toUpperCase()}
              </Pill>
            ))}
          </div>
        </div>

        {/* UI scale (this browser) */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <QuickLabel>
              {t('appearance.ui_scale', { defaultValue: 'UI scale' })}
            </QuickLabel>
            <span className="text-xs font-mono tabular-nums text-[var(--lx-accent)]">
              {Math.round(scale * 100)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              className="flex-1 accent-[var(--lx-accent)] cursor-pointer"
              type="range"
              min={UI_SCALE_MIN}
              max={UI_SCALE_MAX}
              step={UI_SCALE_STEP}
              value={scale}
              onChange={(e) => changeScale(Number(e.target.value))}
            />
            <button
              className="text-[10px] text-[var(--lx-text-muted)] hover:text-[var(--lx-accent)] disabled:opacity-40"
              onClick={() => changeScale(UI_SCALE_DEFAULT)}
              disabled={scale === UI_SCALE_DEFAULT}
            >
              {t('appearance.reset_color', { defaultValue: 'Reset' })}
            </button>
          </div>
          <p className="text-[10px] text-[var(--lx-text-muted)]">
            {t('appearance.ui_scale_caption', { defaultValue: 'This browser only.' })}
          </p>
        </div>
      </div>
    </Card>
  )
}
