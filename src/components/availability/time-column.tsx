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
      <div className="sticky left-0 z-20 bg-[#FAF8F5] border-b border-[#E5DDD4]" />

      {/* Time label cells — one per 30-min slot, sticky so they never scroll out of view */}
      {slotTimes.map(({ label, slotKey }) => (
        <div
          key={slotKey}
          className="sticky left-0 z-10 bg-[#FAF8F5] text-xs text-[#6B6158] min-h-[44px] flex items-start pt-1 px-2 border-b border-[#E5DDD4]"
        >
          {label}
        </div>
      ))}
    </>
  )
}
