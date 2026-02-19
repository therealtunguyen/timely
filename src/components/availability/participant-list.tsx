'use client'

import { useHeatmapStore } from '@/lib/stores/heatmap-store'
import { cn } from '@/lib/utils'

interface Participant {
  name: string
  submittedAt: Date | null
}

interface ParticipantListProps {
  participants: Participant[]
}

export function ParticipantList({ participants }: ParticipantListProps) {
  const { selectedNames, toggleName } = useHeatmapStore()

  // Sort: responded first, then not-yet-responded.
  // Within each group: alphabetical by name.
  const sorted = [...participants].sort((a, b) => {
    const aResponded = a.submittedAt != null ? 0 : 1
    const bResponded = b.submittedAt != null ? 0 : 1
    if (aResponded !== bResponded) return aResponded - bResponded
    return a.name.localeCompare(b.name)
  })

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium text-[#6B6158] uppercase tracking-wide">
        {participants.length} {participants.length === 1 ? 'response' : 'responses'}
      </h2>
      <div className="flex flex-wrap gap-2">
        {sorted.map(p => {
          const isSelected = selectedNames.has(p.name)
          const hasResponded = p.submittedAt != null
          return (
            <button
              key={p.name}
              onClick={() => toggleName(p.name)}
              disabled={!hasResponded}  // Can't filter on someone who hasn't responded
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8823A] focus-visible:ring-offset-2',
                isSelected
                  ? 'bg-[#1C1A17] text-white'
                  : hasResponded
                    ? 'bg-[#F3EFE9] text-[#1C1A17] hover:bg-[#E5DDD4]'
                    : 'bg-[#F3EFE9] text-[#9D9086] cursor-default opacity-60'
              )}
              aria-pressed={isSelected}
              aria-label={`${p.name}${hasResponded ? ' — responded' : ' — no response yet'}${isSelected ? ', selected' : ''}`}
            >
              {p.name}
              {hasResponded && <span className="ml-1.5 text-[#9D9086] text-xs">&#x2713;</span>}
            </button>
          )
        })}
      </div>
    </section>
  )
}
