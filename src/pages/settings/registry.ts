import { lazy } from 'react'
import type { ComponentType, LazyExoticComponent } from 'react'
import { Settings, Palette, ShieldCheck, Puzzle, User, Info, Bell, Smartphone } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { EditableSettingMeta } from '../../lib/types'
import { isNativeApp } from '../../lib/nativeBridge'

export interface SettingsSectionProps {
  config: Record<string, unknown>
  envLocked: string[]
  editableSettings: EditableSettingMeta[]
}

export interface SettingsSectionDef {
  id: string
  labelKey: string
  Icon: LucideIcon
  component: LazyExoticComponent<ComponentType<SettingsSectionProps>>
}

export const SETTINGS_SECTIONS: SettingsSectionDef[] = [
  {
    id: 'general',
    labelKey: 'settings.general',
    Icon: Settings,
    component: lazy(() => import('./sections/GeneralSection')),
  },
  {
    id: 'appearance',
    labelKey: 'settings.appearance',
    Icon: Palette,
    component: lazy(() => import('./sections/AppearanceSection')),
  },
  {
    id: 'auth',
    labelKey: 'settings.auth',
    Icon: ShieldCheck,
    component: lazy(() => import('./sections/AuthSection')),
  },
  {
    id: 'plugins',
    labelKey: 'settings.plugins',
    Icon: Puzzle,
    component: lazy(() => import('./sections/PluginsConfigSection')),
  },
  {
    id: 'profile',
    labelKey: 'settings.profile',
    Icon: User,
    component: lazy(() => import('./sections/ProfileSection')),
  },
  {
    id: 'info',
    labelKey: 'settings.info',
    Icon: Info,
    component: lazy(() => import('./sections/InfoSection')),
  },
  {
    id: 'notifications',
    labelKey: 'settings.notifications',
    Icon: Bell,
    component: lazy(() => import('./sections/NotificationsSection')),
  },
  // Native-only: appears solely inside the Capacitor app shell (lyndrix-app), where it holds the
  // runtime backend switcher. `@capacitor/core` is loaded before this module runs, so the platform
  // check is already accurate at module scope.
  ...(isNativeApp()
    ? [
        {
          id: 'native',
          labelKey: 'settings.native',
          Icon: Smartphone,
          component: lazy(() => import('./sections/NativeSettingsSection')),
        } as SettingsSectionDef,
      ]
    : []),
]
