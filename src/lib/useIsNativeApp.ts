import { useState } from 'react'
import { isNativeApp } from './nativeBridge'

/**
 * Returns true when running inside the Capacitor native shell (the Android app), false in a browser.
 * Native-ness is fixed for the page's lifetime, so this reads once. Use it to gate native-only UI
 * (e.g. the Settings → App tab). The registry uses the plain `isNativeApp()` at module scope; this
 * hook is for use inside components.
 */
export function useIsNativeApp(): boolean {
  const [native] = useState<boolean>(isNativeApp)
  return native
}
