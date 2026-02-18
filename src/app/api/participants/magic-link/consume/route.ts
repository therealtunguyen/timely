import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { magicTokens, participants, sessions } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { generateId } from '@/lib/id'
import { hashTokenForLookup } from '@/lib/magic-tokens'
import { SESSION_COOKIE } from '@/lib/auth'
import { nanoid } from 'nanoid'

// GET /api/participants/magic-link/consume?token=<rawToken>&eventId=<eventId>
// Called when the user clicks the magic link in their email.
// After consumption, redirects to the event page (session cookie set).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const rawToken = searchParams.get('token')
  const eventId = searchParams.get('eventId')

  if (!rawToken || !eventId) {
    return NextResponse.redirect(
      new URL(`/e/${eventId ?? ''}/magic?error=invalid`, req.url)
    )
  }

  const tokenHash = hashTokenForLookup(rawToken)
  const now = new Date()

  // Look up token by hash
  const magicToken = await db.query.magicTokens.findFirst({
    where: eq(magicTokens.tokenHash, tokenHash),
    with: { participant: true },
  })

  if (!magicToken) {
    return NextResponse.redirect(new URL(`/e/${eventId}/magic?error=invalid`, req.url))
  }

  // Check single-use: usedAt must be null
  if (magicToken.usedAt !== null) {
    return NextResponse.redirect(new URL(`/e/${eventId}/magic?error=used`, req.url))
  }

  // Check expiry
  if (magicToken.expiresAt < now) {
    // Purge email from participant when token expires (SECR-02)
    await db.update(participants)
      .set({ email: null })
      .where(eq(participants.id, magicToken.participantId))

    return NextResponse.redirect(new URL(`/e/${eventId}/magic?error=expired`, req.url))
  }

  // Mark token as used (single-use enforcement)
  await db.update(magicTokens)
    .set({ usedAt: now })
    .where(eq(magicTokens.id, magicToken.id))

  // Purge stored email immediately after successful consumption (SECR-02)
  await db.update(participants)
    .set({ email: null })
    .where(eq(participants.id, magicToken.participantId))

  // Issue new session (7-day cookie)
  const sessionToken = nanoid(64)
  const sessionId = generateId()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await db.insert(sessions).values({
    id: sessionId,
    token: sessionToken,
    participantId: magicToken.participantId,
    eventId: magicToken.eventId,
    expiresAt,
  })

  // Redirect to event page with session active (no PIN reset required per CONTEXT.md)
  const response = NextResponse.redirect(new URL(`/e/${eventId}`, req.url))
  response.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    path: '/',
  })

  return response
}
