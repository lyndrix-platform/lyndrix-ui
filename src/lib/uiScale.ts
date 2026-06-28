// Global UI scale: Tailwind sizes are rem-based, so scaling the root font-size scales the whole
// interface proportionally. The value is persisted to localStorage and applied early by the inline
// boot script in index.html (which must agree with STORAGE_KEY and the `* 100 + '%'` formula below)
// to avoid a flash, then kept in sync at runtime by the App settings control.

const STORAGE_KEY = 'lyndrix_ui_scale'

export const UI_SCALE_DEFAULT = 1
export const UI_SCALE_MIN = 0.85
export const UI_SCALE_MAX = 1.5
export const UI_SCALE_STEP = 0.05

function clamp(scale: number): number {
  return Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, scale))
}

/** Read the persisted scale, clamped to the supported range; falls back to the default. */
export function getUiScale(): number {
  const n = Number(localStorage.getItem(STORAGE_KEY))
  return Number.isFinite(n) && n > 0 ? clamp(n) : UI_SCALE_DEFAULT
}

/** Apply a scale to the document root. Mirror of the inline boot script's formula. */
export function applyUiScale(scale: number): void {
  document.documentElement.style.fontSize = scale * 100 + '%'
}

/** Persist + apply a scale, returning the clamped value that was actually used. */
export function setUiScale(scale: number): number {
  const clamped = clamp(scale)
  localStorage.setItem(STORAGE_KEY, String(clamped))
  applyUiScale(clamped)
  return clamped
}
