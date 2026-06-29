import { useSyncExternalStore } from 'react'

// Client-side personalization for the liquid-glass effect, mirroring the
// rdev/liquid-glass-react demo controls. Persisted per-browser in localStorage
// and shared live across every consumer (tiles, showcase, the settings panel).

export type GlassMode = 'standard' | 'polar' | 'prominent' | 'shader'

export interface GlassConfig {
  /** Master switch — off falls back to the CSS `.lx-card` glass everywhere. */
  enabled: boolean
  /** Apply the effect to every dashboard tile (heavier), not just the key stat
   *  tiles. Each glass tile adds a GPU filter pass, so this can lag on weak GPUs. */
  allTiles: boolean
  mode: GlassMode
  displacementScale: number
  blurAmount: number
  saturation: number
  aberrationIntensity: number
  elasticity: number
  cornerRadius: number
  overLight: boolean
}

// Demo defaults, with cornerRadius tuned down for tiles (the demo's 32 is for a
// big hero card; tiles read better around 16 — the slider still reaches 32+).
export const GLASS_DEFAULTS: GlassConfig = {
  enabled: true,
  allTiles: true,
  mode: 'standard',
  displacementScale: 100,
  blurAmount: 0.5,
  saturation: 140,
  // 0 = single-pass displacement (cheap, no colour fringe). Raising this turns on
  // the 3-pass chromatic-aberration path, which is much heavier on the GPU.
  aberrationIntensity: 0,
  elasticity: 0,
  cornerRadius: 16,
  overLight: false,
}

const KEY = 'lyndrix_glass_config'
const listeners = new Set<() => void>()

function load(): GlassConfig {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...GLASS_DEFAULTS, ...(JSON.parse(raw) as Partial<GlassConfig>) }
  } catch {
    // ignore — fall through to defaults
  }
  return { ...GLASS_DEFAULTS }
}

let current: GlassConfig = load()

export function getGlassConfig(): GlassConfig {
  return current
}

export function setGlassConfig(patch: Partial<GlassConfig>): void {
  current = { ...current, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    // best-effort (private mode / quota)
  }
  listeners.forEach((l) => l())
}

export function resetGlassConfig(): void {
  current = { ...GLASS_DEFAULTS }
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

/** Reactive read — re-renders consumers whenever the config changes. */
export function useGlassConfig(): GlassConfig {
  return useSyncExternalStore(subscribe, getGlassConfig, getGlassConfig)
}
