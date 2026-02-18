import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { events, eventDates } from '@/lib/schema'
import { createEventSchema } from '@/lib/validations'
import { eventCreationRatelimit } from '@/lib/rate-limit'
import { generateId } from '@/lib/id'
import { addDays } from 'date-fns'

export async function POST(req: NextRequest) {
  // 1. Extract IP for rate limiting
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'anonymous'

  // 2. Check rate limit before doing any work
  const { success, limit, remaining, reset } = await eventCreationRatelimit.limit(ip)

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before creating another event.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(reset),
          'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
        },
      }
    )
  }

  // 3. Parse and validate the request body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = createEventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const {
    title,
    description,
    dateMode,
    specificDates,
    rangeStart,
    rangeEnd,
    dayStart,
    dayEnd,
    timezone,
  } = parsed.data

  // 4. Generate ID, creator token, and compute expiry (30 days after last candidate date, approximated at creation)
  const id = generateId()
  const creatorToken = generateId()
  const expiresAt = addDays(new Date(), 37)  // 30-day window + 7-day buffer

  // 5. Insert event row
  await db.insert(events).values({
    id,
    title,
    description: description ?? null,
    dateMode,
    rangeStart: rangeStart ? new Date(rangeStart) : null,
    rangeEnd: rangeEnd ? new Date(rangeEnd) : null,
    dayStart,
    dayEnd,
    timezone,
    creatorToken,
    expiresAt,
  })

  // 6. Insert specific date rows (if dateMode = 'specific_dates')
  if (dateMode === 'specific_dates' && specificDates) {
    const dates = JSON.parse(specificDates) as string[]
    if (dates.length > 0) {
      await db.insert(eventDates).values(
        dates.map((date, i) => ({
          id: generateId(),
          eventId: id,
          date,
          sortOrder: i,
        }))
      )
    }
  }

  // 7. Return the new event ID — client will redirect to /e/[id]/confirm
  //    Set an httpOnly creator cookie so Phase 4 can identify the event creator
  const response = NextResponse.json({ id }, { status: 201 })
  response.cookies.set(`timely_creator_${id}`, creatorToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 37,  // 37 days — matches event expiry
  })
  return response
}
