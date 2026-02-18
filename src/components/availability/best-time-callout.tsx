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
      <div className="rounded-2xl border border-[#E5DDD4] bg-[#FAF8F5] px-5 py-4">
        <p className="text-sm font-medium text-[#6B6158] mb-0.5">Best time</p>
        <p className="text-[#9D9086] text-base">Waiting for responses</p>
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
        'rounded-2xl border bg-[#FAF8F5] px-5 py-4 space-y-1',
        isInteractive
          ? 'border-[#E8823A] cursor-pointer active:bg-[#F3EFE9] transition-colors'
          : 'border-[#E5DDD4]'
      )}
      onClick={isInteractive ? onConfirmClick : undefined}
      role={isInteractive ? 'button' : undefined}
      aria-label={isInteractive ? 'Tap to confirm this time' : undefined}
    >
      <p className="text-sm font-medium text-[#6B6158]">Best time</p>
      <p className="text-xl font-semibold text-[#1C1A17]">{dateStr}</p>
      <p className="text-base text-[#4A4035]">{timeRangeStr}</p>
      <p className="text-sm text-[#E8823A] font-medium">{bestSlot.count} of {totalParticipants} people free</p>
      {isCreator && <p className="text-xs text-[#9D9086] mt-1">Tap to confirm &rarr;</p>}
    </div>
  )
}
