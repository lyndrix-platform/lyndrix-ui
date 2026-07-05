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
  /** Server permission required to even see this section (Identity 2.0). Pure
   *  administration sections that now 403 for non-admins — omitted entirely
   *  from the nav/overview rather than shown and left to error. */
  permission?: string
}

export const SETTINGS_SECTIONS: SettingsSectionDef[] = [
  {
    id: 'general',
    labelKey: 'settings.general',
    Icon: Settings,
    component: lazy(() => import('./sections/GeneralSection')),
    // Writes go through POST /api/system/config, which is admin:write-gated.
    permission: 'admin:read',
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
    permission: 'admin:read',
  },
  {
    id: 'plugins',
    labelKey: 'settings.plugins',
    Icon: Puzzle,
    component: lazy(() => import('./sections/PluginsConfigSection')),
    permission: 'admin:read',
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
    permission: 'admin:read',
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
