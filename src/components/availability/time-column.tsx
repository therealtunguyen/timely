'use client'

interface TimeSlot {
  label: string
  slotKey: string
}

interface TimeColumnProps {
  slotTimes: TimeSlot[]
}

export function TimeColumn({ slotTimes }: TimeColumnProps) {
  return (
    <>
      {/* Top-left corner cell — empty header cell to align with date column headers */}
      <div className="sticky left-0 z-20 bg-page-bg border-b border-border-default" />

      {/* Time label cells — one per 30-min slot, sticky so they never scroll out of view */}
      {slotTimes.map(({ label, slotKey }) => (
        <div
          key={slotKey}
          className="sticky left-0 z-10 bg-page-bg text-xs text-text-secondary min-h-[44px] flex items-start pt-1 px-2 border-b border-border-default"
        >
          {label}
        </div>
      ))}
    </>
  )
}
