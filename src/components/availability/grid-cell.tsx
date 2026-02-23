'use client'

import { cn } from '@/lib/utils'
import { motion } from 'motion/react'

interface GridCellProps {
  slotKey: string
  // Edit mode (existing)
  isSelected?: boolean
  // Heatmap mode (new — all optional)
  heatmapColor?: string         // Pre-computed hex color from slotColor(). Applied via inline style (NOT className — Tailwind cannot generate runtime hex strings)
  isOwn?: boolean               // Current viewer has this slot marked — shows personal indicator
  dimmed?: boolean              // Tap-a-name: slot is not in intersection — dims to near-white
  count?: number                // For aria-label
  totalParticipants?: number    // For aria-label
  dateLabel?: string            // For aria-label e.g. "Tuesday"
  timeLabel?: string            // For aria-label e.g. "10:00–10:30 AM"
  tabIndex?: number             // For keyboard navigation: 0 = in tab order, -1 = focusable but not in tab order
}

export function GridCell({
  slotKey,
  isSelected = false,
  heatmapColor,
  isOwn = false,
  dimmed = false,
  count,
  totalParticipants,
  dateLabel,
  timeLabel,
  tabIndex,
}: GridCellProps) {
  // Build aria-label when heatmap data is available
  const ariaLabel = (count !== undefined && totalParticipants !== undefined && timeLabel && dateLabel)
    ? `${count} of ${totalParticipants} people available ${timeLabel} ${dateLabel}`
    : undefined

  // Heatmap mode: uses heatmapColor inline style + motion for dim effect
  if (heatmapColor !== undefined) {
    return (
      <motion.div
        data-slot-key={slotKey}
        animate={{ opacity: dimmed ? 0.2 : 1 }}
        transition={{ duration: 0.15 }}
        className="relative min-h-[44px] min-w-[44px] border-b border-r border-border-default select-none"
        style={{ backgroundColor: heatmapColor }}
        aria-label={ariaLabel}
        role="gridcell"
        tabIndex={tabIndex}
      >
        {/* Personal indicator: inner border overlay when viewer owns this slot */}
        {isOwn && (
          <div className="absolute inset-[3px] rounded-sm border-2 border-white/70 pointer-events-none" />
        )}
      </motion.div>
    )
  }

  // Edit mode (original behavior — unchanged)
  return (
    <div
      data-slot-key={slotKey}
      className={cn(
        'min-h-[44px] min-w-[44px] border-b border-r border-border-default select-none touch-none cursor-pointer',
        isSelected
          ? 'bg-brand border-brand-hover'
          : 'bg-white hover:bg-surface-subtle'
      )}
    />
  )
}
