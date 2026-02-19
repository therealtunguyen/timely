import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { events } from '@/lib/schema'
import { lt } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  // Verify request originates from Vercel Cron (or local test with correct secret)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // Delete all expired events.
  // CASCADE DELETE on all FK constraints (eventDates, participants, availability,
  // sessions, magicTokens) eliminates all child rows automatically — no batch loops needed.
  const deleted = await db
    .delete(events)
    .where(lt(events.expiresAt, new Date()))
    .returning({ id: events.id })

  return NextResponse.json({
    deleted: deleted.length,
    ids: deleted.map((r) => r.id),
  })
}
