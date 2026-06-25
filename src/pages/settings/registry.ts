import { lazy } from 'react'
import type { ComponentType, LazyExoticComponent } from 'react'
import { Settings, Palette, ShieldCheck, Puzzle, User, Info, Bell } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface SettingsSectionProps {
  config: Record<string, unknown>
  envLocked: string[]
}

export interface SettingsSectionDef {
  id: string
  label: string
  Icon: LucideIcon
  component: LazyExoticComponent<ComponentType<SettingsSectionProps>>
}

export const SETTINGS_SECTIONS: SettingsSectionDef[] = [
  {
    id: 'general',
    label: 'Allgemein',
    Icon: Settings,
    component: lazy(() => import('./sections/GeneralSection')),
  },
  {
    id: 'appearance',
    label: 'Darstellung',
    Icon: Palette,
    component: lazy(() => import('./sections/AppearanceSection')),
  },
  {
    id: 'auth',
    label: 'Auth-Anbieter',
    Icon: ShieldCheck,
    component: lazy(() => import('./sections/AuthSection')),
  },
  {
    id: 'plugins',
    label: 'Plugins',
    Icon: Puzzle,
    component: lazy(() => import('./sections/PluginsConfigSection')),
  },
  {
    id: 'profile',
    label: 'Profil',
    Icon: User,
    component: lazy(() => import('./sections/ProfileSection')),
  },
  {
    id: 'info',
    label: 'System Info',
    Icon: Info,
    component: lazy(() => import('./sections/InfoSection')),
  },
  {
    id: 'notifications',
    label: 'Benachrichtigungen',
    Icon: Bell,
    component: lazy(() => import('./sections/NotificationsSection')),
  },
]
