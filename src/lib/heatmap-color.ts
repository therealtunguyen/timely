/**
 * Heatmap color scale using discrete steps (0-7) matching the Stitch design.
 * Colors progress from light gray (no participants) to brand purple (full participation).
 */
export const HEATMAP_COLORS = [
  '#f1f5f9', // 0 - empty (slate-100)
  '#e9f0ff', // 1
  '#dbe7ff', // 2
  '#c6dbff', // 3
  '#9fb0ff', // 4
  '#7b93ff', // 5
  '#5f76ff', // 6
  '#6868ed', // 7 - full (brand)
] as const

/**
 * Returns the appropriate heatmap color index (0-7) based on count and total.
 */
export function getHeatmapLevel(count: number, total: number): number {
  if (count <= 0 || total <= 0) return 0
  if (count >= total) return 7
  // Map 1 to (total-1) across levels 1-6
  const ratio = count / total
  return Math.min(6, Math.max(1, Math.ceil(ratio * 6)))
}

/**
 * Returns a hex color for a slot based on its participant count and total participants.
 * Uses discrete 8-level scale matching the Stitch design.
 */
export function slotColor(count: number, total: number): string {
  const level = getHeatmapLevel(count, total)
  return HEATMAP_COLORS[level]
}

/**
 * Returns the appropriate text color for a heatmap cell based on its level.
 * Levels 0-3 use dark text, levels 4-7 use white text for contrast.
 */
export function getHeatmapTextColor(level: number): string {
  if (level <= 3) {
    return level === 0 ? '#94a3b8' : '#312e81' // slate-400 for empty, indigo-900 for light
  }
  return '#ffffff' // white for dark backgrounds
}

// Keep legacy exports for backwards compatibility
export const HEATMAP_LIGHT = HEATMAP_COLORS[0]
export const HEATMAP_DARK = HEATMAP_COLORS[7]
