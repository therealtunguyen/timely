import { z } from 'zod'

export const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  dateMode: z.enum(['specific_dates', 'date_range']),
  specificDates: z.string().optional(),   // JSON array of ISO date strings e.g. '["2026-03-15","2026-03-16"]'
  rangeStart: z.string().optional(),      // ISO date string e.g. "2026-03-15"
  rangeEnd: z.string().optional(),        // ISO date string e.g. "2026-03-22"
  dayStart: z.coerce.number().int().min(0).max(23).default(9),   // Hour of day 0-23
  dayEnd: z.coerce.number().int().min(0).max(23).default(21),    // Hour of day 0-23
  timezone: z.string().min(1, 'Timezone is required'),
}).refine((data) => {
  if (data.dateMode === 'specific_dates') {
    try {
      const dates = JSON.parse(data.specificDates ?? '[]')
      return Array.isArray(dates) && dates.length > 0
    } catch {
      return false
    }
  }
  if (data.dateMode === 'date_range') {
    return !!data.rangeStart && !!data.rangeEnd
  }
  return false
}, {
  message: 'Date selection is required. Choose specific dates or a date range.',
  path: ['specificDates'],
}).refine((data) => data.dayEnd > data.dayStart, {
  message: 'End time must be after start time',
  path: ['dayEnd'],
})

export type CreateEventInput = z.infer<typeof createEventSchema>
