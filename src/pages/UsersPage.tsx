import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { apiFetch } from '../lib/api'
import { isSystemFlag } from './users/permissionModel'
import { errorMessage, useUsers } from './users/queries'
import { Avatar, Badge, Chip, inputCls } from './users/shared'
import UserDetailPanel from './users/UserDetailPanel'
import GroupsTab from './users/GroupsTab'

// ── Create user modal ─────────────────────────────────────────────────────────

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('ui')
  const qc = useQueryClient()
  const [form, setForm] = useState({ username: '', password: '', full_name: '', email: '' })
  const [error, setError] = useState<string | null>(null)

  const mut = useMutation({
    mutationFn: () => apiFetch('/api/users', { method: 'POST', body: JSON.stringify(form) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      onClose()
    },
    onError: (e) => setError(errorMessage(e, t('common.error'))),
  })

  const fields: { label: string; key: keyof typeof form; type?: string }[] = [
    { label: t('users_page.field_username'), key: 'username' },
    { label: t('users_page.field_password'), key: 'password', type: 'password' },
    { label: t('users_page.field_full_name'), key: 'full_name' },
    { label: t('users_page.field_email'), key: 'email' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-[var(--lx-scrim)]" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-[var(--lx-surface-glass)] backdrop-blur-[var(--lx-blur-md)] backdrop-saturate-150 rounded-lg border border-[var(--lx-border-soft)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-[var(--lx-text)]">{t('users_page.create_user_title')}</h3>
          <button type="button" onClick={onClose} className="text-[var(--lx-text-muted)] hover:text-[var(--lx-text)]">
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {fields.map(({ label, key, type }) => (
            <div key={key} className="flex flex-col gap-1">
              <label className="lx-label">{label}</label>
              <input
                className={inputCls}
                type={type ?? 'text'}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}
          {error && <p className="text-xs text-[var(--lx-state-down)]">{error}</p>}
          <button
            type="button"
            onClick={() => mut.mutate()}
            disabled={!form.username || !form.password || mut.isPending}
            className="lx-btn lx-btn--primary lx-btn--block mt-2"
          >
            {mut.isPending ? t('users_page.creating') : t('users_page.create')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Users tab ─────────────────────────────────────────────────────────────────

const MAX_GROUP_CHIPS = 3

function UsersTab() {
  const { t } = useTranslation('ui')
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const { data: users } = useUsers()
  // Derived from the list so the panel refreshes after every save.
  const selectedUser = users?.find((u) => u.username === selectedName) ?? null

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="lx-eyebrow">{t('users_page.user_count', { count: users?.length ?? 0 })}</span>
        <button type="button" onClick={() => setCreating(true)} className="lx-btn lx-btn--primary lx-btn--sm">
          <span className="material-icons" style={{ fontSize: 16 }}>
            add
          </span>
          {t('users_page.create_user_btn')}
        </button>
      </div>

      <div className="flex flex-col gap-1">
        {(users ?? []).map((u) => {
          const flags = u.roles.filter(isSystemFlag)
          const groups = u.groups.slice(0, MAX_GROUP_CHIPS)
          const more = u.groups.length - groups.length
          return (
            <button
              type="button"
              key={u.username}
              onClick={() => setSelectedName(u.username)}
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-md text-left bg-[var(--lx-surface-glass)] backdrop-blur-[var(--lx-blur-md)] backdrop-saturate-150 border border-[var(--lx-border-soft)] hover:border-[var(--lx-accent)] cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={u.username} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--lx-text)] truncate">{u.full_name || u.username}</p>
                  <p className="text-xs text-[var(--lx-text-muted)] truncate">@{u.username}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
                {flags.map((f) => (
                  <Badge key={f} label={t(`users_page.flag_${f}`)} />
                ))}
                {groups.map((g) => (
                  <Chip key={g} label={g} tone="group" />
                ))}
                {more > 0 && <Chip label={`+${more}`} tone="muted" title={u.groups.slice(MAX_GROUP_CHIPS).join(', ')} />}
              </div>
            </button>
          )
        })}
      </div>

      {selectedUser && (
        <UserDetailPanel key={selectedUser.username} user={selectedUser} onClose={() => setSelectedName(null)} />
      )}
      {creating && <CreateUserModal onClose={() => setCreating(false)} />}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = 'users' | 'groups'

export default function UsersPage() {
  const { t } = useTranslation('ui')
  const [tab, setTab] = useState<Tab>('users')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'users', label: t('users_page.tab_users') },
    { id: 'groups', label: t('users_page.tab_groups') },
  ]

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 md:px-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--lx-text)] tracking-tight">{t('users_page.page_title')}</h1>
        <p className="text-sm text-[var(--lx-text-muted)] mt-1">{t('users_page.page_subtitle')}</p>
      </div>

      <div className="lx-tabs mb-6">
        {tabs.map((tab_) => (
          <button
            key={tab_.id}
            type="button"
            onClick={() => setTab(tab_.id)}
            className={`lx-tab ${tab === tab_.id ? 'lx-tab--active' : ''}`}
          >
            {tab_.label}
          </button>
        ))}
      </div>

      {tab === 'users' && <UsersTab />}
      {tab === 'groups' && <GroupsTab />}
    </div>
  )
}
