'use client'

import React from 'react'
import { parseISO, format as formatDate } from 'date-fns'
import { fromZonedTime, toZonedTime, format } from 'date-fns-tz'
import { useHeatmapStore, ParticipantSlots } from '@/lib/stores/heatmap-store'
import { slotColor } from '@/lib/heatmap-color'
import { GridCell } from './grid-cell'

interface HeatmapGridProps {
  dates: string[]                            // ISO date strings "YYYY-MM-DD" — same as AvailabilityGrid
  dayStart: number                           // Hour 0-23
  dayEnd: number                             // Hour 0-23
  timezone: string                           // IANA tz for label rendering (event's timezone)
  heatmapMap: Record<string, number>         // slotKey (UTC ISO) -> participant count
  peakCount: number                          // Highest count across all slots
  totalParticipants: number                  // Total participant count (for aria-labels)
  participantSlots: Record<string, string[]> // participantName -> UTC ISO slot keys (for intersection)
  ownSlots: string[]                         // UTC ISO slot keys the current viewer has marked (empty array if unauthenticated)
}

// Generate a UTC ISO string from a local date + time + timezone.
// Mirrors AvailabilityGrid's generateSlotKey — identical logic.
function generateSlotKey(date: string, hour: number, minute: number, tz: string): string {
  const localStr = `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
  return fromZonedTime(localStr, tz || 'UTC').toISOString()
}

interface SlotRow {
  slotKey: string // UTC ISO key for first-date column (row key)
  label: string   // Formatted local time label e.g. "9:00 AM"
  hour: number
  minute: number
}

function buildSlotRows(dayStart: number, dayEnd: number, dates: string[], tz: string): SlotRow[] {
  const rows: SlotRow[] = []
  for (let hour = dayStart; hour < dayEnd; hour++) {
    for (const minute of [0, 30]) {
      const firstDate = dates[0] ?? '2000-01-01'
      const slotKey = generateSlotKey(firstDate, hour, minute, tz)
      const label = format(toZonedTime(new Date(slotKey), tz || 'UTC'), 'h:mm a', { timeZone: tz || 'UTC' })
      rows.push({ slotKey, label, hour, minute })
    }
  }
  return rows
}

export function HeatmapGrid({
  dates,
  dayStart,
  dayEnd,
  timezone,
  heatmapMap,
  peakCount,
  totalParticipants,
  participantSlots,
  ownSlots,
}: HeatmapGridProps) {
  const tz = timezone || 'UTC'

  // Convert participantSlots prop (Record<string, string[]>) to ParticipantSlots (Record<string, Set<string>>)
  // Done once at render, not per-cell — O(total slots) not O(cells * participants)
  const participantSlotsMap: ParticipantSlots = Object.fromEntries(
    Object.entries(participantSlots).map(([name, slots]) => [name, new Set(slots)])
  )

  // Tap-a-name intersection state from store
  const { selectedNames, intersectionSlots } = useHeatmapStore()
  const hasSelection = selectedNames.size > 0
  const intersected = hasSelection ? intersectionSlots(participantSlotsMap) : new Set<string>()

  // Own slots as a Set for O(1) per-cell lookup
  const ownSlotsSet = new Set(ownSlots)

  const slotRows = buildSlotRows(dayStart, dayEnd, dates, tz)

  return (
    <div className="overflow-x-auto">
      <div
        // Read-only — no pointer event handlers (no drag-to-paint)
        data-vaul-no-drag
        className="select-none"
        role="grid"
        aria-label="Availability heatmap"
        aria-rowcount={slotRows.length + 1}
        aria-colcount={dates.length + 1}
        style={{
          display: 'grid',
          gridTemplateColumns: `80px repeat(${dates.length}, minmax(64px, 1fr))`,
          minWidth: `${80 + dates.length * 64}px`,
        }}
      >
        {/* Header row: corner cell + date column headers */}
        <div role="row" style={{ display: 'contents' }}>
          <div role="columnheader" className="sticky left-0 z-20 bg-[#FAF8F5]" aria-label="Time" />
          {dates.map(date => (
            <div
              key={date}
              role="columnheader"
              aria-label={formatDate(parseISO(date), 'EEEE, MMMM d')}
              className="text-center text-xs font-medium text-[#6B6158] py-2 border-b border-[#E5DDD4] whitespace-pre-line"
            >
              {format(parseISO(date), 'EEE\nMMM d')}
            </div>
          ))}
        </div>

        {/* Rows: one per 30-min slot */}
        {slotRows.map(({ slotKey, label, hour, minute }, rowIdx) => {
          // Build a human-readable time range label for aria (e.g. "10:00–10:30 AM")
          // Derive the 30-min end label by incrementing minute
          const endHour = minute === 30 ? hour + 1 : hour
          const endMinute = minute === 30 ? 0 : 30
          const endDate = dates[0] ?? '2000-01-01'
          const endSlotKey = generateSlotKey(endDate, endHour, endMinute, tz)
          const endLabel = format(toZonedTime(new Date(endSlotKey), tz), 'h:mm a', { timeZone: tz })
          const timeLabel = `${label}–${endLabel}`

          return (
            <div role="row" key={slotKey} aria-rowindex={rowIdx + 2} style={{ display: 'contents' }}>
              {/* Sticky time label */}
              <div role="rowheader" className="sticky left-0 z-10 bg-[#FAF8F5] text-xs text-[#6B6158] min-h-[44px] flex items-start pt-1 px-2 border-b border-[#E5DDD4]">
                {label}
              </div>

              {/* Cells across all date columns */}
              {dates.map((date, colIdx) => {
                const cellKey = generateSlotKey(date, hour, minute, tz)

                // CRITICAL: coerce to number — Postgres/Neon driver may return count() as string
                const count = Number(heatmapMap[cellKey] ?? 0)
                const color = slotColor(count, peakCount)
                const dimmed = hasSelection && !intersected.has(cellKey)
                const isOwn = ownSlotsSet.has(cellKey)

                // Build date label for aria (e.g. "Tuesday March 15")
                const dateLabel = formatDate(parseISO(date), 'EEEE MMMM d')

                return (
                  <GridCell
                    key={`${date}-${hour}-${minute}`}
                    slotKey={cellKey}
                    heatmapColor={color}
                    isOwn={isOwn}
                    dimmed={dimmed}
                    count={count}
                    totalParticipants={totalParticipants}
                    timeLabel={timeLabel}
                    dateLabel={dateLabel}
                    tabIndex={colIdx === 0 ? 0 : -1}
                  />
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
