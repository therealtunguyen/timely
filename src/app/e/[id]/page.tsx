import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { events, eventDates, participants, availability } from '@/lib/schema'
import { count, desc, eq } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { eachDayOfInterval, format, addMinutes, parseISO } from 'date-fns'
import { getSession } from '@/lib/auth'
import { ParticipantActions } from '@/components/identity/participant-actions'
import { AvailabilityCTA } from '@/components/availability/availability-cta'
import { HeatmapGrid } from '@/components/availability/heatmap-grid'
import { ParticipantList } from '@/components/availability/participant-list'
import { HeatmapResultsClient } from '@/components/availability/heatmap-results-client'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params

  const event = await db.query.events.findFirst({
    where: eq(events.id, id),
  })

  if (!event) {
    return { title: 'Event not found' }
  }

  const description = event.description ?? `Join ${event.title} — mark your availability`

  return {
    title: event.title,
    description,
    openGraph: {
      title: event.title,
      description,
      type: 'website',
      // The opengraph-image.tsx file in the same directory automatically provides the og:image URL.
      // No need to set images here — Next.js file convention handles it.
    },
    twitter: {
      card: 'summary_large_image',
      title: event.title,
      description,
    },
  }
}

export default async function EventPage({ params }: Props) {
  const { id } = await params

  // Fetch event
  const event = await db.query.events.findFirst({
    where: eq(events.id, id),
  })
  if (!event) notFound()

  // Check expiry — if the event has passed its expiresAt, show the not-found page.
  // The cron job will eventually delete the record, but until then we must not render stale data.
  if (event.expiresAt < new Date()) notFound()

  // Fetch specific dates (if dateMode = 'specific_dates')
  let candidateDates: string[] = []
  if (event.dateMode === 'specific_dates') {
    const rows = await db
      .select()
      .from(eventDates)
      .where(eq(eventDates.eventId, id))
      .orderBy(eventDates.sortOrder)
    candidateDates = rows.map((r) => r.date)
  }

  // Phase 3: Compute gridDates for the availability drawer
  let gridDates: string[] = []
  if (event.dateMode === 'specific_dates') {
    gridDates = candidateDates  // already loaded above
  } else if (event.rangeStart && event.rangeEnd) {
    gridDates = eachDayOfInterval({ start: event.rangeStart, end: event.rangeEnd })
      .map(d => format(d, 'yyyy-MM-dd'))
      .slice(0, 14)  // 14-day max per decisions
  }

  // Phase 4: Read creator cookie for identity check
  const cookieStore = await cookies()
  const creatorCookieValue = cookieStore.get(`timely_creator_${id}`)?.value

  // Phase 4: Parallel fetch — heatmap data, participant slots, session
  const [
    heatmapRows,
    participantRows,
    session,
  ] = await Promise.all([
    // Aggregated counts per slot (for heatmap colors)
    db.select({
      slotStart: availability.slotStart,
      participantCount: count(),
    })
      .from(availability)
      .where(eq(availability.eventId, id))
      .groupBy(availability.slotStart)
      .orderBy(desc(count())),

    // Per-participant slots (for tap-a-name intersection) + response status
    db.select({
      name: participants.name,
      slotStart: availability.slotStart,
      submittedAt: participants.submittedAt,
    })
      .from(participants)
      .leftJoin(availability, eq(participants.id, availability.participantId))
      .where(eq(participants.eventId, id)),

    getSession(id),
  ])

  // Build heatmap map: slotKey -> count (coerce to number — Neon returns count() as string)
  const heatmapMap: Record<string, number> = {}
  for (const row of heatmapRows) {
    heatmapMap[row.slotStart.toISOString()] = Number(row.participantCount)
  }
  const peakCount = heatmapRows.length > 0 ? Number(heatmapRows[0].participantCount) : 0
  const bestSlot = heatmapRows.length > 0
    ? { slotStart: heatmapRows[0].slotStart.toISOString(), count: Number(heatmapRows[0].participantCount) }
    : null

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

  // Creator identity via cookie comparison (Option C — established in Phase 04-01)
  const isCreator = !!(event.creatorToken && creatorCookieValue && event.creatorToken === creatorCookieValue)

  // Own slots for personal indicator in heatmap (empty when unauthenticated)
  let ownSlots: string[] = []
  if (session) {
    const ownRows = await db.select({ slotStart: availability.slotStart })
      .from(availability)
      .where(eq(availability.participantId, session.participantId))
    ownSlots = ownRows.map(r => r.slotStart.toISOString())
  }

  // Names free at the best slot (for ConfirmTimeSheet display)
  const freeNames = bestSlot
    ? participantList
        .filter(p => participantSlotsMap[p.name]?.includes(bestSlot.slotStart))
        .map(p => p.name)
    : []

  // Derive hasSubmitted from session + participantMap
  const hasSubmitted = session
    ? (participantMap.get(session.participantName)?.submittedAt != null)
    : false

  // Existing participant names for JoinFlow
  const existingNames = participantList.map(p => p.name)

  return (
    <main className="min-h-dvh px-4 py-10">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Event header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-[#1C1A17] leading-tight">
            {event.title}
          </h1>
          {event.description && (
            <p className="text-[#6B6158] text-base leading-relaxed">
              {event.description}
            </p>
          )}
        </div>

        {/* Confirmed time banner (shown above heatmap when event is confirmed) */}
        {event.status === 'confirmed' && event.confirmedSlot && (
          <section className="rounded-2xl bg-[#E8823A] px-5 py-4 space-y-1">
            <p className="text-sm font-medium text-white/80">Meeting confirmed</p>
            <p className="text-xl font-semibold text-white">
              {format(event.confirmedSlot, 'EEEE, MMMM d')}
            </p>
            <p className="text-base text-white/90">
              {format(event.confirmedSlot, 'h:mm a')} &ndash; {format(addMinutes(event.confirmedSlot, 30), 'h:mm a')}
            </p>
          </section>
        )}

        {/* BestTimeCallout + ConfirmTimeSheet (creator-only sheet) — visible to all visitors */}
        <HeatmapResultsClient
          bestSlot={bestSlot}
          totalParticipants={totalParticipants}
          isCreator={isCreator}
          eventId={id}
          freeNames={freeNames}
        />

        {/* Participant list — visible to all visitors */}
        {participantList.length > 0 && (
          <ParticipantList participants={participantList} />
        )}

        {/* HeatmapGrid — visible to all visitors */}
        {gridDates.length > 0 && (
          <HeatmapGrid
            dates={gridDates}
            dayStart={event.dayStart}
            dayEnd={event.dayEnd}
            timezone={event.timezone}
            heatmapMap={heatmapMap}
            peakCount={peakCount}
            totalParticipants={totalParticipants}
            participantSlots={participantSlotsMap}
            ownSlots={ownSlots}
          />
        )}

        {/* Candidate dates / date range */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-[#6B6158] uppercase tracking-wide">
            Candidate dates
          </h2>
          {event.dateMode === 'specific_dates' ? (
            <ul className="space-y-2">
              {candidateDates.map((date) => (
                <li
                  key={date}
                  className="flex items-center gap-3 rounded-xl border border-[#E5DDD4] bg-white px-4 py-3"
                >
                  <span className="text-[#E8823A] text-lg">📅</span>
                  <span className="font-medium text-[#1C1A17]">
                    {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-[#E5DDD4] bg-white px-4 py-3 flex items-center gap-3">
              <span className="text-[#E8823A] text-lg">📅</span>
              <span className="font-medium text-[#1C1A17]">
                {event.rangeStart && event.rangeEnd
                  ? `${format(event.rangeStart, 'MMMM d')} \u2013 ${format(event.rangeEnd, 'MMMM d, yyyy')}`
                  : 'Date range TBD'}
              </span>
            </div>
          )}
        </section>

        {/* Time window */}
        <section className="rounded-xl border border-[#E5DDD4] bg-[#F3EFE9] px-4 py-3 flex items-center gap-3">
          <span className="text-[#E8823A]">🕐</span>
          <p className="text-sm text-[#6B6158]">
            Available window:{' '}
            <span className="font-medium text-[#1C1A17]">
              {formatHour(event.dayStart)} – {formatHour(event.dayEnd)}
            </span>
          </p>
        </section>

        {/* CTA section — hidden when event is confirmed (grid is read-only) */}
        {event.status !== 'confirmed' && (
          session ? (
            <AvailabilityCTA
              eventId={id}
              participantName={session.participantName}
              hasSubmitted={hasSubmitted}
              dates={gridDates}
              dayStart={event.dayStart}
              dayEnd={event.dayEnd}
              dateMode={event.dateMode}
            />
          ) : (
            <ParticipantActions
              eventId={id}
              existingNames={existingNames}
              responseCount={existingNames.length}
            />
          )
        )}
      </div>
    </main>
  )
}

// Helper: format an hour integer (0-23) as a human-readable string
function formatHour(hour: number): string {
  if (hour === 0) return '12:00 AM'
  if (hour < 12) return `${hour}:00 AM`
  if (hour === 12) return '12:00 PM'
  return `${hour - 12}:00 PM`
}
