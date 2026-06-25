import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { KeyRound, LogOut, Settings, User, Users } from 'lucide-react'
import { apiFetch } from '../lib/api'
import { getMe, logout } from '../lib/auth'
import { toast } from '../lib/toast'

export default function ProfileMenu() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [showPwForm, setShowPwForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe })

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function closeMenu() {
    setOpen(false)
    setShowPwForm(false)
    setCurrentPassword('')
    setNewPassword('')
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!me?.username) return
    setSaving(true)
    try {
      await apiFetch(`/api/users/${encodeURIComponent(me.username)}/password`, {
        method: 'POST',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      })
      toast.success('Passwort geändert')
      setShowPwForm(false)
      setCurrentPassword('')
      setNewPassword('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Ändern des Passworts')
    } finally {
      setSaving(false)
    }
  }

  const initials = (me?.full_name || me?.username || '?')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="lx-icon-btn"
        title="Profil"
        aria-label="Profil"
        onClick={() => setOpen((v) => !v)}
      >
        {me ? (
          <span className="text-xs font-semibold">{initials}</span>
        ) : (
          <User size={18} />
        )}
      </button>

      {open && (
        <div className="lx-card absolute right-0 mt-2 w-72 z-50 shadow-xl overflow-hidden">
          {/* Identity */}
          <div className="px-3 py-3 border-b border-[var(--lx-border-soft)]">
            <p className="text-sm font-semibold text-[var(--lx-text)] truncate">
              {me?.full_name || me?.username || '…'}
            </p>
            <p className="text-[11px] text-[var(--lx-text-muted)] truncate">@{me?.username}</p>
            {me?.email && (
              <p className="text-[11px] text-[var(--lx-text-muted)] truncate">{me.email}</p>
            )}
            {me?.roles && me.roles.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {me.roles.map((r) => (
                  <span key={r} className="lx-badge lx-badge--muted">
                    {r}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Links */}
          <div className="py-1">
            <Link
              to="/settings"
              onClick={closeMenu}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--lx-text-muted)] hover:text-[var(--lx-text)] hover:bg-[var(--lx-elevated)]/50 transition-colors"
            >
              <Settings size={15} />
              Einstellungen
            </Link>
            <Link
              to="/users"
              onClick={closeMenu}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--lx-text-muted)] hover:text-[var(--lx-text)] hover:bg-[var(--lx-elevated)]/50 transition-colors"
            >
              <Users size={15} />
              Benutzer
            </Link>
            <button
              type="button"
              onClick={() => setShowPwForm((v) => !v)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--lx-text-muted)] hover:text-[var(--lx-text)] hover:bg-[var(--lx-elevated)]/50 transition-colors"
            >
              <KeyRound size={15} />
              Passwort ändern
            </button>
          </div>

          {/* Password change form */}
          {showPwForm && (
            <form
              onSubmit={handleChangePassword}
              className="px-3 py-2 border-t border-[var(--lx-border-soft)] flex flex-col gap-2"
            >
              <div>
                <label className="lx-label">Aktuelles Passwort</label>
                <input
                  type="password"
                  className="lx-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="lx-label">Neues Passwort</label>
                <input
                  type="password"
                  className="lx-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <button
                type="submit"
                className="lx-btn lx-btn--primary lx-btn--sm lx-btn--block"
                disabled={saving}
              >
                {saving ? 'Speichern…' : 'Passwort ändern'}
              </button>
            </form>
          )}

          {/* Logout */}
          <div className="py-1 border-t border-[var(--lx-border-soft)]">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--lx-text-muted)] hover:text-[var(--lx-state-down)] hover:bg-[var(--lx-elevated)]/50 transition-colors"
            >
              <LogOut size={15} />
              Abmelden
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
