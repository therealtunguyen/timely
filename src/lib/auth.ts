import 'server-only'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { sessions } from '@/lib/schema'
import { eq, and, gt } from 'drizzle-orm'

export const SESSION_COOKIE = 'timely_session'

export interface SessionData {
  participantId: string
  participantName: string
  eventId: string
  sessionId: string
}

/**
 * Read the session cookie and look up the session in the DB.
 * Returns null if no cookie, token not found, session expired, or eventId mismatch.
 * Pass eventId to scope the session check to a specific event.
 */
export async function getSession(eventId?: string): Promise<SessionData | null> {
  const cookieStore = await cookies() // CRITICAL: async in Next.js 15+
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  const now = new Date()
  const conditions = [
    eq(sessions.token, token),
    gt(sessions.expiresAt, now),
  ]
  if (eventId) {
    conditions.push(eq(sessions.eventId, eventId))
  }

  const session = await db.query.sessions.findFirst({
    where: and(...conditions),
    with: { participant: true },
  })

  if (!session) return null

  return {
    participantId: session.participantId,
    participantName: session.participant.name,
    eventId: session.eventId,
    sessionId: session.id,
  }
}
