import { WelcomeSection } from 'lyndrix-ui'
import type { HealthResponse, VaultStatusResponse } from 'lyndrix-ui'

type MeResponse = {
  username: string
  full_name: string | null
  email: string | null
  roles: string[]
  groups: string[]
  extra_permissions: string[]
  method: string
  is_system: boolean
}

const me: MeResponse = {
  username: 'marvin',
  full_name: 'Marvin Feser',
  email: 'marvin@fam-feser.de',
  roles: ['admin'],
  groups: [],
  extra_permissions: [],
  method: 'local',
  is_system: false,
}

const health: HealthResponse = {
  status: 'ok',
  core_version: '0.3.0',
  api_version: '1.1.0',
  plugins: {
    'lyndrix.plugin.server-manager': { status: 'active' },
    'lyndrix.plugin.discord-notifier': { status: 'active' },
  },
}

const vaultOk: VaultStatusResponse = {
  status: 'unsealed',
  initialized: true,
  sealed: false,
  connected: true,
  ui_state: 'Offen',
}

const vaultSealed: VaultStatusResponse = {
  status: 'sealed',
  initialized: true,
  sealed: true,
  connected: false,
  ui_state: 'Versiegelt',
}

export const Default = () => (
  <div className="p-6 bg-[var(--lx-bg)]">
    <WelcomeSection me={me} health={health} vaultStatus={vaultOk} />
  </div>
)

export const VaultSealed = () => (
  <div className="p-6 bg-[var(--lx-bg)]">
    <WelcomeSection me={me} health={{ ...health, status: 'degraded' }} vaultStatus={vaultSealed} />
  </div>
)

export const Loading = () => (
  <div className="p-6 bg-[var(--lx-bg)]">
    <WelcomeSection me={undefined} health={undefined} vaultStatus={undefined} />
  </div>
)
