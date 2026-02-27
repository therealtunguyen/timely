import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getEventDashboardData } from '@/lib/event-data'
import { DeleteEventButton } from '@/components/delete-event-button'
import { DashboardContainer } from '@/components/layout/dashboard-container'
import { Panel, PanelTitle } from '@/components/layout/panel'
import { ArrowLeft, Settings, Trash2, AlertTriangle } from 'lucide-react'

type Props = { params: Promise<{ id: string }> }

export default async function ManagePage({ params }: Props) {
  const { id } = await params
  const cookieStore = await cookies()
  const creatorCookieValue = cookieStore.get(`timely_creator_${id}`)?.value

  const data = await getEventDashboardData(id, creatorCookieValue)

  // Event doesn't exist or expired — redirect to home
  if (!data) redirect('/')

  const { event, isCreator } = data

  if (!isCreator) {
    // Soft "no access" — NOT notFound(). Creator lost their cookie.
    return (
      <main className="py-8 md:py-12">
        <DashboardContainer className="max-w-2xl">
          <div className="mb-6">
            <Link
              href={`/e/${id}`}
              className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to event
            </Link>
          </div>

          <Panel>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h1 className="text-lg font-heading font-semibold text-text-primary">
                  Manage access isn&apos;t available
                </h1>
                <p className="text-text-secondary text-sm leading-relaxed">
                  This browser doesn&apos;t have creator access for this event. If you&apos;ve cleared
                  your cookies or switched devices, your manage access is gone for this event.
                </p>
                <p className="text-text-secondary text-sm leading-relaxed">
                  Events expire automatically in 30 days — no action required.
                </p>
              </div>
            </div>
          </Panel>
        </DashboardContainer>
      </main>
    )
  }

  return (
    <main className="py-8 md:py-12">
      <DashboardContainer className="max-w-2xl">
        <div className="mb-6">
          <Link
            href={`/e/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to event
          </Link>
        </div>

        <div className="space-y-5">
          {/* Header */}
          <Panel>
            <PanelTitle icon={<Settings className="w-5 h-5" />}>
              Manage event
            </PanelTitle>
            <p className="text-text-secondary mt-1">{event.title}</p>
          </Panel>

          {/* Delete section */}
          <Panel className="border-red-200 bg-red-50/50">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-red-100 text-red-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-3">
                <div className="space-y-1">
                  <p className="text-text-primary font-semibold">Delete this event</p>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    Permanently removes the event and all responses. This cannot be undone.
                  </p>
                </div>
                <DeleteEventButton eventId={id} />
              </div>
            </div>
          </Panel>

          {/* Cookie loss disclaimer */}
          <p className="text-xs text-text-disabled leading-relaxed text-center">
            This page is only accessible from the browser where you created the event.
            If you lose access, the event will still expire automatically in 30 days.
          </p>
        </div>
      </DashboardContainer>
    </main>
  )
}
