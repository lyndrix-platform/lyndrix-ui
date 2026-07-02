declare const __BUILD_TIME__: string | undefined

export const APP_NAME = 'Lyndrix UI'
export const APP_VERSION = '0.8.0'

export function versionInfo(): { name: string; version: string; buildTime: string } {
  const buildTime = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'unknown'
  return { name: APP_NAME, version: APP_VERSION, buildTime }
}
