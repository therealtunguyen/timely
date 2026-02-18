import { CreateEventForm } from '@/components/create-event-form'

export default function HomePage() {
  return (
    <main className="min-h-dvh px-4 py-12">
      <div className="max-w-md mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-semibold text-[#1C1A17]">Timely</h1>
          <p className="text-[#6B6158]">
            Find a time that works for everyone. Share a link, mark your times, see the overlap.
          </p>
        </div>
        <CreateEventForm />
      </div>
    </main>
  )
}
