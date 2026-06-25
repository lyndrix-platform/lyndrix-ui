import { useState, useEffect } from 'react'
import { toast as toastBus } from '../lib/toast'
import type { Toast } from '../lib/toast'

const DURATION_MS = 4000

export default function ToastStack() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    return toastBus._subscribe((t) => {
      setToasts((prev) => [...prev, t])
      setTimeout(
        () => setToasts((prev) => prev.filter((x) => x.id !== t.id)),
        DURATION_MS,
      )
    })
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-lg shadow-lg border text-sm font-medium backdrop-blur-[8px]"
          style={{
            background:
              t.level === 'error'
                ? 'color-mix(in srgb, var(--lx-state-down) 12%, var(--lx-surface))'
                : t.level === 'success'
                  ? 'color-mix(in srgb, var(--lx-state-up) 12%, var(--lx-surface))'
                  : 'var(--lx-surface)',
            borderColor:
              t.level === 'error'
                ? 'color-mix(in srgb, var(--lx-state-down) 40%, transparent)'
                : t.level === 'success'
                  ? 'color-mix(in srgb, var(--lx-state-up) 40%, transparent)'
                  : 'var(--lx-border-soft)',
            color:
              t.level === 'error'
                ? 'var(--lx-state-down)'
                : t.level === 'success'
                  ? 'var(--lx-state-up)'
                  : 'var(--lx-text)',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{
              background:
                t.level === 'error'
                  ? 'var(--lx-state-down)'
                  : t.level === 'success'
                    ? 'var(--lx-state-up)'
                    : 'var(--lx-accent)',
            }}
          />
          {t.message}
        </div>
      ))}
    </div>
  )
}
