import Link from 'next/link'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}

const ERROR_STATES = {
  expired: {
    heading: 'This link has expired',
    body: 'Magic links are valid for 30 minutes. This one has passed its limit.',
    cta: 'Request a new link',
  },
  used: {
    heading: 'This link has already been used',
    body: 'Magic links are single-use. This one was already used to sign in.',
    cta: 'Request a new link',
  },
  invalid: {
    heading: 'This link is not valid',
    body: 'The link may be incomplete or corrupted. Try copying it again from your email.',
    cta: 'Request a new link',
  },
} as const

export default async function MagicLinkErrorPage({ params, searchParams }: Props) {
  const { id } = await params
  const { error } = await searchParams

  const errorKey = (error as keyof typeof ERROR_STATES) ?? 'invalid'
  const state = ERROR_STATES[errorKey] ?? ERROR_STATES.invalid

  return (
    <main className="min-h-dvh px-4 py-10">
      <div className="max-w-lg mx-auto space-y-6 text-center">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-text-primary">
            {state.heading}
          </h1>
          <p className="text-text-secondary leading-relaxed">
            {state.body}
          </p>
        </div>

        {/* CTA to go back and request a new magic link */}
        <Link
          href={`/e/${id}`}
          className="block w-full text-center bg-brand hover:bg-brand-hover text-white font-medium py-3 px-6 rounded-lg transition-colors"
        >
          {state.cta}
        </Link>

        <p className="text-sm text-text-disabled">
          You&apos;ll be taken back to the event page where you can request a new link.
        </p>
      </div>
    </main>
  )
}
