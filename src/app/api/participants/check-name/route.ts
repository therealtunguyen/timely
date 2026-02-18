import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { participants, events } from '@/lib/schema'
import { eq, and, sql } from 'drizzle-orm'

const checkNameSchema = z.object({
  eventId: z.string().min(1),
  name: z.string().min(1).max(50).trim(),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = checkNameSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { eventId, name } = parsed.data

  // Verify event exists
  const event = await db.query.events.findFirst({ where: eq(events.id, eventId) })
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // Case-insensitive uniqueness check — IDEN-03 requires this.
  // MUST use lower() SQL function, NOT eq(participants.name, name), which is case-sensitive.
  const existing = await db.query.participants.findFirst({
    where: and(
      eq(participants.eventId, eventId),
      sql`lower(${participants.name}) = ${name.toLowerCase()}`
    ),
  })

  if (existing) {
    // Name is taken — return 200 with status:'exists' so NameSheet routes to PIN verify.
    // Do NOT return 409: a taken name is not an error, it means a returning user.
    return NextResponse.json({ status: 'exists' }, { status: 200 })
  }

  // Name is available — no DB write
  return NextResponse.json({ status: 'available' }, { status: 200 })
}
