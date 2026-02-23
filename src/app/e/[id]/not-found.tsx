import Link from 'next/link'

export default function EventNotFound() {
  return (
    <main className="min-h-dvh px-4 py-20 flex items-center justify-center">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-text-primary">
            This event isn&apos;t available
          </h1>
          <p className="text-text-secondary leading-relaxed">
            It may have expired — events last 30 days — or the link might be incorrect.
          </p>
        </div>
        <Link
          href="/"
          className="inline-block bg-brand hover:bg-brand-hover text-white font-medium py-3 px-6 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          Create a new event
        </Link>
      </div>
    </main>
  )
}
