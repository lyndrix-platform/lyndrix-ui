import { Capacitor, registerPlugin } from '@capacitor/core'

// Bridge to the native Lyndrix app shell (lyndrix-app, Capacitor). These calls only do something
// when running inside that app; in a browser `isNativeApp()` is false and the native-only UI that
// uses them is never rendered. Mirror of the Java `BackendSwitcherPlugin`.

export interface ServerUrlInfo {
  /** The origin the app currently loads (and therefore the backend it talks to). */
  url: string
  /** The flavor's compiled-in default origin. */
  default: string
  /** True when the user has overridden the default. */
  isCustom: boolean
}

export interface NativeAppInfo {
  packageName: string
  versionName: string
  versionCode: number
}

export interface BackendSwitcherPlugin {
  getServerUrl(): Promise<ServerUrlInfo>
  /** Persist a new https origin; the native side validates it and recreates the Activity to reload. */
  setServerUrl(options: { url: string }): Promise<void>
  /** Clear the override and reload onto the flavor default. */
  resetServerUrl(): Promise<{ url: string }>
  getInfo(): Promise<NativeAppInfo>
}

export const BackendSwitcher = registerPlugin<BackendSwitcherPlugin>('BackendSwitcher')

/** True only inside the Capacitor native shell (the Android app); false in any browser. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}
