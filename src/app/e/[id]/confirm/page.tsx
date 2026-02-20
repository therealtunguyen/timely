import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { events } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { CopyLinkButton } from '@/components/copy-link-button'

type Props = { params: Promise<{ id: string }> }

export const metadata: Metadata = { title: 'Event created' }

export default async function ConfirmPage({ params }: Props) {
  const { id } = await params  // Next.js 15+ — params is a Promise
  const event = await db.query.events.findFirst({ where: eq(events.id, id) })
  if (!event) notFound()

  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const eventUrl = `${protocol}://${host}/e/${id}`

  return (
    <main className="min-h-dvh flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Success indicator */}
        <div className="text-center space-y-2">
          <div className="text-4xl">🎉</div>
          <h1 className="text-2xl font-semibold text-[#1C1A17]">Event created!</h1>
          <p className="text-[#6B6158]">Share this link so people can mark their availability.</p>
        </div>

        {/* Event summary */}
        <div className="rounded-xl border border-[#E5DDD4] bg-white p-5 space-y-1">
          <p className="font-medium text-[#1C1A17]">{event.title}</p>
          {event.description && (
            <p className="text-sm text-[#6B6158]">{event.description}</p>
          )}
        </div>

        {/* Copyable link */}
        <div className="space-y-3">
          <div className="rounded-lg border border-[#E5DDD4] bg-[#F3EFE9] px-4 py-3 font-mono text-sm text-[#1C1A17] break-all">
            {eventUrl}
          </div>
          <CopyLinkButton url={eventUrl} />
        </div>

        {/* View event link */}
        <div className="text-center">
          <a
            href={`/e/${id}`}
            className="text-sm text-[#E8823A] hover:text-[#D4722E] underline underline-offset-2"
          >
            View event page &rarr;
          </a>
        </div>
      </div>
    </main>
  )
}
