import { AppShell } from 'lyndrix-ui'

export const Default = () => (
  <div style={{ height: 600, width: 900 }}>
    <AppShell>
      <div className="p-8 flex flex-col gap-4">
        <h1 className="text-2xl font-light text-[var(--lx-text)]">Dashboard</h1>
        <p className="text-sm text-[var(--lx-text-muted)]">Plattform-Übersicht und Plugin-Launchpad</p>
        <div className="grid grid-cols-3 gap-4 mt-4">
          {['Server Manager', 'Monitor', 'Discord'].map((name) => (
            <div key={name} className="p-4 rounded-lg border border-[var(--lx-border-soft)] bg-[var(--lx-surface)]">
              <p className="text-sm font-medium text-[var(--lx-text)]">{name}</p>
              <p className="text-[10px] text-[var(--lx-text-muted)] mt-1">Plugin aktiv</p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  </div>
)
