import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { availability, participants } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { generateId } from '@/lib/id'

/**
 * GET /api/availability
 * Returns the authenticated participant's existing availability slots as UTC ISO strings.
 * Returns { slots: [] } with 200 when unauthenticated — grid loads empty state gracefully.
 */
export async function GET(): Promise<NextResponse> {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ slots: [] }, { status: 200 })
  }

  const rows = await db
    .select({ slotStart: availability.slotStart })
    .from(availability)
    .where(eq(availability.participantId, session.participantId))

  const slots = rows.map((r) => r.slotStart.toISOString())

  return NextResponse.json({ slots })
}

/**
 * POST /api/availability
 * Atomically replaces all participant slots using db.batch() and updates submittedAt.
 * Returns 401 if unauthenticated, 403 if eventId mismatch, 400 if invalid body.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { slots: unknown; timezone: unknown; eventId: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { slots, timezone, eventId } = body

  // Validate slots is an array of strings
  if (!Array.isArray(slots) || slots.some((s) => typeof s !== 'string')) {
    return NextResponse.json({ error: 'slots must be an array of strings' }, { status: 400 })
  }

  // Validate timezone is a string
  if (typeof timezone !== 'string' || !timezone) {
    return NextResponse.json({ error: 'timezone must be a non-empty string' }, { status: 400 })
  }

  // Validate eventId matches session — prevent cross-event slot injection
  if (typeof eventId !== 'string' || eventId !== session.eventId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const validSlots = slots as string[]

  // Atomically delete existing slots and insert new ones using db.batch()
  // neon-http driver does NOT support db.transaction() — db.batch() is the correct atomic primitive
  await db.batch([
    db.delete(availability).where(eq(availability.participantId, session.participantId)),
    ...(validSlots.length > 0
      ? [
          db.insert(availability).values(
            validSlots.map((slotStart) => ({
              id: generateId(),
              participantId: session.participantId,
              eventId: session.eventId,
              slotStart: new Date(slotStart),
              isAvailable: true,
            }))
          ),
        ]
      : []),
  ])

  // Update participant submittedAt and timezone in a separate query (not part of batch)
  await db
    .update(participants)
    .set({ submittedAt: new Date(), timezone })
    .where(eq(participants.id, session.participantId))

  return NextResponse.json({ success: true })
}
