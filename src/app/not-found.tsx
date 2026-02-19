import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-dvh px-4 py-20 flex items-center justify-center">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-[#1C1A17]">Page not found</h1>
          <p className="text-[#6B6158] leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist.
          </p>
        </div>
        <Link
          href="/"
          className="inline-block bg-[#E8823A] hover:bg-[#D4722E] text-white font-medium py-3 px-6 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8823A] focus-visible:ring-offset-2"
        >
          Go home
        </Link>
      </div>
    </main>
  )
}
