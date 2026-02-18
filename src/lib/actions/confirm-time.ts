'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { events } from '@/lib/schema'
import { eq } from 'drizzle-orm'

export async function confirmTime(
  eventId: string,
  slotStart: string
): Promise<{ success: boolean; error?: string }> {
  const cookieStore = await cookies()
  const creatorToken = cookieStore.get(`timely_creator_${eventId}`)?.value

  if (!creatorToken) return { success: false, error: 'Unauthorized' }

  const event = await db.query.events.findFirst({ where: eq(events.id, eventId) })
  if (!event) return { success: false, error: 'Event not found' }
  if (!event.creatorToken || event.creatorToken !== creatorToken) {
    return { success: false, error: 'Forbidden' }
  }

  await db
    .update(events)
    .set({
      confirmedSlot: new Date(slotStart),
      status: 'confirmed',
    })
    .where(eq(events.id, eventId))

  revalidatePath(`/e/${eventId}`)
  return { success: true }
}
