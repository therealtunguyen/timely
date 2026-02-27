import { db } from '@/lib/db'
import { events, eventDates, participants, availability } from '@/lib/schema'
import { count, desc, eq } from 'drizzle-orm'
import { eachDayOfInterval, format, parseISO } from 'date-fns'
import { getSession } from '@/lib/auth'

export type EventDashboardData = {
  event: NonNullable<Awaited<ReturnType<typeof db.query.events.findFirst>>>
  gridDates: string[]
  candidateDates: string[]
  heatmapMap: Record<string, number>
  peakCount: number
  topSlots: { slotStart: string; count: number }[]
  bestSlot: { slotStart: string; count: number } | null
  participantList: { name: string; submittedAt: Date | null }[]
  participantSlotsMap: Record<string, string[]>
  totalParticipants: number
  dateRangeStr: string
  session: Awaited<ReturnType<typeof getSession>>
  ownSlots: string[]
  freeNames: string[]
  hasSubmitted: boolean
  isCreator: boolean
  existingNames: string[]
}

export async function getEventDashboardData(
  eventId: string,
  creatorCookieValue?: string,
): Promise<EventDashboardData | null> {
  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
  })

  if (!event) return null
  if (event.expiresAt < new Date()) return null

  // Fetch specific dates (if dateMode = 'specific_dates')
  let candidateDates: string[] = []
  if (event.dateMode === 'specific_dates') {
    const rows = await db
      .select()
      .from(eventDates)
      .where(eq(eventDates.eventId, eventId))
      .orderBy(eventDates.sortOrder)
    candidateDates = rows.map((r) => r.date)
  }

  // Compute gridDates
  let gridDates: string[] = []
  if (event.dateMode === 'specific_dates') {
    gridDates = candidateDates
  } else if (event.rangeStart && event.rangeEnd) {
    gridDates = eachDayOfInterval({ start: event.rangeStart, end: event.rangeEnd })
      .map((d) => format(d, 'yyyy-MM-dd'))
      .slice(0, 14)
  }

  // Parallel fetch — heatmap data, participant slots, session
  const [heatmapRows, participantRows, session] = await Promise.all([
    db
      .select({
        slotStart: availability.slotStart,
        participantCount: count(),
      })
      .from(availability)
      .where(eq(availability.eventId, eventId))
      .groupBy(availability.slotStart)
      .orderBy(desc(count())),

    db
      .select({
        name: participants.name,
        slotStart: availability.slotStart,
        submittedAt: participants.submittedAt,
      })
      .from(participants)
      .leftJoin(availability, eq(participants.id, availability.participantId))
      .where(eq(participants.eventId, eventId)),

    getSession(eventId),
  ])

  // Build heatmap map: slotKey -> count
  const heatmapMap: Record<string, number> = {}
  for (const row of heatmapRows) {
    heatmapMap[row.slotStart.toISOString()] = Number(row.participantCount)
  }
  const peakCount = heatmapRows.length > 0 ? Number(heatmapRows[0].participantCount) : 0

  // Get top 3 slots for suggestions
  const topSlots = heatmapRows.slice(0, 3).map((row) => ({
    slotStart: row.slotStart.toISOString(),
    count: Number(row.participantCount),
  }))
  const bestSlot = topSlots.length > 0 ? topSlots[0] : null

  // Build participant list (unique participants, with response status)
  const participantMap = new Map<string, { name: string; submittedAt: Date | null }>()
  const participantSlotsMap: Record<string, string[]> = {}
  for (const row of participantRows) {
    if (!participantMap.has(row.name)) {
      participantMap.set(row.name, { name: row.name, submittedAt: row.submittedAt })
    }
    if (row.slotStart) {
      if (!participantSlotsMap[row.name]) participantSlotsMap[row.name] = []
      participantSlotsMap[row.name].push(row.slotStart.toISOString())
    }
  }
  const participantList = [...participantMap.values()]
  const totalParticipants = participantList.length

  // Creator identity via cookie comparison
  const isCreator = !!(
    event.creatorToken &&
    creatorCookieValue &&
    event.creatorToken === creatorCookieValue
  )

  // Own slots for personal indicator in heatmap
  let ownSlots: string[] = []
  if (session) {
    const ownRows = await db
      .select({ slotStart: availability.slotStart })
      .from(availability)
      .where(eq(availability.participantId, session.participantId))
    ownSlots = ownRows.map((r) => r.slotStart.toISOString())
  }

  // Names free at the best slot
  const freeNames = bestSlot
    ? participantList
        .filter((p) => participantSlotsMap[p.name]?.includes(bestSlot.slotStart))
        .map((p) => p.name)
    : []

  // Derive hasSubmitted from session + participantMap
  const hasSubmitted = session
    ? (participantMap.get(session.participantName)?.submittedAt != null)
    : false

  const existingNames = participantList.map((p) => p.name)

  // Format date range string
  const dateRangeStr =
    event.rangeStart && event.rangeEnd
      ? `${format(event.rangeStart, 'MMM d')} – ${format(event.rangeEnd, 'MMM d, yyyy')}`
      : event.dateMode === 'specific_dates' && candidateDates.length > 0
        ? `${format(parseISO(candidateDates[0]), 'MMM d')} – ${format(parseISO(candidateDates[candidateDates.length - 1]), 'MMM d')}`
        : 'Dates TBD'

  return {
    event,
    gridDates,
    candidateDates,
    heatmapMap,
    peakCount,
    topSlots,
    bestSlot,
    participantList,
    participantSlotsMap,
    totalParticipants,
    dateRangeStr,
    session,
    ownSlots,
    freeNames,
    hasSubmitted,
    isCreator,
    existingNames,
  }
}
