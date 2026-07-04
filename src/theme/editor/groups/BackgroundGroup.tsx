import { useTranslation } from 'react-i18next'
import { TextField } from '../controls'
import { effectiveBg } from '../draft'
import type { GroupProps } from './common'

// Background = the theme pack's background_images (filenames resolved server-side
// against /api/themes/{id}/assets/{file}). Editing filenames here only matters
// for a saved pack, where the "carry over" checkbox decides whether the base
// pack's image bytes are fetched and embedded into the new pack. The per-USER
// background image is separate and lives in Appearance → Background.
export default function BackgroundGroup({
  draft,
  dispatch,
  carryOverAssets = true,
  onCarryOverChange,
}: GroupProps) {
  const { t } = useTranslation('ui')
  return (
    <div className="flex flex-col gap-5">
      <p className="text-[11px] text-[var(--lx-text-muted)]">
        {t('editor.bg.intro', {
          defaultValue:
            'Backdrop image filenames baked into the theme pack. Your personal background lives in Appearance → Background.',
        })}
      </p>

      <TextField
        label={t('editor.bg.light', { defaultValue: 'Light backdrop file' })}
        mono
        value={effectiveBg(draft, 'light')}
        onChange={(v) => dispatch({ type: 'SET_TOKEN', group: 'background_images', mode: 'light', value: v })}
      />
      <TextField
        label={t('editor.bg.dark', { defaultValue: 'Dark backdrop file' })}
        mono
        value={effectiveBg(draft, 'dark')}
        onChange={(v) => dispatch({ type: 'SET_TOKEN', group: 'background_images', mode: 'dark', value: v })}
      />

      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={carryOverAssets}
          onChange={(e) => onCarryOverChange?.(e.target.checked)}
          className="mt-0.5 accent-[var(--lx-accent)]"
        />
        <span className="text-xs text-[var(--lx-text-muted)]">
          {t('editor.bg.carry_over', {
            defaultValue:
              'Carry these image assets into the saved pack (copies the base theme’s background images when you save).',
          })}
        </span>
      </label>
    </div>
  )
}
