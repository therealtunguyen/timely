'use client'

import { useState } from 'react'
import { useGridStore } from '@/lib/stores/grid-store'

export function TimezoneSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const { timezone, setTimezone } = useGridStore()

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-xs text-text-secondary underline cursor-pointer bg-transparent border-none p-0"
      >
        Wrong timezone? (detected: {timezone || 'unknown'})
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-text-disabled">Changing timezone clears your selections</p>
      <select
        value={timezone}
        onChange={(e) => {
          setTimezone(e.target.value)
          setIsOpen(false)
        }}
        className="text-xs text-text-secondary border border-border-default rounded px-2 py-1 bg-surface"
      >
        {(Intl.supportedValuesOf('timeZone') as string[]).map((tz) => (
          <option key={tz} value={tz}>
            {tz}
          </option>
        ))}
      </select>
    </div>
  )
}
