import { Lock } from 'lucide-react'

export const inputCls = 'lx-input'

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="lx-section-title mb-4">{children}</h3>
}

export function Card({ children }: { children: React.ReactNode }) {
  return <div className="lx-card lx-card-hover p-6">{children}</div>
}

export function EnvBadge() {
  return (
    <span
      title="Durch Umgebungsvariable gesperrt"
      className="inline-flex items-center gap-0.5 text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded"
    >
      <Lock size={9} />
      ENV
    </span>
  )
}

export function Field({
  label,
  children,
  hint,
  locked,
  envVar,
}: {
  label: string
  children: React.ReactNode
  hint?: string
  locked?: boolean
  /** OS env-var that locks this field; shown as a warning when `locked`. */
  envVar?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-medium text-[var(--lx-text-muted)]">{label}</label>
        {locked && <EnvBadge />}
      </div>
      {children}
      {locked && envVar && (
        <p className="text-[10px] text-amber-400/90">
          Gesetzt über Umgebungsvariable <span className="font-mono">{envVar}</span> — hier nicht
          änderbar.
        </p>
      )}
      {hint && <p className="text-[10px] text-[var(--lx-text-muted)]">{hint}</p>}
    </div>
  )
}

export function SaveButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button onClick={onClick} disabled={loading} className="lx-btn lx-btn--primary mt-4">
      {loading ? 'Speichern…' : 'Speichern'}
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
