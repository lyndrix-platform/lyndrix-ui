export { default as PluginLaunchpad } from './components/dashboard/PluginLaunchpad'
export { default as WelcomeSection } from './components/dashboard/WelcomeSection'
export { default as AppShell } from './components/layout/AppShell'
export { default as Sidebar } from './components/layout/Sidebar'
export { default as SectionTag } from './components/marketing/SectionTag'
export { default as FeatureCard } from './components/marketing/FeatureCard'
export { default as HeroBadge } from './components/marketing/HeroBadge'
export type { SectionTagProps } from './components/marketing/SectionTag'
export type { FeatureCardProps } from './components/marketing/FeatureCard'
export type { HeroBadgeProps } from './components/marketing/HeroBadge'
export type { PluginOut, HealthResponse, VaultStatusResponse } from './lib/types'

// Shared component library (mirrors the runtime window.__lyndrix_ui surface).
export { sharedUi } from './lib/sharedUi'
export { default as SettingsForm } from './components/SettingsForm'
export type { SettingsFormProps, TFunc } from './components/SettingsForm'
export {
  Card,
  Field,
  SectionTitle,
  SaveButton,
  StatusMsg,
  EnvBadge,
  EnvHint,
  inputCls,
} from './pages/settings/shared'
export { toast } from './lib/toast'
export type { Toast, ToastLevel } from './lib/toast'
export { getPluginIcon } from './lib/icons'
export { default as LyndrixLogo } from './components/LyndrixLogo'
export { default as LoadingSplash } from './components/LoadingSplash'
export type { EditableSettingMeta, PluginSettingField } from './lib/types'
