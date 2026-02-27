import { CreateEventForm } from '@/components/create-event-form'
import { DashboardContainer } from '@/components/layout/dashboard-container'
import { Panel, PanelTitle } from '@/components/layout/panel'
import { CalendarPlus } from 'lucide-react'

export default function HomePage() {
  return (
    <main className="py-8 md:py-12">
      <DashboardContainer className="max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-text-primary mb-3">
            Find a time that works
          </h1>
          <p className="text-text-secondary text-lg max-w-md mx-auto">
            Share a link, mark your times, see the overlap. No account required.
          </p>
        </div>

        <Panel>
          <PanelTitle icon={<CalendarPlus className="w-5 h-5" />} className="mb-4">
            Create a new event
          </PanelTitle>
          <CreateEventForm />
        </Panel>
      </DashboardContainer>
    </main>
  )
}
