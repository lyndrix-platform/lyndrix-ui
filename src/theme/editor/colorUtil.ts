/**
 * Normalise any CSS colour the browser can compute into a `#rrggbb` string for
 * `<input type="color">` (which only accepts 6-digit hex). Handles #rgb, #rrggbb
 * and rgb()/rgba(); anything else falls back to #000000. Lifted from the old
 * AppearanceSection PersonalizationCard.
 */
export function toHex(value: string): string {
  const v = value.trim()
  if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase()
  if (/^#[0-9a-f]{3}$/i.test(v))
    return ('#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3]).toLowerCase()
  const m = v.match(/^rgba?\(([^)]+)\)/i)
  if (m) {
    const [r, g, b] = m[1].split(',').map((x) => parseFloat(x))
    const h = (n: number) =>
      Math.max(0, Math.min(255, Math.round(n || 0)))
        .toString(16)
        .padStart(2, '0')
    return ('#' + h(r) + h(g) + h(b)).toLowerCase()
  }
  return '#000000'
}
