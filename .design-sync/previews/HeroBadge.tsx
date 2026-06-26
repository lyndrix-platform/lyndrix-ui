import { HeroBadge } from 'lyndrix-ui'

export const Default = () => (
  <div className="p-8 bg-[var(--lx-bg)] flex flex-col gap-4 items-start">
    <HeroBadge>Open Source · Apache 2.0</HeroBadge>
  </div>
)

export const NoPulse = () => (
  <div className="p-8 bg-[var(--lx-bg)] flex flex-col gap-4 items-start">
    <HeroBadge pulse={false}>Plugin Ecosystem · 7 Plugins</HeroBadge>
  </div>
)

export const Variety = () => (
  <div className="p-8 bg-[var(--lx-bg)] flex flex-col gap-3 items-start">
    <HeroBadge>Open Source · Apache 2.0</HeroBadge>
    <HeroBadge>New in v0.4 · React Frontend</HeroBadge>
    <HeroBadge pulse={false}>Stable · Production Ready</HeroBadge>
  </div>
)
