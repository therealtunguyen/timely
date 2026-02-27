'use client'

import { CalendarPlus, Edit3 } from 'lucide-react'
import { AvailabilityDrawer } from './availability-drawer'

interface AvailabilityCTAProps {
  eventId: string
  participantName: string
  hasSubmitted: boolean
  dates: string[]
  dayStart: number
  dayEnd: number
  dateMode: 'specific_dates' | 'date_range'
}

export function AvailabilityCTA({
  eventId,
  participantName,
  hasSubmitted,
  dates,
  dayStart,
  dayEnd,
  dateMode,
}: AvailabilityCTAProps) {
  const Icon = hasSubmitted ? Edit3 : CalendarPlus
  const label = hasSubmitted ? 'Edit Availability' : 'Mark Availability'

  return (
    <AvailabilityDrawer
      eventId={eventId}
      dates={dates}
      dayStart={dayStart}
      dayEnd={dayEnd}
      dateMode={dateMode}
      trigger={
        <button className="inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-white font-medium py-2 px-4 rounded-lg transition-colors shadow-[var(--shadow-soft)]">
          <Icon className="w-4 h-4" />
          {label}
        </button>
      }
    />
  )
}
