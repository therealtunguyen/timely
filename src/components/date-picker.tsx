'use client'

import { DayPicker, type DateRange } from 'react-day-picker'
import 'react-day-picker/style.css'

interface SpecificDatesPickerProps {
  mode: 'multiple'
  selected: Date[]
  onSelect: (dates: Date[] | undefined) => void
}

interface RangePickerProps {
  mode: 'range'
  selected: DateRange | undefined
  onSelect: (range: DateRange | undefined) => void
}

type DatePickerProps = SpecificDatesPickerProps | RangePickerProps

export function DatePicker(props: DatePickerProps) {
  const today = new Date()

  if (props.mode === 'multiple') {
    return (
      <DayPicker
        mode="multiple"
        selected={props.selected}
        onSelect={props.onSelect}
        disabled={{ before: today }}
        className="rounded-lg border border-[#E5DDD4] p-3 bg-white"
        numberOfMonths={1}
      />
    )
  }

  return (
    <DayPicker
      mode="range"
      selected={props.selected}
      onSelect={props.onSelect}
      disabled={{ before: today }}
      className="rounded-lg border border-[#E5DDD4] p-3 bg-white"
      numberOfMonths={1}
      max={14}
    />
  )
}
