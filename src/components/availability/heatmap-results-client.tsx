'use client'

import { useState } from 'react'
import { BestTimeCallout } from './best-time-callout'
import { ConfirmTimeSheet } from './confirm-time-sheet'

interface HeatmapResultsClientProps {
  bestSlot: { slotStart: string; count: number } | null  // string (serialized from server)
  totalParticipants: number
  isCreator: boolean
  eventId: string
  freeNames: string[]
}

export function HeatmapResultsClient({
  bestSlot,
  totalParticipants,
  isCreator,
  eventId,
  freeNames,
}: HeatmapResultsClientProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      <BestTimeCallout
        bestSlot={bestSlot ? { slotStart: new Date(bestSlot.slotStart), count: bestSlot.count } : null}
        totalParticipants={totalParticipants}
        isCreator={isCreator}
        onConfirmClick={() => setConfirmOpen(true)}
      />
      {isCreator && (
        <ConfirmTimeSheet
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          eventId={eventId}
          slotStart={bestSlot?.slotStart ?? null}
          slotCount={bestSlot?.count ?? 0}
          totalParticipants={totalParticipants}
          freeNames={freeNames}
        />
      )}
    </>
  )
}
