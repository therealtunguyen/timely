'use client'

import { AvailabilityDrawer } from './availability-drawer'

interface AvailabilityCTAProps {
  eventId: string
  participantName: string
  hasSubmitted: boolean   // true if participant.submittedAt is non-null
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
  const label = hasSubmitted
    ? `Welcome back, ${participantName} — Edit your availability`
    : `Mark your availability`

  return (
    <AvailabilityDrawer
      eventId={eventId}
      dates={dates}
      dayStart={dayStart}
      dayEnd={dayEnd}
      dateMode={dateMode}
      trigger={
        <button className="block w-full text-center bg-brand hover:bg-brand-hover text-white font-medium py-3 px-6 rounded-lg transition-colors">
          {label}
        </button>
      }
    />
  )
}
