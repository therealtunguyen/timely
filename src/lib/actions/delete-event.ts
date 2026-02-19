'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { events } from '@/lib/schema'
import { eq } from 'drizzle-orm'

export async function deleteEvent(eventId: string): Promise<void> {
  const cookieStore = await cookies()
  const creatorToken = cookieStore.get(`timely_creator_${eventId}`)?.value

  // Silent redirect if no creator cookie — manage page will have blocked the UI,
  // but this is the defense-in-depth server-side check.
  if (!creatorToken) redirect('/')

  // Verify the token matches the DB record (prevent cookie-stuffing attacks)
  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    columns: { id: true, creatorToken: true },
  })

  if (!event || event.creatorToken !== creatorToken) redirect('/')

  // CASCADE DELETE: all eventDates, participants, availability, sessions, magicTokens
  // are deleted automatically via FK constraints.
  await db.delete(events).where(eq(events.id, eventId))

  // Clear the creator cookie — hygiene, prevents stale cookie lingering
  cookieStore.delete(`timely_creator_${eventId}`)

  // Flash cookie for toast after redirect.
  // httpOnly: false — must be readable by client JS in FlashToast component.
  // Random suffix prevents stale toasts from re-displaying on page refresh.
  const toastId = crypto.randomUUID()
  cookieStore.set(`timely_flash_toast_${toastId}`, encodeURIComponent('Event deleted.'), {
    path: '/',
    maxAge: 60, // 60 seconds — consumed on first client render
    httpOnly: false,
    sameSite: 'lax',
  })

  // redirect() throws a framework exception — must NOT be inside try/catch.
  // All DB work is complete before this line.
  redirect('/')
}
