'use client'

import { useState } from 'react'
import { JoinFlow } from './join-flow'

type FlowMode = 'none' | 'new' | 'returning'

interface ParticipantActionsProps {
  eventId: string
  existingNames: string[]
  responseCount: number
}

export function ParticipantActions({ eventId, existingNames, responseCount }: ParticipantActionsProps) {
  const [flowMode, setFlowMode] = useState<FlowMode>('none')

  return (
    <>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setFlowMode('new')}
          className="block w-full text-center bg-[#E8823A] hover:bg-[#D4722E] text-white font-medium py-3 px-6 rounded-lg transition-colors"
        >
          Mark my availability
        </button>
        <p className="text-center">
          <button
            type="button"
            onClick={() => setFlowMode('returning')}
            className="text-sm text-[#6B6158] underline underline-offset-2"
          >
            Already joined? Edit my availability
          </button>
        </p>
        <p className="text-center text-sm text-[#A89E94]">
          {responseCount > 0
            ? `${responseCount} ${responseCount === 1 ? 'person has' : 'people have'} responded`
            : 'Be the first to respond'}
        </p>
      </div>

      <JoinFlow
        eventId={eventId}
        flowMode={flowMode}
        existingNames={existingNames}
        onClose={() => setFlowMode('none')}
      />
    </>
  )
}
