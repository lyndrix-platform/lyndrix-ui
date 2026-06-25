import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, getToken, clearToken } from '../../../lib/api'
import type { ThemeOut } from '../../../lib/types'
import { Card, SectionTitle } from '../shared'

export default function AppearanceSection(_: {
  config: Record<string, unknown>
  envLocked: string[]
}) {
  const qc = useQueryClient()
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const { data: themes } = useQuery({
    queryKey: ['themes'],
    queryFn: () => apiFetch<{ themes: ThemeOut[] }>('/api/themes').then((r) => r.themes),
  })

  const { data: activeTheme } = useQuery({
    queryKey: ['theme-active'],
    queryFn: () => apiFetch<{ theme_id: string }>('/api/themes/active').then((r) => r.theme_id),
  })

  const activateMut = useMutation({
    mutationFn: (themeId: string) =>
      apiFetch('/api/themes/active', {
        method: 'PUT',
        body: JSON.stringify({ theme_id: themeId }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['theme-active'] }),
  })

  const deleteMut = useMutation({
    mutationFn: (themeId: string) => apiFetch(`/api/themes/${themeId}`, { method: 'DELETE' }),
    onSuccess: () => {
      setDeleteConfirm(null)
      qc.invalidateQueries({ queryKey: ['themes'] })
      qc.invalidateQueries({ queryKey: ['theme-active'] })
    },
  })

  async function handleUpload(file: File) {
    setUploadStatus(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      // Multipart upload can't use apiFetch (it forces JSON), so replicate its
      // auth + 401 handling here: a dead session redirects to login instead of
      // failing silently.
      const token = getToken()
      const r = await fetch('/api/themes', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      })
      if (r.status === 401) {
        clearToken()
        window.location.href = '/login'
        return
      }
      if (!r.ok) {
        const body = await r.json().catch(() => ({ detail: r.statusText }))
        throw new Error((body as { detail?: string })?.detail ?? r.statusText)
      }
      setUploadStatus('Theme hochgeladen.')
      qc.invalidateQueries({ queryKey: ['themes'] })
    } catch (e) {
      setUploadStatus(e instanceof Error ? e.message : 'Upload fehlgeschlagen')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <SectionTitle>Theme auswählen</SectionTitle>
        <div className="flex flex-col gap-2">
          {(themes ?? []).map((t) => {
            const tid = typeof t === 'string' ? t : (t as ThemeOut).id
            const isActive = tid === activeTheme
            return (
              <div
                key={tid}
                className={`flex items-center justify-between px-4 py-2.5 rounded-md border text-sm cursor-pointer transition-colors ${
                  isActive
                    ? 'border-[var(--lx-accent)] bg-[var(--lx-accent)]/5 text-[var(--lx-accent)]'
                    : 'border-[var(--lx-border-soft)] bg-[var(--lx-elevated)] text-[var(--lx-text)] hover:border-[var(--lx-accent)]/40'
                }`}
                onClick={() => !isActive && activateMut.mutate(tid)}
              >
                <span className="capitalize">{tid}</span>
                <div className="flex items-center gap-2">
                  {isActive && (
                    <span className="text-[10px] uppercase tracking-wide text-[var(--lx-accent)]">
                      Aktiv
                    </span>
                  )}
                  {tid !== 'default' && (
                    <span
                      role="button"
                      className="text-[var(--lx-text-muted)] hover:text-[var(--lx-state-down)] text-xs px-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteConfirm(tid)
                      }}
                    >
                      ✕
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {deleteConfirm && (
          <div className="mt-3 p-3 rounded-md bg-[var(--lx-elevated)] border border-[var(--lx-state-down)]/30 text-sm">
            <p className="text-[var(--lx-text)] mb-2">Theme „{deleteConfirm}" löschen?</p>
            <div className="flex gap-2">
              <button
                onClick={() => deleteMut.mutate(deleteConfirm)}
                className="px-3 py-1 rounded text-xs bg-[var(--lx-state-down)] text-white"
              >
                Löschen
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-3 py-1 rounded text-xs text-[var(--lx-text-muted)]"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle>Theme hochladen</SectionTitle>
        <p className="text-xs text-[var(--lx-text-muted)] mb-3">
          ZIP-Datei mit{' '}
          <code className="text-[var(--lx-accent)]">tokens.json</code> und{' '}
          <code className="text-[var(--lx-accent)]">components.json</code>.
        </p>
        <input
          type="file"
          accept=".zip"
          className="text-sm text-[var(--lx-text-muted)]"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleUpload(f)
          }}
        />
        {uploadStatus && (
          <p className="mt-2 text-xs text-[var(--lx-text-muted)]">{uploadStatus}</p>
        )}
      </Card>
    </div>
  )
}
