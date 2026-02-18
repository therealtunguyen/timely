import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { participants, sessions } from '@/lib/schema'
import { eq, and, sql } from 'drizzle-orm'
import { generateId } from '@/lib/id'
import { verifyPin } from '@/lib/argon2'
import { pinVerifyRatelimit } from '@/lib/rate-limit'
import { SESSION_COOKIE } from '@/lib/auth'
import { nanoid } from 'nanoid'

const verifyPinSchema = z.object({
  eventId: z.string().min(1),
  name: z.string().min(1).max(50).trim(),
  pin: z.string().length(4).regex(/^\d{4}$/),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = verifyPinSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { eventId, name, pin } = parsed.data
  const rateLimitKey = `${eventId}:${name.toLowerCase()}`

  // Rate limit BEFORE any DB or hash work — fail fast
  const { success: rateLimitOk, remaining } = await pinVerifyRatelimit.limit(rateLimitKey)
  if (!rateLimitOk) {
    return NextResponse.json(
      {
        error: 'rate_limited',
        message: 'Too many attempts. Try again in 15 minutes or use a magic link.',
      },
      {
        status: 429,
        headers: { 'Retry-After': '900' },
      }
    )
  }

  // Look up participant by name case-insensitively to match how names are stored
  const participant = await db.query.participants.findFirst({
    where: and(
      eq(participants.eventId, eventId),
      sql`lower(${participants.name}) = ${name.toLowerCase()}`
    ),
  })

  // Use constant-time response to avoid timing-based name enumeration
  if (!participant) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
  }

  const pinCorrect = await verifyPin(pin, participant.pinHash)
  if (!pinCorrect) {
    return NextResponse.json(
      {
        error: 'invalid_credentials',
        remaining,  // Client uses this to show "Forgot PIN?" after first failure
      },
      { status: 401 }
    )
  }

  // PIN correct — issue new session (7-day cookie)
  const sessionToken = nanoid(64)
  const sessionId = generateId()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await db.insert(sessions).values({
    id: sessionId,
    token: sessionToken,
    participantId: participant.id,
    eventId,
    expiresAt,
  })

  const response = NextResponse.json(
    { success: true, participantId: participant.id, name: participant.name },
    { status: 200 }
  )
  response.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    path: '/',
  })

  return response
}
