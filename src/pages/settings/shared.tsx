import { Lock } from 'lucide-react'

export const inputCls =
  'px-3 py-2 rounded-md bg-[var(--lx-elevated)] border border-[var(--lx-border-soft)] text-[var(--lx-text)] text-sm outline-none focus:border-[var(--lx-accent)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs uppercase tracking-widest text-[var(--lx-text-muted)] font-medium mb-3">
      {children}
    </h3>
  )
}

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--lx-border-soft)] bg-[var(--lx-surface)] p-5">
      {children}
    </div>
  )
}

export function Field({
  label,
  children,
  hint,
  locked,
}: {
  label: string
  children: React.ReactNode
  hint?: string
  locked?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-[var(--lx-text-muted)] uppercase tracking-wide">{label}</label>
        {locked && (
          <span
            title="Durch Umgebungsvariable gesperrt"
            className="inline-flex items-center gap-0.5 text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded"
          >
            <Lock size={9} />
            ENV
          </span>
        )}
      </div>
      {children}
      {hint && <p className="text-[10px] text-[var(--lx-text-muted)]">{hint}</p>}
    </div>
  )
}

export function SaveButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="mt-3 px-4 py-1.5 rounded-md text-sm font-medium disabled:opacity-40 transition-opacity hover:opacity-90"
      style={{
        background: 'linear-gradient(135deg, var(--lx-accent), var(--lx-accent-2))',
        color: 'var(--lx-bg)',
      }}
    >
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
