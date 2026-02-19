'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { DateRange } from 'react-day-picker'
import { DatePicker } from './date-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type DateMode = 'specific_dates' | 'date_range'

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`,
}))

export function CreateEventForm() {
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dateMode, setDateMode] = useState<DateMode>('specific_dates')
  const [specificDates, setSpecificDates] = useState<Date[]>([])
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [dayStart, setDayStart] = useState(9)
  const [dayEnd, setDayEnd] = useState(21)
  const [website, setWebsite] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const timezone = typeof window !== 'undefined'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : 'UTC'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const body: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim() || undefined,
      dateMode,
      dayStart,
      dayEnd,
      timezone,
      website,
    }

    if (dateMode === 'specific_dates') {
      body.specificDates = JSON.stringify(
        specificDates.map((d) => d.toISOString().split('T')[0])
      )
    } else {
      if (dateRange?.from) body.rangeStart = dateRange.from.toISOString().split('T')[0]
      if (dateRange?.to) body.rangeEnd = dateRange.to.toISOString().split('T')[0]
    }

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 429) {
          setError('Too many events created. Please wait a minute and try again.')
        } else {
          setError(data.error ?? 'Something went wrong. Please try again.')
        }
        return
      }

      router.push(`/e/${data.id}/confirm`)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isValid =
    title.trim().length > 0 &&
    dayEnd > dayStart &&
    (dateMode === 'specific_dates' ? specificDates.length > 0 : !!(dateRange?.from && dateRange?.to))

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Honeypot — visually hidden from humans, filled by naive bots.
          sr-only keeps element in DOM (bots see it) but off-screen.
          tabIndex={-1} prevents keyboard navigation to this field.
          autoComplete="one-time-code" is semantically wrong for text, preventing browser autofill.
          aria-hidden="true" so screen readers skip it. */}
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="sr-only"
        tabIndex={-1}
        autoComplete="one-time-code"
        aria-hidden="true"
      />
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm font-medium text-[#1C1A17]">
          Event title <span className="text-[#E8823A]">*</span>
        </Label>
        <Input
          id="title"
          type="text"
          placeholder="Team lunch, project kickoff..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          required
          className="border-[#E5DDD4] focus:border-[#E8823A] focus:ring-[#E8823A]"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium text-[#1C1A17]">
          Description <span className="text-[#A89E94] font-normal">(optional)</span>
        </Label>
        <Textarea
          id="description"
          placeholder="Any details participants should know..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={3}
          className="border-[#E5DDD4] focus:border-[#E8823A] focus:ring-[#E8823A] resize-none"
        />
      </div>

      {/* Date mode toggle */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-[#1C1A17]">Date selection</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDateMode('specific_dates')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium border transition-colors ${
              dateMode === 'specific_dates'
                ? 'bg-[#E8823A] text-white border-[#E8823A]'
                : 'bg-white text-[#6B6158] border-[#E5DDD4] hover:border-[#E8823A]'
            }`}
          >
            Specific dates
          </button>
          <button
            type="button"
            onClick={() => setDateMode('date_range')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium border transition-colors ${
              dateMode === 'date_range'
                ? 'bg-[#E8823A] text-white border-[#E8823A]'
                : 'bg-white text-[#6B6158] border-[#E5DDD4] hover:border-[#E8823A]'
            }`}
          >
            Date range
          </button>
        </div>

        {/* Calendar */}
        <div className="overflow-x-auto">
          {dateMode === 'specific_dates' ? (
            <DatePicker
              mode="multiple"
              selected={specificDates}
              onSelect={(dates) => setSpecificDates(dates ?? [])}
            />
          ) : (
            <DatePicker
              mode="range"
              selected={dateRange}
              onSelect={setDateRange}
            />
          )}
        </div>

        {/* Selected dates feedback */}
        {dateMode === 'specific_dates' && specificDates.length > 0 && (
          <p className="text-sm text-[#6B6158]">
            {specificDates.length} date{specificDates.length !== 1 ? 's' : ''} selected
          </p>
        )}
        {dateMode === 'date_range' && dateRange?.from && dateRange?.to && (
          <p className="text-sm text-[#6B6158]">
            {dateRange.from.toLocaleDateString()} &ndash; {dateRange.to.toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Time window */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-[#1C1A17]">Available time window</Label>
        <div className="flex items-center gap-3">
          <select
            value={dayStart}
            onChange={(e) => setDayStart(Number(e.target.value))}
            className="flex-1 h-10 px-3 rounded-md border border-[#E5DDD4] bg-white text-sm text-[#1C1A17] focus:outline-none focus:border-[#E8823A]"
          >
            {HOURS.slice(0, 23).map((h) => (
              <option key={h.value} value={h.value}>{h.label}</option>
            ))}
          </select>
          <span className="text-[#6B6158] text-sm">to</span>
          <select
            value={dayEnd}
            onChange={(e) => setDayEnd(Number(e.target.value))}
            className="flex-1 h-10 px-3 rounded-md border border-[#E5DDD4] bg-white text-sm text-[#1C1A17] focus:outline-none focus:border-[#E8823A]"
          >
            {HOURS.slice(1).map((h) => (
              <option key={h.value} value={h.value} disabled={h.value <= dayStart}>
                {h.label}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-[#A89E94]">Timezone: {timezone}</p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        disabled={!isValid || isSubmitting}
        className="w-full bg-[#E8823A] hover:bg-[#D4722E] text-white font-medium py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Creating event...' : 'Create event'}
      </Button>

      <p className="text-xs text-[#A89E94] text-center leading-relaxed">
        Events and all responses expire automatically after 30 days. No accounts required.{' '}
        <Link
          href="/privacy"
          className="underline underline-offset-2 hover:text-[#6B6158] focus-visible:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[#E8823A]"
        >
          Privacy
        </Link>
      </p>
    </form>
  )
}
