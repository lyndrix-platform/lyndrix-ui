// Legacy per-browser colour-override store. Superseded by lib/browserOverrides.ts,
// which generalises the same `{ light, dark }` shape from colours-only to any
// `--lx-*` variable. This file survives only as the MIGRATION SOURCE: it exports
// the old localStorage key and the shared shape so browserOverrides can copy the
// legacy value once. Nothing writes this key anymore.

export interface PersonalOverrides {
  light: Record<string, string>
  dark: Record<string, string>
}

/** Legacy localStorage key. Read once by the browserOverrides migrator; never written. */
export const LEGACY_PERSONAL_THEME_KEY = 'lyndrix_personal_theme'
