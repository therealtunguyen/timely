import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { events, eventDates, participants } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { format, parseISO } from 'date-fns'
import { getSession } from '@/lib/auth'
import { ParticipantActions } from '@/components/identity/participant-actions'

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

  // Phase 2: Read session and fetch participant names for JoinFlow
  const session = await getSession(id)
  const existingParticipants = await db
    .select({ name: participants.name })
    .from(participants)
    .where(eq(participants.eventId, id))

  const existingNames = existingParticipants.map((p) => p.name)

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
                  ? `${format(event.rangeStart, 'MMMM d')} – ${format(event.rangeEnd, 'MMMM d, yyyy')}`
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

        {/* CTA — personalized when session active, two-button choice when not */}
        {session ? (
          <a
            href={`/e/${id}/availability`}
            className="block w-full text-center bg-[#E8823A] hover:bg-[#D4722E] text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Welcome back, {session.participantName} — Edit your availability
          </a>
        ) : (
          <ParticipantActions
            eventId={id}
            existingNames={existingNames}
            responseCount={existingNames.length}
          />
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
