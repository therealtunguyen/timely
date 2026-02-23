'use client'

import { format, addMinutes } from 'date-fns'
import { cn } from '@/lib/utils'

interface BestTimeCalloutProps {
  bestSlot: { slotStart: Date; count: number } | null  // null = no responses yet
  totalParticipants: number
  isCreator: boolean
  onConfirmClick?: () => void  // Only fires if isCreator=true AND bestSlot exists
}

export function BestTimeCallout({
  bestSlot,
  totalParticipants,
  isCreator,
  onConfirmClick,
}: BestTimeCalloutProps) {
  // Empty state: no responses yet or count is 0
  if (!bestSlot || bestSlot.count === 0) {
    return (
      <div className="rounded-2xl border border-border-default bg-page-bg px-5 py-4">
        <p className="text-sm font-medium text-text-secondary mb-0.5">Best time</p>
        <p className="text-text-disabled text-base">Waiting for responses</p>
      </div>
    )
  }

  // Populated state
  const dateStr = format(bestSlot.slotStart, 'EEEE, MMMM d')
  const startTimeStr = format(bestSlot.slotStart, 'h:mm a')
  const endTimeStr = format(addMinutes(bestSlot.slotStart, 30), 'h:mm a')
  const timeRangeStr = `${startTimeStr} – ${endTimeStr}`

  const isInteractive = isCreator && !!onConfirmClick

  return (
    <div
      className={cn(
        'rounded-2xl border bg-page-bg px-5 py-4 space-y-1',
        isInteractive
          ? 'border-brand cursor-pointer active:bg-surface-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2'
          : 'border-border-default'
      )}
      onClick={isInteractive ? onConfirmClick : undefined}
      onKeyDown={isInteractive ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onConfirmClick?.()
        }
      } : undefined}
      role={isInteractive ? 'button' : undefined}
      aria-label={isInteractive ? 'Tap to confirm this time' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
    >
      <p className="text-sm font-medium text-text-secondary">Best time</p>
      <p className="text-xl font-semibold text-text-primary">{dateStr}</p>
      <p className="text-base text-text-secondary">{timeRangeStr}</p>
      <p className="text-sm text-brand font-medium">{bestSlot.count} of {totalParticipants} people free</p>
      {isCreator && <p className="text-xs text-text-disabled mt-1">Tap to confirm &rarr;</p>}
    </div>
  )
}
