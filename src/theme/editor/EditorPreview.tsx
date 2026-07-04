import { useTranslation } from 'react-i18next'
import GlassSurface from '../../components/GlassSurface'

// A curated sample canvas so users see how the tokens they are editing land on
// real components — not just whatever happens to be on the current screen. It
// carries no state: because the live draft is injected as the top <style> layer,
// every element here re-skins instantly as the draft changes.
export default function EditorPreview() {
  const { t } = useTranslation('ui')
  return (
    <div
      className="flex flex-col gap-4 rounded-2xl p-4 border border-[var(--lx-glass-border)]"
      style={{ background: 'var(--lx-bg)' }}
    >
      {/* Type ramp */}
      <div>
        <h3 className="text-lg font-semibold" style={{ color: 'var(--lx-text)' }}>
          {t('editor.preview.heading', { defaultValue: 'Live preview' })}
        </h3>
        <p className="text-sm" style={{ color: 'var(--lx-text)' }}>
          {t('editor.preview.body', {
            defaultValue: 'Body text renders in the sans stack at the current text scale.',
          })}
        </p>
        <p className="text-xs" style={{ color: 'var(--lx-text-muted)' }}>
          {t('editor.preview.muted', { defaultValue: 'Muted secondary text.' })}
        </p>
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap gap-2">
        <button className="lx-btn lx-btn--primary lx-btn--sm">
          {t('editor.preview.primary_btn', { defaultValue: 'Primary' })}
        </button>
        <button className="lx-btn lx-btn--ghost lx-btn--sm">
          {t('editor.preview.ghost_btn', { defaultValue: 'Ghost' })}
        </button>
      </div>

      {/* Input */}
      <input className="lx-input text-sm" placeholder={t('editor.preview.input', { defaultValue: 'Input field' })} readOnly />

      {/* State badges */}
      <div className="flex flex-wrap gap-2">
        <span className="lx-badge lx-badge--up"><span className="lx-dot" />up</span>
        <span className="lx-badge lx-badge--down"><span className="lx-dot" />down</span>
        <span className="lx-badge lx-badge--paused"><span className="lx-dot" />paused</span>
        <span className="lx-badge lx-badge--unknown"><span className="lx-dot" />unknown</span>
        <span className="lx-badge lx-badge--success"><span className="lx-dot" />success</span>
        <span className="lx-badge lx-badge--accent"><span className="lx-dot" />accent</span>
        <span className="lx-badge lx-badge--muted"><span className="lx-dot" />muted</span>
      </div>

      {/* Icon-size ramp — squares sized by the --lx-icon-* scale */}
      <div className="flex items-end gap-3">
        {(['--lx-icon-xs', '--lx-icon-sm', '--lx-icon-md', '--lx-icon-lg'] as const).map((v) => (
          <span
            key={v}
            className="rounded-md shrink-0"
            style={{ width: `var(${v})`, height: `var(${v})`, background: 'var(--lx-accent)' }}
            aria-label={v}
          />
        ))}
      </div>

      {/* Categorical chart palette (--lx-chart-1..8) */}
      <div>
        <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--lx-text-muted)' }}>
          {t('editor.preview.charts', { defaultValue: 'Chart palette' })}
        </p>
        <div className="flex h-6 w-full overflow-hidden rounded-md border border-[var(--lx-border-soft)]">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className="flex-1" style={{ background: `var(--lx-chart-${i + 1})` }} />
          ))}
        </div>
      </div>

      {/* Semantic gradient family */}
      <div className="grid grid-cols-2 gap-2">
        {(['success', 'warning', 'info', 'danger'] as const).map((g) => (
          <div
            key={g}
            className="h-6 rounded-md"
            style={{ background: `var(--lx-gradient-${g})` }}
            aria-label={g}
          />
        ))}
      </div>

      {/* Terminal / console panel */}
      <div className="lx-terminal text-[11px]">
        <div>
          <span className="lx-terminal-accent">lyndrix@core</span>:~$ boot
        </div>
        <div>vault:opened → db:connected → iam:ready</div>
      </div>

      {/* Card + glass tile over the themed backdrop */}
      <div
        className="rounded-xl overflow-hidden p-3"
        style={{
          backgroundImage: 'var(--lx-bg-image)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: 'var(--lx-elevated)',
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="lx-card p-3">
            <p className="text-[11px]" style={{ color: 'var(--lx-text-muted)' }}>
              {t('editor.preview.card', { defaultValue: 'Card' })}
            </p>
            <p className="text-sm font-semibold" style={{ color: 'var(--lx-text)' }}>
              surface
            </p>
          </div>
          <GlassSurface>
            <div className="px-3 py-3">
              <p className="text-[11px]" style={{ color: 'var(--lx-text-muted)' }}>
                {t('editor.preview.glass', { defaultValue: 'Glass' })}
              </p>
              <p className="text-sm font-semibold" style={{ color: 'var(--lx-text)' }}>
                tile
              </p>
            </div>
          </GlassSurface>
        </div>
      </div>

      {/* Accent gradient bar */}
      <div
        className="h-8 rounded-lg"
        style={{ background: 'var(--lx-gradient-accent)' }}
        aria-label={t('editor.preview.gradient', { defaultValue: 'Accent gradient' })}
      />
    </div>
  )
}
