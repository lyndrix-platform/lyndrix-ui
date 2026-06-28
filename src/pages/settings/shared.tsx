import { Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export const inputCls = 'lx-input'

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="lx-section-title mb-4">{children}</h3>
}

export function Card({ children }: { children: React.ReactNode }) {
  return <div className="lx-card lx-card-hover p-6">{children}</div>
}

export function EnvBadge() {
  const { t } = useTranslation('ui')
  return (
    <span
      title={t('common.env_locked_title')}
      className="inline-flex items-center gap-0.5 text-[10px] text-[var(--lx-warning)] bg-[var(--lx-warning)]/10 px-1.5 py-0.5 rounded"
    >
      <Lock size={9} />
      ENV
    </span>
  )
}

/**
 * Renders the active environment variable for a locked setting, e.g.
 * `LOG_LEVEL="DEBUG" — cannot be changed here`. Used by every settings field
 * (text, select, checkbox) so the env display stays identical across sections.
 */
export function EnvHint({ envVar, envValue }: { envVar: string; envValue?: string }) {
  const { t } = useTranslation('ui')
  return (
    <p className="mt-0.5 text-[10px] flex items-center gap-1.5 flex-wrap">
      <code className="font-mono bg-[var(--lx-warning)]/10 px-1.5 py-0.5 rounded text-[var(--lx-warning)] text-[9px] leading-none break-all">
        {envVar}
        {envValue !== undefined ? `="${envValue}"` : ''}
      </code>
      <span className="text-[var(--lx-warning)]/60">{t('common.env_locked_hint')}</span>
    </p>
  )
}

export function Field({
  label,
  children,
  hint,
  locked,
  envVar,
  envValue,
}: {
  label: string
  children: React.ReactNode
  hint?: string
  locked?: boolean
  envVar?: string
  envValue?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-medium text-[var(--lx-text-muted)]">{label}</label>
        {locked && <EnvBadge />}
      </div>
      {children}
      {locked && envVar && <EnvHint envVar={envVar} envValue={envValue} />}
      {hint && <p className="text-[10px] text-[var(--lx-text-muted)]">{hint}</p>}
    </div>
  )
}

export function SaveButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  const { t } = useTranslation('ui')
  return (
    <button onClick={onClick} disabled={loading} className="lx-btn lx-btn--primary mt-4">
      {loading ? t('common.saving') : t('common.save')}
    </button>
  )
}

export function StatusMsg({ ok, msg }: { ok: boolean; msg: string }) {
  return (
    <p
      className={`mt-2 text-sm px-3 py-2 rounded-md ${
        ok
          ? 'text-[var(--lx-state-up)] bg-[var(--lx-state-up)]/10'
          : 'text-[var(--lx-state-down)] bg-[var(--lx-elevated)]'
      }`}
    >
      {msg}
    </p>
  )
}
