export const HEATMAP_LIGHT = '#FAF7F4'
export const HEATMAP_DARK = '#7C4A0E'

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

function lerpColor(from: string, to: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(from)
  const [r2, g2, b2] = hexToRgb(to)
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * t)
  const r = lerp(r1, r2).toString(16).padStart(2, '0')
  const g = lerp(g1, g2).toString(16).padStart(2, '0')
  const b = lerp(b1, b2).toString(16).padStart(2, '0')
  return `#${r}${g}${b}`
}

/**
 * Returns a hex color for a slot based on its participant count and the event's peak count.
 * Uses sqrt interpolation for perceptual spread — makes 2 people vs 3 people visually distinct
 * even when the peak is 10. Without sqrt, low counts look identical (all near-white).
 *
 * count=0 → HEATMAP_LIGHT (#FAF7F4, empty/off-white)
 * count=peak → HEATMAP_DARK (#7C4A0E, darkest amber)
 */
export function slotColor(count: number, peak: number): string {
  if (count <= 0 || peak <= 0) return HEATMAP_LIGHT
  const t = Math.sqrt(count / peak)  // sqrt for perceptual spread across 2-10 participants
  return lerpColor(HEATMAP_LIGHT, HEATMAP_DARK, t)
}
