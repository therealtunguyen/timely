'use client'

import { ChevronRight, Star } from 'lucide-react'
import { format } from 'date-fns'
import { Panel, PanelTitle } from '@/components/layout/panel'

interface SuggestedSlot {
  slotStart: string // ISO string
  count: number
}

interface SuggestedTimesProps {
  slots: SuggestedSlot[]
  totalParticipants: number
  onSelectSlot?: (slotStart: string) => void
  className?: string
}

/**
 * Displays top 3 suggested times with highest availability.
 * Shows date/time formatted as "Oct 14, 10:00 AM" with availability count.
 */
export function SuggestedTimes({
  slots,
  totalParticipants,
  onSelectSlot,
  className,
}: SuggestedTimesProps) {
  // Take top 3 slots
  const topSlots = slots.slice(0, 3)

  if (topSlots.length === 0) {
    return null
  }

  return (
    <Panel className={className}>
      <PanelTitle icon={<Star className="w-4 h-4" />}>
        Top Suggested Times
      </PanelTitle>
      <div className="mt-3 flex flex-col gap-2">
        {topSlots.map((slot) => {
          const date = new Date(slot.slotStart)
          const formattedDate = format(date, 'MMM d, h:mm a')
          const allAvailable = slot.count === totalParticipants && totalParticipants > 0

          return (
            <button
              key={slot.slotStart}
              onClick={() => onSelectSlot?.(slot.slotStart)}
              disabled={!onSelectSlot}
              className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-surface-subtle/60 to-transparent hover:from-surface-subtle transition-colors text-left group disabled:cursor-default"
            >
              <div>
                <p className="font-semibold text-sm text-text-primary">
                  {formattedDate}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  <span className={allAvailable ? 'text-cta font-medium' : ''}>
                    {slot.count}/{totalParticipants} Available
                  </span>
                </p>
              </div>
              {onSelectSlot && (
                <ChevronRight className="w-4 h-4 text-text-disabled group-hover:text-text-secondary transition-colors" />
              )}
            </button>
          )
        })}
      </div>
    </Panel>
  )
}
