import { FeatureCard } from 'lyndrix-ui'

const PluginIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
)

const LockIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0110 0v4"/>
  </svg>
)

const EventIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
)

export const Single = () => (
  <div className="p-6 bg-[var(--lx-bg)]" style={{ maxWidth: '340px' }}>
    <FeatureCard
      icon={<PluginIcon />}
      title="Plugin-First Architecture"
      description="Drop in a plugin with setup(ctx) and the framework handles the rest — auth, database, UI, and more."
    />
  </div>
)

export const Grid = () => (
  <div
    className="p-6 bg-[var(--lx-bg)]"
    style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}
  >
    <FeatureCard icon={<PluginIcon />} title="Plugin-First" description="Every feature ships as an isolated, installable plugin. Drop in and go." />
    <FeatureCard icon={<LockIcon />} title="Vault-Backed Secrets" description="Zero-trust secrets with automatic bootstrap, unseal, and per-plugin isolation." />
    <FeatureCard icon={<EventIcon />} title="Event-Driven Core" description="A global event bus decouples every component. No spaghetti imports." />
  </div>
)
