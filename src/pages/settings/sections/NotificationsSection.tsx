import { Bell } from 'lucide-react'

export default function NotificationsSection(_: {
  config: Record<string, unknown>
  envLocked: string[]
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <Bell size={32} className="text-[var(--lx-text-muted)] opacity-40" />
      <p className="text-sm text-[var(--lx-text-muted)]">Benachrichtigungen — demnächst verfügbar.</p>
    </div>
  )
}
