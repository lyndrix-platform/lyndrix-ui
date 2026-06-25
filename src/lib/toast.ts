/**
 * Minimal pub-sub toast bus.
 *
 * Usage:
 *   import { toast } from '../lib/toast'
 *   toast.success('Gespeichert')
 *   toast.error('Fehler beim Speichern')
 *
 * ToastStack subscribes and renders the queue.
 */

export type ToastLevel = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  level: ToastLevel
  message: string
}

type Listener = (t: Toast) => void

let _counter = 0
const _listeners: Set<Listener> = new Set()

function _emit(level: ToastLevel, message: string) {
  const t: Toast = { id: ++_counter, level, message }
  _listeners.forEach((fn) => fn(t))
}

export const toast = {
  success: (message: string) => _emit('success', message),
  error: (message: string) => _emit('error', message),
  info: (message: string) => _emit('info', message),
  _subscribe: (fn: Listener) => {
    _listeners.add(fn)
    return () => _listeners.delete(fn)
  },
}
