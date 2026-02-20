import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { participants, magicTokens, events } from '@/lib/schema'
import { eq, and, sql } from 'drizzle-orm'
import { generateId } from '@/lib/id'
import { generateMagicToken, buildMagicUrl } from '@/lib/magic-tokens'
import { magicLinkRatelimit } from '@/lib/rate-limit'
import { Resend } from 'resend'
import { MagicLinkEmail } from '@/emails/magic-link-email'

const requestSchema = z.object({
  eventId: z.string().min(1),
  name: z.string().min(1).max(50).trim(),
  email: z.string().email(),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { eventId, name, email } = parsed.data
  const rateLimitKey = `${eventId}:${name.toLowerCase()}`

  // Rate limit before any work — 3 magic link requests per 30 min per name
  const { success: rateLimitOk } = await magicLinkRatelimit.limit(rateLimitKey)
  if (!rateLimitOk) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Too many magic link requests. Try again in 30 minutes.' },
      { status: 429, headers: { 'Retry-After': '1800' } }
    )
  }

  // Find the participant (case-insensitive name lookup)
  const participant = await db.query.participants.findFirst({
    where: and(
      eq(participants.eventId, eventId),
      sql`lower(${participants.name}) = ${name.toLowerCase()}`
    ),
  })

  // Always return 200 even if participant not found — prevents name enumeration
  if (!participant) {
    return NextResponse.json({ success: true }, { status: 200 })
  }

  // Fetch event for email copy
  const event = await db.query.events.findFirst({ where: eq(events.id, eventId) })

  // Generate token — store only the SHA-256 hash in DB (raw token goes in email URL only)
  const { rawToken, tokenHash, expiresAt } = generateMagicToken()

  // Store email temporarily on participant (purged when token expires)
  await db.update(participants).set({ email }).where(eq(participants.id, participant.id))

  // Insert magic token row
  await db.insert(magicTokens).values({
    id: generateId(),
    tokenHash,
    participantId: participant.id,
    eventId,
    expiresAt,
  })

  // Send email via Resend
  // Derive base URL from request headers — self-configuring across environments
  const host = req.headers.get('host') ?? 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const baseUrl = `${protocol}://${host}`
  const magicUrl = buildMagicUrl(rawToken, eventId, baseUrl)
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: 'Timely <onboarding@resend.dev>',
    to: email,
    subject: `Your access link for ${event?.title ?? 'your event'}`,
    react: MagicLinkEmail({
      eventTitle: event?.title ?? 'your event',
      magicUrl,
      participantName: participant.name,
    }),
  })

  // rawToken is deliberately NOT returned in the response — only ever in the email
  return NextResponse.json({ success: true }, { status: 200 })
}
