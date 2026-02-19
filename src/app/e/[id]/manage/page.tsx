import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { events } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { DeleteEventButton } from '@/components/delete-event-button'

type Props = { params: Promise<{ id: string }> }

export default async function ManagePage({ params }: Props) {
  const { id } = await params
  const cookieStore = await cookies()
  const creatorToken = cookieStore.get(`timely_creator_${id}`)?.value

  const event = await db.query.events.findFirst({
    where: eq(events.id, id),
    columns: { id: true, title: true, creatorToken: true },
  })

  // Event doesn't exist at all — redirect to home (not 404, since event may have been deleted)
  if (!event) redirect('/')

  const isCreator = !!(event.creatorToken && creatorToken && event.creatorToken === creatorToken)

  if (!isCreator) {
    // Soft "no access" — NOT notFound(). Creator lost their cookie.
    // Per user decision: show a helpful message, not a hard 404.
    return (
      <main className="min-h-dvh px-4 py-12">
        <div className="max-w-md mx-auto space-y-8">
          <div className="space-y-2">
            <Link
              href={`/e/${id}`}
              className="text-sm text-[#A89E94] hover:text-[#6B6158] focus-visible:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[#E8823A]"
            >
              ← Back to event
            </Link>
            <h1 className="text-2xl font-semibold text-[#1C1A17]">Manage event</h1>
          </div>
          <div className="rounded-xl border border-[#E5DDD4] bg-white px-5 py-6 space-y-3">
            <p className="text-[#1C1A17] font-medium">Manage access isn&apos;t available</p>
            <p className="text-[#6B6158] text-sm leading-relaxed">
              This browser doesn&apos;t have creator access for this event. If you&apos;ve cleared
              your cookies or switched devices, your manage access is gone for this event.
            </p>
            <p className="text-[#6B6158] text-sm leading-relaxed">
              Events expire automatically in 30 days — no action required.
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh px-4 py-12">
      <div className="max-w-md mx-auto space-y-8">
        <div className="space-y-2">
          <Link
            href={`/e/${id}`}
            className="text-sm text-[#A89E94] hover:text-[#6B6158] focus-visible:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[#E8823A]"
          >
            ← Back to event
          </Link>
          <h1 className="text-2xl font-semibold text-[#1C1A17]">Manage event</h1>
          <p className="text-[#6B6158]">{event.title}</p>
        </div>

        {/* Delete section */}
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-6 space-y-4">
          <div className="space-y-1">
            <p className="text-[#1C1A17] font-medium">Delete this event</p>
            <p className="text-[#6B6158] text-sm leading-relaxed">
              Permanently removes the event and all responses. This cannot be undone.
            </p>
          </div>
          <DeleteEventButton eventId={id} />
        </div>

        {/* Cookie loss disclaimer — per user decision */}
        <p className="text-xs text-[#A89E94] leading-relaxed">
          This page is only accessible from the browser where you created the event.
          If you lose access, the event will still expire automatically in 30 days.
        </p>
      </div>
    </main>
  )
}
