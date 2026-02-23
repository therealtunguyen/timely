'use client'

import React, { useRef } from 'react'
import { parseISO } from 'date-fns'
import { fromZonedTime, toZonedTime, format } from 'date-fns-tz'
import { useGridStore } from '@/lib/stores/grid-store'
import { GridCell } from './grid-cell'

interface AvailabilityGridProps {
  dates: string[]   // ISO date strings "YYYY-MM-DD" — columns of the grid
  dayStart: number  // Hour 0-23 (e.g. 9 = 9am)
  dayEnd: number    // Hour 0-23 (e.g. 21 = 9pm)
}

// Generate a UTC ISO string from a local date + time + timezone.
// fromZonedTime is the v3 name — NOT zonedTimeToUtc (removed in v3.0.0)
function generateSlotKey(date: string, hour: number, minute: number, tz: string): string {
  const localStr = `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
  return fromZonedTime(localStr, tz || 'UTC').toISOString()
}

interface SlotRow {
  slotKey: string   // UTC ISO key for the first date column (used as row key)
  label: string     // Formatted local time label e.g. "9:00 AM"
  hour: number
  minute: number
}

function buildSlotRows(dayStart: number, dayEnd: number, dates: string[], tz: string): SlotRow[] {
  const rows: SlotRow[] = []
  for (let hour = dayStart; hour < dayEnd; hour++) {
    for (const minute of [0, 30]) {
      // Use first date for the row key and label — all dates share the same hour/minute
      const firstDate = dates[0] ?? '2000-01-01'
      const slotKey = generateSlotKey(firstDate, hour, minute, tz)
      // Convert back to local time for the label
      // toZonedTime is the v3 name — NOT utcToZonedTime (removed in v3.0.0)
      const label = format(toZonedTime(new Date(slotKey), tz || 'UTC'), 'h:mm a', { timeZone: tz || 'UTC' })
      rows.push({ slotKey, label, hour, minute })
    }
  }
  return rows
}

export function AvailabilityGrid({ dates, dayStart, dayEnd }: AvailabilityGridProps) {
  const { selectedSlots, paintSlot, timezone } = useGridStore()
  const isDragging = useRef(false)
  const dragMode = useRef<'add' | 'remove'>('add')

  // Use UTC as fallback if timezone not yet detected — re-renders automatically when timezone loads
  const tz = timezone || 'UTC'

  const slotRows = buildSlotRows(dayStart, dayEnd, dates, tz)

  function getCellFromPoint(x: number, y: number): string | null {
    const el = document.elementFromPoint(x, y)
    return el?.closest('[data-slot-key]')?.getAttribute('data-slot-key') ?? null
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const slotKey = getCellFromPoint(e.clientX, e.clientY)
    if (!slotKey) return

    // Capture pointer only when painting — lets time-label touches scroll normally
    e.currentTarget.setPointerCapture(e.pointerId)
    isDragging.current = true

    // First cell touched determines add vs remove for the entire gesture
    dragMode.current = selectedSlots.has(slotKey) ? 'remove' : 'add'
    paintSlot(slotKey, dragMode.current)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging.current) return
    const slotKey = getCellFromPoint(e.clientX, e.clientY)
    if (slotKey) paintSlot(slotKey, dragMode.current)
  }

  function handlePointerUp() {
    isDragging.current = false
  }

  return (
    <div className="overflow-x-auto">
      <div
        className="select-none"
        data-vaul-no-drag
        role="grid"
        aria-label="Availability grid — drag or tap to mark your available times"
        style={{
          display: 'grid',
          gridTemplateColumns: `80px repeat(${dates.length}, minmax(64px, 1fr))`,
          minWidth: `${80 + dates.length * 64}px`,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Top-left corner cell (empty, sticky) */}
        <div className="sticky left-0 z-20 bg-page-bg" />

        {/* Date column headers */}
        {dates.map(date => (
          <div
            key={date}
            className="text-center text-xs font-medium text-text-secondary py-2 border-b border-border-default whitespace-pre-line"
          >
            {format(parseISO(date), 'EEE\nMMM d')}
          </div>
        ))}

        {/* Rows: one per 30-min slot */}
        {slotRows.map(({ slotKey, label, hour, minute }) => (
          <React.Fragment key={slotKey}>
            {/* Sticky time label */}
            <div className="sticky left-0 z-10 bg-page-bg text-xs text-text-secondary min-h-[44px] flex items-start pt-1 px-2 border-b border-border-default">
              {label}
            </div>
            {/* Cells across all date columns */}
            {dates.map(date => {
              const cellKey = generateSlotKey(date, hour, minute, tz)
              return (
                <GridCell
                  key={`${date}-${slotKey}`}
                  slotKey={cellKey}
                  isSelected={selectedSlots.has(cellKey)}
                />
              )
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
