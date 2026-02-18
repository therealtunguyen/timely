import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { participants, sessions, events } from '@/lib/schema'
import { eq, and, sql } from 'drizzle-orm'
import { generateId } from '@/lib/id'
import { hashPin } from '@/lib/argon2'
import { SESSION_COOKIE } from '@/lib/auth'
import { nanoid } from 'nanoid'

const joinSchema = z.object({
  eventId: z.string().min(1),
  name: z.string().min(1).max(50).trim(),
  pin: z.string().length(4).regex(/^\d{4}$/, 'PIN must be 4 digits'),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = joinSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { eventId, name, pin } = parsed.data

  // Verify event exists
  const event = await db.query.events.findFirst({ where: eq(events.id, eventId) })
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // Re-check uniqueness at insert time to guard against race conditions.
  // MUST use lower() for case-insensitive enforcement per IDEN-03.
  const existing = await db.query.participants.findFirst({
    where: and(
      eq(participants.eventId, eventId),
      sql`lower(${participants.name}) = ${name.toLowerCase()}`
    ),
  })

  if (existing) {
    const suggestion = `${name}2`
    return NextResponse.json(
      {
        error: 'name_taken',
        message: `${name} is taken — try ${suggestion} or a nickname`,
        suggestion,
      },
      { status: 409 }
    )
  }

  // Hash the PIN with Argon2id (memoryCost: 65536 per OWASP 2025)
  const pinHash = await hashPin(pin)

  // Insert participant row — store original display name casing
  const participantId = generateId()
  await db.insert(participants).values({
    id: participantId,
    eventId,
    name,  // Original casing; case-insensitive uniqueness is enforced by the query above
    pinHash,
  })

  // Create session: URL-safe opaque token, 7-day expiry
  const sessionToken = nanoid(64)
  const sessionId = generateId()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await db.insert(sessions).values({
    id: sessionId,
    token: sessionToken,
    participantId,
    eventId,
    expiresAt,
  })

  // Issue httpOnly session cookie (SameSite=Lax for CSRF protection while allowing link navigation)
  const response = NextResponse.json({ success: true, participantId, name }, { status: 201 })
  response.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    path: '/',
  })

  return response
}
